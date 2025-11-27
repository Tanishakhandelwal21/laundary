from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import pytz
import jwt
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils.email_service import send_otp_email, send_welcome_email, send_email, send_order_status_email
from utils.sms_service import send_sms_otp, send_welcome_sms, send_sms
from utils.otp_service import generate_otp, is_otp_expired
import socketio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
# Default business pickup address (used as fallback if not set in DB settings)
BUSINESS_PICKUP_ADDRESS = os.environ.get('BUSINESS_PICKUP_ADDRESS', '123 Main Street, Sydney NSW 2000, Australia')

# Timezone settings - Australian Eastern Standard Time
AEST = pytz.timezone('Australia/Sydney')  # Handles both AEST and AEDT automatically

def get_aest_now():
    """Get current datetime in AEST timezone"""
    return datetime.now(AEST)

def utc_to_aest(utc_dt):
    """Convert UTC datetime to AEST"""
    if isinstance(utc_dt, str):
        utc_dt = datetime.fromisoformat(utc_dt.replace('Z', '+00:00'))
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(AEST)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Socket.io Setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='socket.io')

# APScheduler Setup
scheduler = AsyncIOScheduler()

# Utility Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return {"id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

async def get_next_order_number() -> str:
    """Generate next order number using atomic MongoDB counter to prevent duplicates"""
    counter = await db.counters.find_one_and_update(
        {"_id": "order_number"},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=True
    )
    if counter is None:
        # First time initialization
        await db.counters.insert_one({"_id": "order_number", "sequence_value": 1})
        return "ORD-000001"
    return f"ORD-{counter['sequence_value']:06d}"

async def check_and_lock_order(order: dict) -> dict:
    """
    Check if order should be automatically locked.
    Customer can edit until 11:59 PM the day BEFORE the delivery date.
    For example: If delivery is Nov 24, customer can edit until Nov 23 11:59 PM.
    After midnight on Nov 24, the order is locked.
    Returns the order with updated lock status if needed.
    """
    # Skip if already locked or doesn't have delivery_date
    if order.get('is_locked') or not order.get('delivery_date'):
        return order
    
    # Skip if order is already delivered or cancelled
    if order.get('status') in ['delivered', 'cancelled']:
        return order
    
    try:
        # Parse delivery date (should be in format YYYY-MM-DD)
        delivery_date_str = order['delivery_date']
        # Handle both date-only and datetime formats
        if 'T' in delivery_date_str:
            delivery_date = datetime.fromisoformat(delivery_date_str).date()
        else:
            delivery_date = datetime.fromisoformat(delivery_date_str).date()
        
        # Calculate lock time: 11:59:59 PM the day BEFORE delivery
        day_before_delivery = delivery_date - timedelta(days=1)
        lock_datetime = datetime.combine(day_before_delivery, datetime.max.time())
        
        # Make timezone-aware
        if lock_datetime.tzinfo is None:
            lock_datetime = lock_datetime.replace(tzinfo=timezone.utc)
        
        # Check if current time is past the lock time (after 11:59 PM day before delivery)
        now = datetime.now(timezone.utc)
        
        if now >= lock_datetime:
            # Lock the order
            order['is_locked'] = True
            order['locked_at'] = now.isoformat()
            
            # Update in database
            await db.orders.update_one(
                {"id": order['id']},
                {"$set": {"is_locked": True, "locked_at": now.isoformat()}}
            )
            
            logging.info(f"Order {order['id']} automatically locked at {now} (delivery date: {delivery_date})")
    except Exception as e:
        logging.error(f"Error checking lock status for order {order['id']}: {str(e)}")
    
    return order

async def roll_forward_recurring_order(order: dict, notes: Optional[str] = None):
    """Update the same recurring order to the next occurrence and record a delivery history entry.
    This avoids creating a new order per occurrence, making the list always show the next delivery.
    """
    if not order.get('is_recurring'):
        return None

    # Frequency data
    frequency_data = None
    if order.get('frequency_template_id'):
        template = await db.frequency_templates.find_one({"id": order['frequency_template_id']})
        if template:
            frequency_data = {
                'frequency_type': template['frequency_type'],
                'frequency_value': template['frequency_value']
            }
    elif order.get('recurrence_pattern'):
        frequency_data = order['recurrence_pattern']

    if not frequency_data:
        logging.warning(f"No frequency data found for recurring order {order['id']}")
        return None

    # Parse current delivery date tolerant of 'Z'
    try:
        current_delivery_dt = datetime.fromisoformat(str(order['delivery_date']).replace('Z', '+00:00'))
    except Exception as e:
        logging.error(f"Failed to parse delivery_date for roll-forward {order.get('id')}: {order.get('delivery_date')} - {e}")
        return None
    current_delivery_date = current_delivery_dt.date()

    frequency_type = frequency_data.get('frequency_type')
    frequency_value = frequency_data.get('frequency_value', 1)

    if frequency_type == 'daily':
        next_delivery_date = current_delivery_date + timedelta(days=frequency_value)
    elif frequency_type == 'weekly':
        next_delivery_date = current_delivery_date + timedelta(weeks=frequency_value)
    elif frequency_type == 'monthly':
        next_delivery_date = current_delivery_date + timedelta(days=30 * frequency_value)
    else:
        next_delivery_date = current_delivery_date + timedelta(days=1)

    # Next-next occurrence for preview
    if frequency_type == 'daily':
        next_next_date = next_delivery_date + timedelta(days=frequency_value)
    elif frequency_type == 'weekly':
        next_next_date = next_delivery_date + timedelta(weeks=frequency_value)
    elif frequency_type == 'monthly':
        next_next_date = next_delivery_date + timedelta(days=30 * frequency_value)
    else:
        next_next_date = next_delivery_date + timedelta(days=1)

    now_iso = datetime.now(timezone.utc).isoformat()
    history_entry = {
        'occurrence_delivery_date': current_delivery_date.isoformat(),
        'delivered_at': now_iso,
        'driver_id': order.get('driver_id'),
        'notes': notes or ''
    }

    await db.orders.update_one(
        {"id": order['id']},
        {
            "$push": {"deliveries_history": history_entry},
            "$set": {
                "delivery_date": next_delivery_date.isoformat(),
                "next_occurrence_date": next_next_date.isoformat(),
                # Keep status as delivered, don't reset to scheduled
                # "status": "scheduled",  # Commented out - keep current delivered status
                "delivery_status": "assigned",
                "picked_up_at": None,
                "delivered_at": None,
                "updated_at": now_iso
            }
        }
    )
    return True

async def auto_create_next_recurring_order(order: dict):
    """Auto-create the next occurrence of a recurring order.
    Be tolerant of ISO strings ending with 'Z' and other variants to avoid crashes.
    """
    if not order.get('is_recurring'):
        return None
    
    # Get frequency template if using one
    frequency_data = None
    if order.get('frequency_template_id'):
        template = await db.frequency_templates.find_one({"id": order['frequency_template_id']})
        if template:
            frequency_data = {
                'frequency_type': template['frequency_type'],
                'frequency_value': template['frequency_value']
            }
    elif order.get('recurrence_pattern'):
        frequency_data = order['recurrence_pattern']
    
    if not frequency_data:
        logging.warning(f"No frequency data found for recurring order {order['id']}")
        return None
    
    # Calculate next delivery date (be tolerant of 'Z' suffix)
    try:
        current_delivery_dt = datetime.fromisoformat(str(order['delivery_date']).replace('Z', '+00:00'))
    except Exception as e:
        logging.error(f"Failed to parse delivery_date for recurring order {order.get('id')}: {order.get('delivery_date')} - {e}")
        return None
    current_delivery_date = current_delivery_dt.date()
    frequency_type = frequency_data['frequency_type']
    frequency_value = frequency_data.get('frequency_value', 1)
    
    if frequency_type == 'daily':
        next_delivery_date = current_delivery_date + timedelta(days=frequency_value)
    elif frequency_type == 'weekly':
        next_delivery_date = current_delivery_date + timedelta(weeks=frequency_value)
    elif frequency_type == 'monthly':
        next_delivery_date = current_delivery_date + timedelta(days=30 * frequency_value)
    else:
        next_delivery_date = current_delivery_date + timedelta(days=1)
    
    # Calculate next pickup date (2 days before delivery by default)
    next_pickup_date = next_delivery_date - timedelta(days=2)
    
    # Generate unique order number atomically
    order_number = await get_next_order_number()
    
    # Create new order
    new_order = {
        'id': str(uuid.uuid4()),
        'order_number': order_number,
        'customer_id': order['customer_id'],
        'customer_name': order['customer_name'],
        'customer_email': order['customer_email'],
        'items': order['items'],
        'pickup_date': next_pickup_date.isoformat(),
        'delivery_date': next_delivery_date.isoformat(),
        'pickup_address': order['pickup_address'],
        'delivery_address': order['delivery_address'],
        'special_instructions': order.get('special_instructions', ''),
        'total_amount': order['total_amount'],
        'status': 'scheduled',  # Set to scheduled for next recurring order
        'is_recurring': True,
        'frequency_template_id': order.get('frequency_template_id'),
        'recurrence_pattern': order.get('recurrence_pattern'),
        'parent_order_id': order['id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'is_locked': False,
        'created_by': order.get('created_by')  # Preserve creator
    }

    # Carry forward driver assignment so drivers see the next occurrence immediately
    driver_id = order.get('driver_id')
    if driver_id:
        new_order['driver_id'] = driver_id
        new_order['delivery_status'] = 'assigned'
        try:
            driver_doc = await db.users.find_one({"id": driver_id})
            if driver_doc:
                new_order['driver_name'] = driver_doc.get('full_name')
        except Exception:
            pass
    
    # Calculate next_occurrence_date for the new order
    if frequency_type == 'daily':
        next_next_date = next_delivery_date + timedelta(days=frequency_value)
    elif frequency_type == 'weekly':
        next_next_date = next_delivery_date + timedelta(weeks=frequency_value)
    elif frequency_type == 'monthly':
        next_next_date = next_delivery_date + timedelta(days=30 * frequency_value)
    else:
        next_next_date = next_delivery_date + timedelta(days=1)
    
    new_order['next_occurrence_date'] = next_next_date.isoformat()
    
    # Insert new order
    await db.orders.insert_one(new_order)
    
    # Update the parent order's next_occurrence_date to match the newly created order's delivery date
    await db.orders.update_one(
        {"id": order['id']},
        {"$set": {
            "next_occurrence_date": next_delivery_date.isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logging.info(f"Auto-created next recurring order {new_order['order_number']} for customer {order['customer_id']}, parent order next_occurrence_date updated to {next_delivery_date.isoformat()}")
    
    # Send notification to customer
    customer = await db.users.find_one({"id": order['customer_id']})
    if customer:
        await create_notification(
            order['customer_id'],
            "Next Recurring Order in Processing",
            f"Your next recurring order {new_order['order_number']} has been automatically created and is now in processing. Scheduled for delivery on {next_delivery_date.strftime('%Y-%m-%d')}",
            "order"
        )
        
        # Send email notification with full details
        # Use stored pricing values from the order
        base_price = new_order.get('total_amount', 0)
        gst = new_order.get('gst_amount', base_price * 0.10)
        final_total = new_order.get('total_with_gst', base_price + gst)
        
        # Build items list HTML
        items_html = ""
        for item in new_order.get('items', []):
            item_total = item.get('price', 0) * item.get('quantity', 0)
            items_html += f"""
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">{item.get('sku_name', 'Item')}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">{item.get('quantity', 0)}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${item.get('price', 0):.2f}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${item_total:.2f}</td>
                    </tr>
            """
        
        send_email(
            to_email=customer['email'],
            subject=f"New Recurring Order Created - {new_order['order_number']}",
            html_content=f"""
            <html>
            <body>
                <h2>🔄 Next Recurring Order Created</h2>
                <p>Dear {customer.get('full_name', 'Customer')},</p>
                <p>Your next recurring order has been automatically created and is now scheduled:</p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #40E0D0; padding: 15px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">Order #{new_order['order_number']}</h3>
                    <p style="margin: 5px 0;"><strong>📅 Pickup Date:</strong> {next_pickup_date.strftime('%B %d, %Y')}</p>
                    <p style="margin: 5px 0;"><strong>🚚 Delivery Date:</strong> {next_delivery_date.strftime('%B %d, %Y')}</p>
                </div>
                
                <h3>Customer Information</h3>
                <table style="width: 100%; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Name:</td>
                        <td style="padding: 5px 0; font-weight: bold;">{customer.get('full_name', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Email:</td>
                        <td style="padding: 5px 0;">{customer.get('email', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Phone:</td>
                        <td style="padding: 5px 0;">{customer.get('phone', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666; vertical-align: top;">Pickup Address:</td>
                        <td style="padding: 5px 0;">{new_order.get('pickup_address', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666; vertical-align: top;">Delivery Address:</td>
                        <td style="padding: 5px 0;">{new_order.get('delivery_address', 'N/A')}</td>
                    </tr>
                </table>
                
                <h3>Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
{items_html}
                    </tbody>
                </table>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span style="color: #666;">Base Price:</span>
                        <span style="font-weight: 500;">${base_price:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span style="color: #666;">GST (10%):</span>
                        <span style="font-weight: 500;">${gst:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #e0e0e0; margin-top: 6px;">
                        <strong style="font-size: 16px;">Total (Inc. GST):</strong>
                        <strong style="color: #40E0D0; font-size: 18px;">${final_total:.2f}</strong>
                    </div>
                </div>
                
                <p>You can view and manage your order in your dashboard.</p>
                <p><em>This is your recurring order - it will continue automatically based on your schedule.</em></p>
            </body>
            </html>
            """
        )
        
        # Send SMS notification
        if customer.get('phone'):
            send_sms(
                phone_number=customer['phone'],
                message_body=f"""Infinite Laundry Solutions

Your next recurring order {new_order['order_number']} has been automatically created!

Pickup: {next_pickup_date.strftime('%Y-%m-%d')}
Delivery: {next_delivery_date.strftime('%Y-%m-%d')}
Base: ${base_price:.2f} + GST: ${gst:.2f} = Total: ${final_total:.2f}

View details in your dashboard."""
            )
    
    return new_order

async def create_recurring_orders_for_6_months(parent_order_dict: dict):
    """
    Create 6 months worth of recurring orders upfront when a recurring order is created.
    Each order will have a sequential order number and proper scheduling.
    """
    if not parent_order_dict.get('is_recurring') or not parent_order_dict.get('recurrence_pattern'):
        return []
    
    created_orders = []
    frequency_data = parent_order_dict['recurrence_pattern']
    frequency_type = frequency_data['frequency_type']
    frequency_value = frequency_data.get('frequency_value', 1)
    
    # Parse the first delivery date
    try:
        current_delivery_dt = datetime.fromisoformat(str(parent_order_dict['delivery_date']).replace('Z', '+00:00'))
        current_delivery_date = current_delivery_dt.date()
    except Exception as e:
        logging.error(f"Failed to parse delivery_date for recurring orders: {parent_order_dict.get('delivery_date')} - {e}")
        return []
    
    # Calculate 6 months from first delivery
    six_months_later = current_delivery_date + timedelta(days=180)
    
    # Generate orders for next 6 months
    iteration = 0
    max_iterations = 200  # Safety limit
    
    while current_delivery_date < six_months_later and iteration < max_iterations:
        # Calculate next delivery date
        if frequency_type == 'daily':
            current_delivery_date = current_delivery_date + timedelta(days=frequency_value)
        elif frequency_type == 'weekly':
            current_delivery_date = current_delivery_date + timedelta(weeks=frequency_value)
        elif frequency_type == 'monthly':
            current_delivery_date = current_delivery_date + timedelta(days=30 * frequency_value)
        else:
            break
        
        # Don't create if beyond 6 months
        if current_delivery_date >= six_months_later:
            break
        
        # Calculate pickup date (2 days before delivery)
        current_pickup_date = current_delivery_date - timedelta(days=2)
        
        # Generate unique order number atomically
        order_number = await get_next_order_number()
        
        # Create new order
        new_order = {
            'id': str(uuid.uuid4()),
            'order_number': order_number,
            'customer_id': parent_order_dict['customer_id'],
            'customer_name': parent_order_dict['customer_name'],
            'customer_email': parent_order_dict['customer_email'],
            'items': parent_order_dict['items'],
            'pickup_date': current_pickup_date.isoformat(),
            'delivery_date': current_delivery_date.isoformat(),
            'pickup_address': parent_order_dict['pickup_address'],
            'delivery_address': parent_order_dict['delivery_address'],
            'special_instructions': parent_order_dict.get('special_instructions', ''),
            'total_amount': parent_order_dict['total_amount'],
            'status': 'scheduled',
            'is_recurring': False,  # These are instances, not the template
            'parent_recurring_id': parent_order_dict['id'],  # Link to parent recurring order
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'is_locked': False,
            'created_by': parent_order_dict.get('created_by')
        }
        
        # Carry forward driver assignment if exists
        driver_id = parent_order_dict.get('driver_id')
        if driver_id:
            new_order['driver_id'] = driver_id
            new_order['delivery_status'] = 'assigned'
            try:
                driver_doc = await db.users.find_one({"id": driver_id})
                if driver_doc:
                    new_order['driver_name'] = driver_doc.get('full_name')
            except Exception:
                pass
        
        # Insert order
        await db.orders.insert_one(new_order)
        created_orders.append(new_order)
        
        logging.info(f"Created recurring instance {order_number} for delivery on {current_delivery_date}")
        
        iteration += 1
    
    logging.info(f"Created {len(created_orders)} recurring order instances for 6 months")
    return created_orders

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "customer"
    phone: Optional[str] = None
    address: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None  # Only customer<->driver allowed via this endpoint

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class SelfPasswordChange(BaseModel):
    current_password: str
    new_password: str

class SKUBase(BaseModel):
    name: str
    category: str
    price: float
    unit: str
    description: Optional[str] = None

class SKU(SKUBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerPricingBase(BaseModel):
    customer_id: str
    sku_id: str
    custom_price: float

class CustomerPricing(CustomerPricingBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FrequencyTemplateBase(BaseModel):
    name: str
    frequency_type: str  # daily, weekly, monthly, custom
    frequency_value: int  # e.g., every 2 days, every 3 weeks
    description: Optional[str] = None

class FrequencyTemplate(FrequencyTemplateBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItemBase(BaseModel):
    sku_id: str
    sku_name: str
    quantity: int
    price: float

class OrderBase(BaseModel):
    customer_id: str
    customer_name: str
    customer_email: str
    items: List[OrderItemBase]
    pickup_date: Optional[str] = None
    delivery_date: str
    pickup_address: str
    delivery_address: str
    special_instructions: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[dict] = None
    next_occurrence_date: Optional[str] = None

class CustomerOrderCreate(BaseModel):
    """Model for customers creating their own orders (no customer info needed)"""
    items: List[OrderItemBase]
    pickup_date: Optional[str] = None
    delivery_date: str
    pickup_address: str
    delivery_address: str
    special_instructions: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[dict] = None

class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    status: str = "pending"
    total_amount: float  # Base amount (ex-GST)
    gst_amount: float = 0.0  # GST amount (10% of total_amount)
    total_with_gst: float = 0.0  # Total including GST
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    delivery_status: Optional[str] = None  # "assigned", "picked_up", "out_for_delivery", "delivered"
    assigned_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_notes: Optional[str] = None
    pending_modifications: Optional[dict] = None  # Stores proposed changes awaiting customer approval
    modification_status: Optional[str] = None  # "pending_approval", "approved", "rejected"
    modified_by: Optional[str] = None  # ID of user who proposed the modification
    modification_requested_at: Optional[datetime] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    pickup_date: Optional[str] = None
    delivery_date: Optional[str] = None
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    recurrence_pattern: Optional[dict] = None

class RecurringOrderEditRequest(BaseModel):
    """Model for customer's edit request on recurring order"""
    pickup_date: Optional[str] = None
    delivery_date: Optional[str] = None
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    recurrence_pattern: Optional[dict] = None
    reason: Optional[str] = None  # Customer's reason for the change

class RecurringOrderEditApproval(BaseModel):
    """Model for admin/owner approval or modification of edit request"""
    action: str  # "approve", "reject", "modify"
    pickup_date: Optional[str] = None
    delivery_date: Optional[str] = None
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    recurrence_pattern: Optional[dict] = None
    rejection_reason: Optional[str] = None  # Reason for rejection
    admin_notes: Optional[str] = None  # Notes from admin/owner

class DeliveryBase(BaseModel):
    order_id: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    route_details: Optional[str] = None

class Delivery(DeliveryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CaseRequestBase(BaseModel):
    customer_id: str
    customer_name: str
    customer_email: str
    type: str
    subject: str
    description: str
    order_id: Optional[str] = None
    priority: str = "medium"

class CaseRequest(CaseRequestBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_number: str
    status: str = "open"
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    priority: Optional[str] = None

class NotificationBase(BaseModel):
    user_id: str
    title: str
    message: str
    type: str

class Notification(NotificationBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    phone: str
    message: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class ResendOTP(BaseModel):
    email: EmailStr

class BusinessPickupAddressUpdate(BaseModel):
    business_pickup_address: str

# Helper function to create notifications
async def create_notification(user_id: str, title: str, message: str, notif_type: str):
    notif = Notification(user_id=user_id, title=title, message=message, type=notif_type)
    doc = notif.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)
    return notif

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user: UserCreate, current_user: dict = Depends(require_role(["owner", "admin"]))):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user.model_dump()
    hashed_password = hash_password(user_dict.pop("password"))
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/signup")
async def public_signup(user: UserCreate):
    """
    Public signup endpoint - creates unverified user and sends OTP
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if pending verification exists
    pending = await db.pending_users.find_one({"email": user.email})
    if pending:
        # Delete old pending user
        await db.pending_users.delete_one({"email": user.email})
    
    # Generate OTP
    otp = generate_otp()
    
    # Create pending user
    user_dict = user.model_dump()
    hashed_password = hash_password(user_dict.pop("password"))
    
    pending_user = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hashed_password,
        "full_name": user.full_name,
        "role": "customer",  # Default role for public signup
        "phone": user.phone,
        "address": user.address,
        "otp": otp,
        "otp_created_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": False
    }
    
    await db.pending_users.insert_one(pending_user)
    
    # Send OTP via both email and SMS
    send_otp_email(user.email, otp, user.full_name)
    sms_sent = False
    if user.phone:
        sms_sent = send_sms_otp(user.phone, otp, user.full_name)
    
    return {
        "message": "OTP sent to your email" + (" and phone" if sms_sent and user.phone else "") + ". Please verify to complete registration.",
        "email": user.email,
        "phone": user.phone if user.phone else None
    }

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    """
    Verify OTP and activate user account
    """
    # Find pending user
    pending_user = await db.pending_users.find_one({"email": data.email})
    
    if not pending_user:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")
    
    # Check OTP
    if pending_user['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Check OTP expiry
    if is_otp_expired(pending_user['otp_created_at']):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Create actual user
    user_data = {
        "id": pending_user['id'],
        "email": pending_user['email'],
        "password": pending_user['password'],
        "full_name": pending_user['full_name'],
        "role": pending_user['role'],
        "phone": pending_user.get('phone'),
        "address": pending_user.get('address'),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_data)
    
    # Delete pending user
    await db.pending_users.delete_one({"email": data.email})
    
    # Send welcome messages
    send_welcome_email(data.email, pending_user['full_name'])
    if pending_user.get('phone'):
        send_welcome_sms(pending_user['phone'], pending_user['full_name'])
    
    return {
        "message": "Email verified successfully! You can now log in.",
        "email": data.email
    }

@api_router.post("/auth/resend-otp")
async def resend_otp(data: ResendOTP):
    """
    Resend OTP to user
    """
    pending_user = await db.pending_users.find_one({"email": data.email})
    
    if not pending_user:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")
    
    # Generate new OTP
    new_otp = generate_otp()
    
    # Update pending user
    await db.pending_users.update_one(
        {"email": data.email},
        {
            "$set": {
                "otp": new_otp,
                "otp_created_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Send new OTP
    send_otp_email(data.email, new_otp, pending_user['full_name'])
    
    return {"message": "New OTP sent to your email"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ResendOTP):
    """
    Request password reset - sends OTP to user's email
    """
    # Check if user exists
    user = await db.users.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store reset request
    reset_request = {
        "email": data.email,
        "otp": otp,
        "otp_created_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Delete any existing reset requests for this email
    await db.password_reset_requests.delete_many({"email": data.email})
    
    # Insert new reset request
    await db.password_reset_requests.insert_one(reset_request)
    
    # Send OTP via email
    send_otp_email(data.email, otp, user['full_name'])
    
    return {
        "message": "Password reset code sent to your email",
        "email": data.email
    }

@api_router.post("/auth/verify-reset-otp")
async def verify_reset_otp(data: OTPVerify):
    """
    Verify OTP for password reset
    """
    # Find reset request
    reset_request = await db.password_reset_requests.find_one({"email": data.email})
    
    if not reset_request:
        raise HTTPException(status_code=404, detail="No password reset request found for this email")
    
    # Check OTP
    if reset_request['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    # Check OTP expiry
    if is_otp_expired(reset_request['otp_created_at']):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
    
    return {
        "message": "Reset code verified. You can now set a new password.",
        "email": data.email
    }

class PasswordReset(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordReset):
    """
    Reset password with verified OTP
    """
    # Find and verify reset request
    reset_request = await db.password_reset_requests.find_one({"email": data.email})
    
    if not reset_request:
        raise HTTPException(status_code=404, detail="No password reset request found")
    
    # Verify OTP
    if reset_request['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    # Check OTP expiry
    if is_otp_expired(reset_request['otp_created_at']):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
    
    # Update password
    hashed_password = hash_password(data.new_password)
    result = await db.users.update_one(
        {"email": data.email},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete the reset request
    await db.password_reset_requests.delete_one({"email": data.email})
    
    return {"message": "Password reset successfully. You can now log in with your new password."}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user_doc.get('is_active', True):
        raise HTTPException(status_code=403, detail="Your account has been disabled. Please contact support.")
    
    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    user_obj = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    token = create_access_token(data={"sub": user_obj.id, "role": user_obj.role})
    return TokenResponse(access_token=token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    return User(**user_doc)

@api_router.put("/auth/me", response_model=User)
async def update_me(updates: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Profile detail editing is disabled for customers and drivers; use admin to update details."""
    if current_user.get('role') in {"customer", "driver"}:
        raise HTTPException(status_code=403, detail="Profile details editing is disabled. Please contact admin.")
    # Fallback: for other roles, disallow via this endpoint as well
    raise HTTPException(status_code=403, detail="Not allowed")

@api_router.put("/auth/me/password")
async def change_my_password(data: SelfPasswordChange, current_user: dict = Depends(get_current_user)):
    """Allow drivers and customers to change their own password."""
    if current_user.get('role') not in {"customer", "driver"}:
        raise HTTPException(status_code=403, detail="Only customers and drivers can change password here")

    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    user = await db.users.find_one({"id": current_user['id']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(data.current_password, user.get('password', '')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    hashed_password = hash_password(data.new_password)
    result = await db.users.update_one({"id": user['id']}, {"$set": {"password": hashed_password}})
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to change password")

    return {"message": "Password changed successfully"}

@api_router.get("/config/addresses")
async def get_addresses(current_user: dict = Depends(get_current_user)):
    """Get configured addresses for orders.
    business_pickup_address is fetched from DB settings (fallback to env default).
    """
    try:
        settings_doc = await db.settings.find_one({"key": "business_pickup_address"})
        pickup_addr = settings_doc.get("value") if settings_doc else None
        if not pickup_addr:
            pickup_addr = BUSINESS_PICKUP_ADDRESS
    except Exception:
        pickup_addr = BUSINESS_PICKUP_ADDRESS

    return {
        "business_pickup_address": pickup_addr,
        "customer_delivery_address": current_user.get('address', '')
    }

@api_router.put("/config/addresses/pickup")
async def update_business_pickup_address(
    data: BusinessPickupAddressUpdate,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Update the global business pickup address. Owner/Admin only.
    Persists in DB settings collection with key 'business_pickup_address'.
    """
    addr = (data.business_pickup_address or '').strip()
    if not addr or len(addr) < 5:
        raise HTTPException(status_code=400, detail="Pickup address must be at least 5 characters long")

    # Upsert settings document
    await db.settings.update_one(
        {"key": "business_pickup_address"},
        {"$set": {"key": "business_pickup_address", "value": addr, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"business_pickup_address": addr}

# User Management Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(require_role(["owner", "admin"]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        user['created_at'] = datetime.fromisoformat(user['created_at']) if isinstance(user['created_at'], str) else user['created_at']
    return users

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: dict = Depends(require_role(["owner", "admin"]))):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    return User(**user_doc)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user_details(
    user_id: str,
    updates: UserUpdate,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Allow owner/admin to update user details.
    - Customers and drivers can be edited by owner/admin
    - Admins can be edited by owner only (but role cannot be changed)
    - Owners cannot be edited via this endpoint
    - Email uniqueness enforced
    - Role changes limited to customer<->driver
    - Propagate display name/email to open Orders for consistency
    """
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = target.get("role")
    # Guardrails by target role
    if target_role == "owner":
        raise HTTPException(status_code=403, detail="Owners cannot be edited via this endpoint")
    if target_role == "admin" and current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can edit admin users")

    set_fields: dict = {}

    # Email change with uniqueness check
    if updates.email and updates.email != target.get("email"):
        existing = await db.users.find_one({"email": updates.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        set_fields["email"] = updates.email

    # Basic profile fields
    if updates.full_name is not None:
        set_fields["full_name"] = updates.full_name
    if updates.phone is not None:
        set_fields["phone"] = updates.phone
    if updates.address is not None:
        set_fields["address"] = updates.address

    # Optional role change limited to customer<->driver and only when target is customer/driver
    if updates.role is not None:
        if target_role in {"customer", "driver"}:
            if updates.role not in {"customer", "driver"}:
                raise HTTPException(status_code=400, detail="Role can only be set to 'customer' or 'driver'")
            set_fields["role"] = updates.role
        else:
            # Ignore role updates for admin/owner targets
            pass

    if not set_fields:
        # Nothing to update, return current
        target_return = {k: v for k, v in target.items() if k not in {"_id", "password"}}
        target_return['created_at'] = datetime.fromisoformat(target_return['created_at']) if isinstance(target_return['created_at'], str) else target_return['created_at']
        return User(**target_return)

    set_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.users.update_one({"id": user_id}, {"$set": set_fields})

    # Propagate to active domain documents for consistency
    try:
        if target_role == "customer":
            # Update open orders' customer display fields
            order_update = {}
            if "full_name" in set_fields:
                order_update["customer_name"] = set_fields["full_name"]
            if "email" in set_fields:
                order_update["customer_email"] = set_fields["email"]
            if order_update:
                await db.orders.update_many(
                    {"customer_id": user_id, "status": {"$nin": ["delivered", "cancelled"]}},
                    {"$set": order_update}
                )
        elif target_role == "driver":
            # Update open orders' driver display name
            if "full_name" in set_fields:
                await db.orders.update_many(
                    {"driver_id": user_id, "delivery_status": {"$ne": "delivered"}},
                    {"$set": {"driver_name": set_fields["full_name"]}}
                )
        # No propagation needed for admins
    except Exception as e:
        # Log but don't fail the main update
        logging.warning(f"Failed to propagate user changes to orders for user {user_id}: {e}")

    # Return updated user (sans password)
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if updated and isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return User(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["owner"]))):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.put("/admin/reset-password/{user_id}")
async def admin_reset_password(user_id: str, password_data: dict, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Admin endpoint to reset user password"""
    new_password = password_data.get('new_password')
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash the new password
    hashed_password = hash_password(new_password)
    
    # Update password
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    # Send notification to user
    await send_notification(
        user_id=user['id'],
        email=user['email'],
        title="Password Reset",
        message=f"Your password has been reset by an administrator. Please use your new password to log in.",
        notif_type="password_reset"
    )
    
    return {"message": "Password reset successfully"}

@api_router.put("/admin/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Enable or disable a user account"""
    # Get the user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow disabling yourself
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    
    # Toggle is_active status
    new_status = not user.get('is_active', True)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    # Send in-app notification to user
    status_text = "enabled" if new_status else "disabled"
    await send_notification(
        user_id=user['id'],
        email=user['email'],
        title=f"Account {status_text.title()}",
        message=f"Your account has been {status_text} by an administrator." + (" You can now log in to your account." if new_status else " Please contact support if you believe this is an error."),
        notif_type="account_status"
    )
    
    return {
        "message": f"User account {status_text} successfully",
        "user_id": user_id,
        "is_active": new_status
    }

# Driver Management Routes
@api_router.get("/drivers", response_model=List[User])
async def get_drivers(current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Get all drivers for assignment"""
    drivers = await db.users.find({"role": "driver"}, {"_id": 0, "password": 0}).to_list(1000)
    for driver in drivers:
        driver['created_at'] = datetime.fromisoformat(driver['created_at']) if isinstance(driver['created_at'], str) else driver['created_at']
    return drivers

@api_router.get("/driver/orders")
async def get_driver_orders(current_user: dict = Depends(require_role(["driver"]))):
    """Get orders assigned to the current driver - excludes already delivered orders"""
    driver_id = current_user['id']
    # Only fetch orders that are NOT in 'delivered' status - drivers should see active/pending deliveries
    # For recurring orders, they'll see the current/next delivery, not past history
    orders = await db.orders.find({
        "driver_id": driver_id,
        "status": {"$ne": "delivered"}  # Exclude delivered orders
    }, {"_id": 0}).to_list(1000)
    
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at']) if isinstance(order['created_at'], str) else order['created_at']
        order['updated_at'] = datetime.fromisoformat(order['updated_at']) if isinstance(order['updated_at'], str) else order['updated_at']
        if order.get('assigned_at'):
            order['assigned_at'] = datetime.fromisoformat(order['assigned_at']) if isinstance(order['assigned_at'], str) else order['assigned_at']
        if order.get('picked_up_at'):
            order['picked_up_at'] = datetime.fromisoformat(order['picked_up_at']) if isinstance(order['picked_up_at'], str) else order['picked_up_at']
        if order.get('delivered_at'):
            order['delivered_at'] = datetime.fromisoformat(order['delivered_at']) if isinstance(order['delivered_at'], str) else order['delivered_at']
    return orders

@api_router.put("/driver/orders/{order_id}/status")
async def update_delivery_status(
    order_id: str,
    status: str = Body(..., embed=True),
    notes: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(require_role(["driver"]))
):
    """Update delivery status by driver"""
    driver_id = current_user['id']
    
    # Verify order is assigned to this driver
    order = await db.orders.find_one({"id": order_id, "driver_id": driver_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")
    
    update_data = {
        "delivery_status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Set timestamps based on status
    if status == "picked_up" and not order.get('picked_up_at'):
        update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "delivered" and not order.get('delivered_at'):
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
        # Ensure order.status reflects delivered for non-recurring orders
        if not order.get('is_recurring'):
            update_data["status"] = "delivered"
    
    if notes:
        update_data["delivery_notes"] = notes
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Roll-forward recurring order if delivered (alternative model)
    if status == "delivered" and order.get('is_recurring'):
        await roll_forward_recurring_order(order, notes)
    
    # Get customer details for email notification
    customer = await db.users.find_one({"id": order['customer_id']})
    
    # Send notification to customer
    await create_notification(
        order['customer_id'],
        "Delivery Update",
        f"Your order {order['order_number']} is now {status.replace('_', ' ')}",
        "delivery"
    )
    
    # Send email notification to customer
    if customer:
        order_details = {
            'pickup_date': order.get('pickup_date'),
            'delivery_date': order.get('delivery_date'),
            'total_amount': order.get('total_amount')
        }
        send_order_status_email(
            to_email=customer['email'],
            customer_name=customer.get('full_name', 'Customer'),
            order_number=order['order_number'],
            status=order.get('status', 'scheduled'),
            delivery_status=status,
            order_details=order_details
        )
    
    return {"message": "Status updated successfully"}

# SKU Management Routes
@api_router.post("/skus", response_model=SKU)
async def create_sku(sku: SKUBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    sku_obj = SKU(**sku.model_dump())
    doc = sku_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.skus.insert_one(doc)
    return sku_obj

@api_router.get("/skus", response_model=List[SKU])
async def get_skus():
    skus = await db.skus.find({}, {"_id": 0}).to_list(1000)
    for sku in skus:
        sku['created_at'] = datetime.fromisoformat(sku['created_at']) if isinstance(sku['created_at'], str) else sku['created_at']
    return skus

@api_router.put("/skus/{sku_id}", response_model=SKU)
async def update_sku(sku_id: str, sku: SKUBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    result = await db.skus.update_one({"id": sku_id}, {"$set": sku.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="SKU not found")
    updated_sku = await db.skus.find_one({"id": sku_id}, {"_id": 0})
    updated_sku['created_at'] = datetime.fromisoformat(updated_sku['created_at']) if isinstance(updated_sku['created_at'], str) else updated_sku['created_at']
    return SKU(**updated_sku)

@api_router.delete("/skus/{sku_id}")
async def delete_sku(sku_id: str, current_user: dict = Depends(require_role(["owner"]))):
    result = await db.skus.delete_one({"id": sku_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"message": "SKU deleted successfully"}

# Customer Pricing Routes
@api_router.post("/customer-pricing", response_model=CustomerPricing)
async def create_customer_pricing(pricing: CustomerPricingBase, current_user: dict = Depends(require_role(["owner"]))):
    """Set customer-specific pricing for a SKU"""
    # Check if pricing already exists
    existing = await db.customer_pricing.find_one({
        "customer_id": pricing.customer_id,
        "sku_id": pricing.sku_id
    })
    
    if existing:
        # Update existing pricing
        await db.customer_pricing.update_one(
            {"id": existing["id"]},
            {"$set": {"custom_price": pricing.custom_price}}
        )
        updated = await db.customer_pricing.find_one({"id": existing["id"]}, {"_id": 0})
        updated['created_at'] = datetime.fromisoformat(updated['created_at']) if isinstance(updated['created_at'], str) else updated['created_at']
        return CustomerPricing(**updated)
    
    # Create new pricing
    pricing_obj = CustomerPricing(**pricing.model_dump())
    doc = pricing_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customer_pricing.insert_one(doc)
    return pricing_obj

@api_router.get("/customer-pricing/{customer_id}", response_model=List[CustomerPricing])
async def get_customer_pricing(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get all customer-specific pricing for a customer"""
    pricing = await db.customer_pricing.find({"customer_id": customer_id}, {"_id": 0}).to_list(1000)
    for p in pricing:
        p['created_at'] = datetime.fromisoformat(p['created_at']) if isinstance(p['created_at'], str) else p['created_at']
    return pricing

@api_router.get("/skus-with-pricing/{customer_id}")
async def get_skus_with_customer_pricing(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get only SKUs that have customer-specific pricing assigned"""
    # Get customer-specific pricing
    customer_pricing = await db.customer_pricing.find({"customer_id": customer_id}, {"_id": 0}).to_list(1000)
    
    if not customer_pricing:
        return []
    
    # Get only the SKUs that have custom pricing
    sku_ids = [p['sku_id'] for p in customer_pricing]
    skus = await db.skus.find({"id": {"$in": sku_ids}}, {"_id": 0}).to_list(1000)
    
    # Create pricing map
    pricing_map = {p['sku_id']: p['custom_price'] for p in customer_pricing}
    
    # Apply customer pricing
    for sku in skus:
        sku['created_at'] = datetime.fromisoformat(sku['created_at']) if isinstance(sku['created_at'], str) else sku['created_at']
        sku['customer_price'] = pricing_map.get(sku['id'], sku['price'])
        sku['has_custom_pricing'] = True
    
    return skus

@api_router.delete("/customer-pricing/{pricing_id}")
async def delete_customer_pricing(pricing_id: str, current_user: dict = Depends(require_role(["owner"]))):
    """Delete customer-specific pricing"""
    result = await db.customer_pricing.delete_one({"id": pricing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer pricing not found")
    return {"message": "Customer pricing deleted successfully"}

# Frequency Template Routes
@api_router.post("/frequency-templates", response_model=FrequencyTemplate)
async def create_frequency_template(template: FrequencyTemplateBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Create a custom frequency template for recurring orders"""
    template_obj = FrequencyTemplate(**template.model_dump())
    doc = template_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.frequency_templates.insert_one(doc)
    return template_obj

@api_router.get("/frequency-templates", response_model=List[FrequencyTemplate])
async def get_frequency_templates(current_user: dict = Depends(get_current_user)):
    """Get all frequency templates"""
    templates = await db.frequency_templates.find({}, {"_id": 0}).to_list(1000)
    for t in templates:
        t['created_at'] = datetime.fromisoformat(t['created_at']) if isinstance(t['created_at'], str) else t['created_at']
    return templates

@api_router.put("/frequency-templates/{template_id}", response_model=FrequencyTemplate)
async def update_frequency_template(template_id: str, template: FrequencyTemplateBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Update a frequency template"""
    result = await db.frequency_templates.update_one({"id": template_id}, {"$set": template.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Frequency template not found")
    updated = await db.frequency_templates.find_one({"id": template_id}, {"_id": 0})
    updated['created_at'] = datetime.fromisoformat(updated['created_at']) if isinstance(updated['created_at'], str) else updated['created_at']
    return FrequencyTemplate(**updated)

@api_router.delete("/frequency-templates/{template_id}")
async def delete_frequency_template(template_id: str, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Delete a frequency template"""
    result = await db.frequency_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Frequency template not found")
    return {"message": "Frequency template deleted successfully"}

# Order Management Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    # Generate unique order number atomically
    order_number = await get_next_order_number()
    
    # Calculate total
    total_amount = sum(item.price * item.quantity for item in order.items)
    gst_amount = total_amount * 0.10
    total_with_gst = total_amount + gst_amount
    
    order_dict = order.model_dump()
    order_dict['order_number'] = order_number
    order_dict['total_amount'] = total_amount
    order_dict['gst_amount'] = gst_amount
    order_dict['total_with_gst'] = total_with_gst
    order_dict['created_by'] = current_user['id']
    order_dict['is_locked'] = False
    
    # Handle recurring orders - don't set next_occurrence_date yet
    # It will be set after the first delivery is completed
    # if order.is_recurring and order.recurrence_pattern:
    #     delivery_date = datetime.fromisoformat(order.delivery_date).date() if isinstance(order.delivery_date, str) else order.delivery_date.date()
    #     frequency_type = order.recurrence_pattern.get('frequency_type')
    #     frequency_value = order.recurrence_pattern.get('frequency_value', 1)
    #     
    #     if frequency_type == 'daily':
    #         next_date = delivery_date + timedelta(days=frequency_value)
    #     elif frequency_type == 'weekly':
    #         next_date = delivery_date + timedelta(weeks=frequency_value)
    #     elif frequency_type == 'monthly':
    #         next_date = delivery_date + timedelta(days=30 * frequency_value)
    #     else:
    #         next_date = delivery_date + timedelta(days=1)
    #     
    #     order_dict['next_occurrence_date'] = next_date.isoformat()
    
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('locked_at'):
        doc['locked_at'] = doc['locked_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    # If recurring order, create 6 months worth of orders upfront
    # DISABLED: Now creating one order at a time after delivery instead
    # if order.is_recurring and order.recurrence_pattern:
    #     await create_recurring_orders_for_6_months(doc)
    #     logging.info(f"Created 6 months of recurring orders for parent order {order_number}")
    
    # Send notifications to customer, owner, and admin
    order_type = "recurring order" if order.is_recurring else "order"
    notification_message = f"New {order_type} #{order_number} has been created"
    
    # Notify customer
    customer = await db.users.find_one({"id": order.customer_id})
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="New Order Created",
            message=f"Your {order_type} #{order_number} has been created successfully.",
            notif_type="order_created"
        )
        
        # Send email notification to customer
        order_details = {
            'pickup_date': order.pickup_date if order.pickup_date else None,
            'delivery_date': order.delivery_date,
            'total_amount': total_amount,
            'customer_name': customer.get('full_name', 'N/A'),
            'customer_email': customer.get('email', 'N/A'),
            'customer_phone': customer.get('phone', 'N/A'),
            'pickup_address': order.pickup_address,
            'delivery_address': order.delivery_address,
            'items': [item.model_dump() for item in order.items]
        }
        send_order_status_email(
            to_email=customer['email'],
            customer_name=customer.get('full_name', 'Customer'),
            order_number=order_number,
            status='scheduled',
            order_details=order_details
        )
    
    # Notify all owners and admins
    owners = await db.users.find({"role": "owner"}).to_list(length=None)
    admins = await db.users.find({"role": "admin"}).to_list(length=None)
    
    for user in owners + admins:
        await send_notification(
            user_id=user['id'],
            email=user['email'],
            title="New Order Created",
            message=notification_message,
            notif_type="order_created"
        )
    
    return order_obj

@api_router.post("/orders/customer", response_model=Order)
async def create_customer_order(order: CustomerOrderCreate, current_user: dict = Depends(require_role(["customer"]))):
    """Allow customers to create their own orders"""
    # Generate unique order number atomically
    order_number = await get_next_order_number()
    
    # Get customer details
    customer = await db.users.find_one({"id": current_user['id']})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate total
    total_amount = sum(item.price * item.quantity for item in order.items)
    gst_amount = total_amount * 0.10
    total_with_gst = total_amount + gst_amount
    
    order_dict = order.model_dump()
    order_dict['customer_id'] = customer['id']
    order_dict['customer_name'] = customer['full_name']
    order_dict['customer_email'] = customer['email']
    order_dict['order_number'] = order_number
    order_dict['total_amount'] = total_amount
    order_dict['gst_amount'] = gst_amount
    order_dict['total_with_gst'] = total_with_gst
    order_dict['created_by'] = current_user['id']
    order_dict['is_locked'] = False
    
    # Handle recurring orders - don't set next_occurrence_date on creation
    # It will be calculated after first delivery is completed
    # if order.is_recurring and order.recurrence_pattern:
    #     delivery_date = datetime.fromisoformat(order.delivery_date).date()
    #     frequency_type = order.recurrence_pattern.get('frequency_type')
    #     frequency_value = order.recurrence_pattern.get('frequency_value', 1)
    #     
    #     if frequency_type == 'daily':
    #         next_date = delivery_date + timedelta(days=frequency_value)
    #     elif frequency_type == 'weekly':
    #         next_date = delivery_date + timedelta(weeks=frequency_value)
    #     elif frequency_type == 'monthly':
    #         next_date = delivery_date + timedelta(days=30 * frequency_value)
    #     else:
    #         next_date = delivery_date + timedelta(days=1)
    #     
    #     order_dict['next_occurrence_date'] = next_date.isoformat()
    
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('locked_at'):
        doc['locked_at'] = doc['locked_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    # If recurring order, create 6 months worth of orders upfront
    # DISABLED: Now creating one order at a time after delivery instead
    # if order.is_recurring and order.recurrence_pattern:
    #     await create_recurring_orders_for_6_months(doc)
    #     logging.info(f"Created 6 months of recurring orders for parent order {order_number}")
    
    # Prepare detailed order info - use calculated pricing values
    base_price = total_amount
    gst = gst_amount
    total_inc_gst = total_with_gst
    items_list = "\n".join([f"    - {item.sku_name}: {item.quantity} x ${item.price:.2f} = ${item.quantity * item.price:.2f}" for item in order.items])
    order_details = f"""
    Order Number: {order_number}
    Order Type: {'Recurring' if order.is_recurring else 'Regular'}
    Customer: {customer['full_name']}
    Email: {customer['email']}
    
    Pricing:
    - Base Price: ${base_price:.2f}
    - GST (10%): ${gst:.2f}
    - Total (Inc. GST): ${total_inc_gst:.2f}
    
    Items:
{items_list}
    
    Pickup:
    - Date: {order.pickup_date if order.pickup_date else 'Not scheduled'}
    - Address: {order.pickup_address}
    
    Delivery:
    - Date: {order.delivery_date}
    - Address: {order.delivery_address}
    """
    
    # Send notifications
    order_type = "recurring order" if order.is_recurring else "order"
    
    # Notify customer
    await send_notification(
        user_id=customer['id'],
        email=customer['email'],
        title="Order Created Successfully",
        message=f"Your {order_type} has been created successfully.{order_details}",
        notif_type="order_created"
    )
    
    # Send email notification to customer
    order_details_dict = {
        'pickup_date': order.pickup_date if order.pickup_date else None,
        'delivery_date': order.delivery_date,
        'total_amount': total_amount,
        'customer_name': customer.get('full_name', 'N/A'),
        'customer_email': customer.get('email', 'N/A'),
        'customer_phone': customer.get('phone', 'N/A'),
        'pickup_address': order.pickup_address,
        'delivery_address': order.delivery_address,
        'items': [item.model_dump() for item in order.items]
    }
    send_order_status_email(
        to_email=customer['email'],
        customer_name=customer.get('full_name', 'Customer'),
        order_number=order_number,
        status='scheduled',
        order_details=order_details_dict
    )
    
    # Notify all owners and admins
    owners = await db.users.find({"role": "owner"}).to_list(length=None)
    admins = await db.users.find({"role": "admin"}).to_list(length=None)
    
    for user in owners + admins:
        await send_notification(
            user_id=user['id'],
            email=user['email'],
            title="New Customer Order",
            message=f"Customer {customer['full_name']} created a new {order_type}.{order_details}",
            notif_type="order_created"
        )
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user['role'] == 'customer':
        query['customer_id'] = current_user['id']
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    # Check and lock orders automatically
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at']) if isinstance(order['created_at'], str) else order['created_at']
        order['updated_at'] = datetime.fromisoformat(order['updated_at']) if isinstance(order['updated_at'], str) else order['updated_at']
        
        # Apply automatic locking logic
        order = await check_and_lock_order(order)
    
    return sorted(orders, key=lambda x: x['created_at'], reverse=True)

@api_router.get("/orders/pending-edit-requests", response_model=List[Order])
async def get_pending_edit_requests(current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Get all orders with pending customer edit requests"""
    orders = await db.orders.find(
        {"modification_status": "pending_owner_approval"},
        {"_id": 0}
    ).to_list(1000)
    
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at']) if isinstance(order['created_at'], str) else order['created_at']
        order['updated_at'] = datetime.fromisoformat(order['updated_at']) if isinstance(order['updated_at'], str) else order['updated_at']
        if order.get('modification_requested_at'):
            order['modification_requested_at'] = datetime.fromisoformat(order['modification_requested_at']) if isinstance(order['modification_requested_at'], str) else order['modification_requested_at']
    
    return sorted(orders, key=lambda x: x.get('modification_requested_at', x['created_at']), reverse=True)

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order_doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user['role'] == 'customer' and order_doc['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    order_doc['created_at'] = datetime.fromisoformat(order_doc['created_at']) if isinstance(order_doc['created_at'], str) else order_doc['created_at']
    order_doc['updated_at'] = datetime.fromisoformat(order_doc['updated_at']) if isinstance(order_doc['updated_at'], str) else order_doc['updated_at']
    
    # Apply automatic locking logic
    order_doc = await check_and_lock_order(order_doc)
    
    return Order(**order_doc)

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, update: OrderUpdate, current_user: dict = Depends(get_current_user)):
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order is locked - only applies to customers, not owner/admin
    if current_user['role'] == 'customer':
        if order_doc.get('is_locked', False):
            # Get delivery date for better error message
            delivery_date = order_doc.get('delivery_date', '')
            if 'T' in delivery_date:
                delivery_date = datetime.fromisoformat(delivery_date).date().strftime('%B %d, %Y')
            else:
                try:
                    delivery_date = datetime.fromisoformat(delivery_date).date().strftime('%B %d, %Y')
                except:
                    delivery_date = delivery_date
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot modify order - orders are locked at midnight on the delivery date ({delivery_date}). Please contact us for changes."
            )
    
    # Customer can only modify their own orders, and all customer edits now require approval
    if current_user['role'] == 'customer':
        if order_doc['customer_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        raise HTTPException(
            status_code=400,
            detail="Customers cannot directly edit orders. Please submit an edit request for approval."
        )
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate pricing if items are modified (owner/admin changes)
    if 'items' in update_data and update_data['items']:
        total = sum(item.get('price', 0) * item.get('quantity', 1) for item in update_data['items'])
        gst = total * 0.10
        total_with_gst = total + gst
        update_data['total_amount'] = total
        update_data['gst_amount'] = gst
        update_data['total_with_gst'] = total_with_gst
    
    # Check if status is being changed
    status_changed = 'status' in update_data and update_data['status'] != order_doc.get('status')
    new_status = update_data.get('status')
    
    # Recalculate next_occurrence_date if this is a recurring order and delivery_date changed
    if update_data.get('is_recurring') and update_data.get('recurrence_pattern'):
        delivery_date_str = update_data.get('delivery_date', order_doc.get('delivery_date'))
        if delivery_date_str:
            # Be tolerant of ISO strings with 'Z'
            try:
                delivery_date = datetime.fromisoformat(str(delivery_date_str).replace('Z', '+00:00')).date()
            except Exception as e:
                logging.error(f"Failed to parse delivery_date when updating recurring order {order_id}: {delivery_date_str} - {e}")
                delivery_date = None
        else:
            delivery_date = None
        if delivery_date:
            frequency_type = update_data['recurrence_pattern'].get('frequency_type')
            frequency_value = update_data['recurrence_pattern'].get('frequency_value', 1)
            
            # Calculate next occurrence date from delivery date
            if frequency_type == 'daily':
                next_date = delivery_date + timedelta(days=frequency_value)
            elif frequency_type == 'weekly':
                next_date = delivery_date + timedelta(weeks=frequency_value)
            elif frequency_type == 'monthly':
                next_date = delivery_date + timedelta(days=30 * frequency_value)
            else:
                next_date = delivery_date + timedelta(days=1)
            
            update_data['next_occurrence_date'] = next_date.isoformat()
    
    # If owner/admin marks order delivered for a non-recurring order, also set delivery_status to delivered
    if update_data.get('status') == 'delivered' and not order_doc.get('is_recurring'):
        update_data['delivery_status'] = 'delivered'

    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # For recurring order INSTANCES (not the parent), check if we need to create more future orders
    if status_changed and new_status in ['delivered', 'completed']:
        # Check if this is a recurring instance (has parent_recurring_id)
        if order_doc.get('parent_recurring_id'):
            # Find the parent recurring order
            parent_order = await db.orders.find_one({"id": order_doc['parent_recurring_id']})
            if parent_order and parent_order.get('is_recurring'):
                # Count future scheduled orders for this recurring order
                future_orders_count = await db.orders.count_documents({
                    "parent_recurring_id": parent_order['id'],
                    "status": "scheduled",
                    "delivery_date": {"$gt": datetime.now(timezone.utc).isoformat()}
                })
                
                # If less than 10 future orders, create more to maintain 6 months buffer
                if future_orders_count < 10:
                    logging.info(f"Replenishing recurring orders for parent {parent_order['order_number']}, current future count: {future_orders_count}")
                    await create_recurring_orders_for_6_months(parent_order)
        # If this is the parent recurring order itself being marked delivered
        elif order_doc.get('is_recurring'):
            await auto_create_next_recurring_order(order_doc)
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    updated_order['created_at'] = datetime.fromisoformat(updated_order['created_at'])
    updated_order['updated_at'] = datetime.fromisoformat(updated_order['updated_at'])
    if updated_order.get('locked_at'):
        updated_order['locked_at'] = datetime.fromisoformat(updated_order['locked_at']) if isinstance(updated_order['locked_at'], str) else updated_order['locked_at']
    
    # Get customer details
    customer = await db.users.find_one({"id": order_doc['customer_id']})
    
    # Send email notification to customer ONLY if status changed to 'delivered'
    if status_changed and new_status == 'delivered' and customer:
        order_details = {
            'pickup_date': updated_order.get('pickup_date'),
            'delivery_date': updated_order.get('delivery_date'),
            'total_amount': updated_order.get('total_amount'),
            'customer_name': customer.get('full_name', 'N/A'),
            'customer_email': customer.get('email', 'N/A'),
            'customer_phone': customer.get('phone', 'N/A'),
            'pickup_address': updated_order.get('pickup_address', 'N/A'),
            'delivery_address': updated_order.get('delivery_address', 'N/A'),
            'items': updated_order.get('items', [])
        }
        send_order_status_email(
            to_email=customer['email'],
            customer_name=customer.get('full_name', 'Customer'),
            order_number=order_doc['order_number'],
            status=updated_order.get('status', 'scheduled'),
            order_details=order_details
        )
    
    # Send in-app notifications only for status changes to 'delivered'
    if status_changed and new_status == 'delivered':
        # Prepare order details for notifications - use stored pricing values
        base_price = updated_order.get('total_amount', 0)
        gst = updated_order.get('gst_amount', base_price * 0.10)
        total_inc_gst = updated_order.get('total_with_gst', base_price + gst)
        order_details = f"""
    Order Number: {order_doc['order_number']}
    Status: {updated_order.get('status', 'N/A')}
    
    Pricing:
    - Base Price: ${base_price:.2f}
    - GST (10%): ${gst:.2f}
    - Total (Inc. GST): ${total_inc_gst:.2f}
    
    Pickup Date: {updated_order.get('pickup_date', 'N/A')}
    Delivery Date: {updated_order.get('delivery_date', 'N/A')}
    """
        
        # Send notifications to customer, owner, and admin
        if customer:
            await send_notification(
                user_id=customer['id'],
                email=customer['email'],
                title="Order Delivered",
                message=f"Your order has been delivered.{order_details}",
                notif_type="order_delivered"
            )
        
        # Notify owners and admins
        owners = await db.users.find({"role": "owner"}).to_list(length=None)
        admins = await db.users.find({"role": "admin"}).to_list(length=None)
        
        for user in owners + admins:
            if user['id'] != current_user['id']:  # Don't notify the user who made the update
                await send_notification(
                    user_id=user['id'],
                    email=user['email'],
                    title="Order Delivered",
                    message=f"Order #{order_doc['order_number']} has been delivered.{order_details}",
                    notif_type="order_delivered"
                )
    
    return Order(**updated_order)

@api_router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user['role'] == 'customer' and order_doc['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Clear any old pending modifications before cancelling
    await db.orders.update_one(
        {"id": order_id}, 
        {
            "$set": {"status": "cancelled"},
            "$unset": {
                "pending_modifications": "",
                "modification_requested_at": ""
            }
        }
    )
    
    # Get customer details
    customer = await db.users.find_one({"id": order_doc['customer_id']})
    
    # Prepare detailed order info
    order_details = f"""
    Order Number: {order_doc['order_number']}
    Order Type: {'Recurring' if order_doc.get('is_recurring') else 'Regular'}
    Status: Cancelled
    Total Amount: ${order_doc.get('total_amount', 0):.2f}
    Pickup Date: {order_doc.get('pickup_date', 'N/A')}
    Delivery Date: {order_doc.get('delivery_date', 'N/A')}
    """
    
    # Send notification to customer
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="Order Cancelled",
            message=f"Your order #{order_doc['order_number']} has been cancelled.{order_details}",
            notif_type="order_cancelled"
        )
    
    # Notify owners and admins
    owners = await db.users.find({"role": "owner"}).to_list(length=None)
    admins = await db.users.find({"role": "admin"}).to_list(length=None)
    
    for user in owners + admins:
        await send_notification(
            user_id=user['id'],
            email=user['email'],
            title="Order Cancelled",
            message=f"Order #{order_doc['order_number']} has been cancelled by {customer.get('name', 'Customer') if customer else 'Customer'}.{order_details}",
            notif_type="order_cancelled"
        )
    
    return {"message": "Order cancelled successfully"}

@api_router.delete("/orders/{order_id}/permanent")
async def permanently_delete_order(order_id: str, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Permanently delete an order from database - only owner/admin"""
    # Try to find by id first, then by order_number
    order_doc = await db.orders.find_one({"$or": [{"id": order_id}, {"order_number": order_id}]})
    if not order_doc:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    order_number = order_doc.get('order_number')
    actual_id = order_doc.get('id')
    
    # Actually delete from database using the actual id
    result = await db.orders.delete_one({"id": actual_id})
    
    if result.deleted_count > 0:
        return {"message": f"Order {order_number} permanently deleted", "deleted": True}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete order")

@api_router.put("/orders/{order_id}/lock")
async def lock_order(
    order_id: str,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Manually lock an order - only owner/admin can do this"""
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if already locked
    if order_doc.get('is_locked'):
        return {"message": "Order is already locked"}
    
    # Lock the order
    now = datetime.now(timezone.utc)
    update_data = {
        "is_locked": True,
        "locked_at": now.isoformat(),
        "locked_by": current_user['id'],
        "lock_type": "manual",  # manual vs automatic
        "updated_at": now.isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Get customer and notify
    customer = await db.users.find_one({"id": order_doc['customer_id']})
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="Order Locked",
            message=f"Order #{order_doc['order_number']} has been locked. Please contact us if you need to make changes.",
            notif_type="order_locked"
        )
    
    logging.info(f"Order {order_id} manually locked by {current_user['role']} {current_user['id']}")
    
    return {
        "message": "Order locked successfully",
        "order_id": order_id,
        "locked_at": now.isoformat()
    }

@api_router.put("/orders/{order_id}/unlock")
async def unlock_order(
    order_id: str,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Manually unlock an order - only owner/admin can do this"""
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if not locked
    if not order_doc.get('is_locked'):
        return {"message": "Order is not locked"}
    
    # Unlock the order
    now = datetime.now(timezone.utc)
    update_data = {
        "is_locked": False,
        "unlocked_at": now.isoformat(),
        "unlocked_by": current_user['id'],
        "updated_at": now.isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Get customer and notify
    customer = await db.users.find_one({"id": order_doc['customer_id']})
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="Order Unlocked",
            message=f"Order #{order_doc['order_number']} has been unlocked. You can now make changes to this order.",
            notif_type="order_unlocked"
        )
    
    logging.info(f"Order {order_id} manually unlocked by {current_user['role']} {current_user['id']}")
    
    return {
        "message": "Order unlocked successfully",
        "order_id": order_id,
        "unlocked_at": now.isoformat()
    }

@api_router.post("/orders/{order_id}/request-edit")
async def request_order_edit(
    order_id: str,
    edit_request: RecurringOrderEditRequest,
    current_user: dict = Depends(get_current_user)
):
    """Customer submits edit request for any order - requires owner/admin approval"""
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only customers can submit edit requests
    if current_user['role'] != 'customer':
        raise HTTPException(status_code=403, detail="Only customers can submit edit requests")
    
    # Customer can only edit their own orders
    if order_doc['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to edit this order")
    
    # Optional: prevent edit requests for delivered/cancelled orders
    if order_doc.get('status') in ['delivered', 'cancelled']:
        raise HTTPException(status_code=400, detail="Cannot request edits for delivered or cancelled orders")
    
    # Check if there's already a pending request
    if order_doc.get('modification_status') == 'pending_customer_edit':
        raise HTTPException(status_code=400, detail="There is already a pending edit request for this order")
    
    # Store the edit request
    edit_data = edit_request.model_dump(exclude_none=True)
    update_data = {
        "pending_modifications": edit_data,
        "modification_status": "pending_customer_edit",
        "modified_by": current_user['id'],
        "modification_requested_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify admins and owners
    admins = await db.users.find({"role": "admin"}).to_list(length=None)
    owners = await db.users.find({"role": "owner"}).to_list(length=None)
    
    customer = await db.users.find_one({"id": current_user['id']})
    customer_name = customer.get('full_name', 'Customer') if customer else 'Customer'
    
    notification_message = f"""
    Customer {customer_name} has requested changes to order {order_doc['order_number']}.
    
    Reason:
    {edit_data.get('reason', 'No reason provided')}
    
    Please review and approve/modify/reject the request.
    """
    
    for user in admins + owners:
        await send_notification(
            user_id=user['id'],
            email=user['email'],
            title="Order Edit Request",
            message=notification_message,
            notif_type="order_edit_request"
        )
    
    # Notify customer that request was submitted
    if customer:
        await send_notification(
            user_id=current_user['id'],
            email=customer['email'],
            title="Edit Request Submitted",
            message=f"Your edit request for order {order_doc['order_number']} has been submitted and is pending approval from our team.",
            notif_type="order_edit_submitted"
        )
    
    return {
        "message": "Edit request submitted successfully. Awaiting admin/owner approval.",
        "order_id": order_id,
        "status": "pending_customer_edit"
    }

@api_router.put("/orders/{order_id}/review-edit-request")
async def review_order_edit_request(
    order_id: str,
    approval: RecurringOrderEditApproval,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Admin/Owner reviews and processes customer's edit request for any order"""
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")

    # Must have a pending customer edit request
    if order_doc.get('modification_status') != 'pending_customer_edit':
        raise HTTPException(status_code=400, detail="No pending edit request found for this order")
    
    customer = await db.users.find_one({"id": order_doc['customer_id']})
    reviewer_user = await db.users.find_one({"id": current_user['id']})
    reviewer_name = reviewer_user.get('full_name', current_user['role'].capitalize()) if reviewer_user else current_user['role'].capitalize()
    
    if approval.action == "reject":
        # Reject the request
        update_data = {
            "pending_modifications": None,
            "modification_status": "rejected",
            "rejection_reason": approval.rejection_reason,
            "reviewed_by": current_user['id'],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        
        # Notify customer
        if customer:
            rejection_msg = f"""
            Your edit request for recurring order {order_doc['order_number']} has been rejected.
            
            Reason: {approval.rejection_reason or 'No reason provided'}
            
            {approval.admin_notes or ''}
            """
            await send_notification(
                user_id=customer['id'],
                email=customer['email'],
                title="Edit Request Rejected",
                message=rejection_msg,
                notif_type="order_edit_rejected"
            )
        
        return {
            "message": "Edit request rejected",
            "order_id": order_id
        }
    
    elif approval.action in ["approve", "modify"]:
        # Prepare update data - use admin's modifications if action is "modify", otherwise use customer's request
        if approval.action == "modify":
            # Admin is modifying the customer's request
            final_changes = approval.model_dump(exclude={'action', 'rejection_reason', 'admin_notes'}, exclude_none=True)
        else:
            # Admin is approving customer's request as-is
            final_changes = order_doc.get('pending_modifications', {})
        
        # Calculate total amount if items changed
        if final_changes.get('items'):
            # Get customer-specific pricing first, then fall back to default SKU pricing
            customer_pricing = await db.customer_pricing.find(
                {"customer_id": order_doc['customer_id']}, 
                {"_id": 0}
            ).to_list(1000)
            
            # Create pricing map from customer pricing
            pricing_map = {p['sku_id']: p['custom_price'] for p in customer_pricing}
            
            # Get default SKU prices for items without custom pricing
            skus = await db.skus.find().to_list(length=None)
            sku_map = {sku['id']: sku['price'] for sku in skus}
            
            # Calculate total using customer pricing if available, otherwise default price
            # AND update each item's price field
            total = 0
            for item in final_changes['items']:
                sku_id = item.get('sku_id')
                quantity = item.get('quantity', 0)
                # Use customer price if available, otherwise use default SKU price
                price = pricing_map.get(sku_id, sku_map.get(sku_id, 0))
                # Update the item's price field with the correct price
                item['price'] = price
                total += quantity * price
            
            final_changes['total_amount'] = total
        
        # Update recurrence next occurrence date if pattern or delivery date changed
        if final_changes.get('recurrence_pattern') or final_changes.get('delivery_date'):
            delivery_date_str = final_changes.get('delivery_date', order_doc.get('delivery_date'))
            recurrence_pattern = final_changes.get('recurrence_pattern', order_doc.get('recurrence_pattern'))
            
            if delivery_date_str and recurrence_pattern:
                delivery_date = datetime.fromisoformat(delivery_date_str).date()
                frequency_type = recurrence_pattern.get('frequency_type')
                frequency_value = recurrence_pattern.get('frequency_value', 1)
                
                if frequency_type == 'daily':
                    next_date = delivery_date + timedelta(days=frequency_value)
                elif frequency_type == 'weekly':
                    next_date = delivery_date + timedelta(weeks=frequency_value)
                elif frequency_type == 'monthly':
                    next_date = delivery_date + timedelta(days=30 * frequency_value)
                else:
                    next_date = delivery_date + timedelta(days=1)
                
                final_changes['next_occurrence_date'] = next_date.isoformat()
        
        # Apply the changes
        final_changes.update({
            "pending_modifications": None,
            "modification_status": "approved",
            "reviewed_by": current_user['id'],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        await db.orders.update_one({"id": order_id}, {"$set": final_changes})
        
        # Notify customer
        if customer:
            approval_msg = f"""
            Your edit request for order {order_doc['order_number']} has been {approval.action}d by {reviewer_name}.
            
            The changes have been applied to your order.
            
            {approval.admin_notes or ''}
            """
            await send_notification(
                user_id=customer['id'],
                email=customer['email'],
                title=f"Edit Request {approval.action.capitalize()}d",
                message=approval_msg,
                notif_type="order_edit_approved"
            )
        
        return {
            "message": f"Edit request {approval.action}d and changes applied",
            "order_id": order_id,
            "action": approval.action
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'approve', 'reject', or 'modify'")

@api_router.put("/orders/{order_id}/propose-modification")
async def propose_order_modification(
    order_id: str,
    modifications: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Owner/Admin: Directly modifies the order (no approval needed)
    Customer: Sends modification request to owner for approval
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # If owner/admin is making changes - apply directly without approval
    if current_user['role'] in ['owner', 'admin']:
        # Calculate pricing if items are modified
        if 'items' in modifications and 'total_amount' not in modifications:
            total = sum(item.get('price', 0) * item.get('quantity', 1) for item in modifications['items'])
            gst = total * 0.10
            total_with_gst = total + gst
            modifications['total_amount'] = total
            modifications['gst_amount'] = gst
            modifications['total_with_gst'] = total_with_gst
        
        # Apply changes directly
        update_data = {
            **modifications,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        
        # Notify customer of the changes
        customer = await db.users.find_one({"id": order['customer_id']})
        if customer:
            await create_notification(
                order['customer_id'],
                "Order Updated",
                f"Your order {order['order_number']} has been updated by the owner.",
                "order"
            )
        
        return {"message": "Order updated successfully", "order_id": order_id}
    
    # If customer is making changes - send request to owner for approval
    elif current_user['role'] == 'customer':
        # Check if customer owns this order
        if order['customer_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if modification is allowed (before 11:59 PM on day before delivery)
        delivery_date_str = order['delivery_date'].replace('Z', '+00:00')
        try:
            delivery_date = datetime.fromisoformat(delivery_date_str)
        except:
            # If it's just a date string (YYYY-MM-DD), parse as midnight UTC
            delivery_date = datetime.fromisoformat(delivery_date_str)
            if delivery_date.tzinfo is None:
                delivery_date = delivery_date.replace(tzinfo=timezone.utc)
        
        # Ensure timezone-aware for comparison
        if delivery_date.tzinfo is None:
            delivery_date = delivery_date.replace(tzinfo=timezone.utc)
        
        cutoff_time = delivery_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(seconds=1)
        current_time = datetime.now(timezone.utc)
        
        if current_time >= cutoff_time:
            raise HTTPException(
                status_code=400,
                detail=f"Order modifications are locked. Changes must be made before 11:59 PM on {(delivery_date - timedelta(days=1)).strftime('%B %d, %Y')}"
            )
        
        # Store customer's modification request
        update_data = {
            "pending_modifications": modifications,
            "modification_status": "pending_owner_approval",
            "modified_by": current_user['id'],
            "modification_requested_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        
        # Notify owner/admin
        owners = await db.users.find({"role": {"$in": ["owner", "admin"]}}).to_list(100)
        for owner in owners:
            await create_notification(
                owner['id'],
                "Customer Modification Request",
                f"Customer has requested changes to order {order['order_number']}. Please review and approve or reject.",
                "order"
            )
        
        return {"message": "Modification request sent to owner for approval", "order_id": order_id}
        
        # Send SMS notification
        if customer.get('phone'):
            send_sms(
                phone_number=customer['phone'],
                message_body=f"""Infinite Laundry Solutions

Approval Needed: Changes have been proposed for your recurring order {order['order_number']}.

Please log in to your dashboard to review and approve/reject the changes.

The current order will continue as scheduled until you approve."""
            )
    
    return {"message": "Modification proposed successfully. Customer approval required."}


@api_router.put("/orders/{order_id}/approve-modification")
async def approve_order_modification(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Owner/Admin: Approves customer's modification request
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only owner/admin can approve customer requests
    if current_user['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Only owner/admin can approve customer modification requests")
    
    if order.get('modification_status') != 'pending_owner_approval':
        raise HTTPException(status_code=400, detail="No pending customer modification requests to approve")
    
    # Apply the customer's requested modifications
    modifications = order.get('pending_modifications', {})
    update_data = {
        **modifications,
        "modification_status": "approved",
        "pending_modifications": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Always recalculate total from items if they exist in modifications
    if 'items' in modifications:
        total = sum(item.get('price', 0) * item.get('quantity', 1) for item in modifications['items'])
        gst = total * 0.10
        total_with_gst = total + gst
        update_data['total_amount'] = total
        update_data['gst_amount'] = gst
        update_data['total_with_gst'] = total_with_gst
    elif 'total_amount' in modifications:
        # If total_amount is explicitly in modifications, use it
        total = modifications['total_amount']
        gst = total * 0.10
        total_with_gst = total + gst
        update_data['total_amount'] = total
        update_data['gst_amount'] = gst
        update_data['total_with_gst'] = total_with_gst
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify the admin/owner who proposed the change
    if order.get('modified_by'):
        modifier = await db.users.find_one({"id": order['modified_by']})
        if modifier:
            await create_notification(
                order['modified_by'],
                "Modification Approved",
                f"Customer has approved your proposed changes to order {order['order_number']}",
                "order"
            )
    
    # Send confirmation to customer
    await create_notification(
        order['customer_id'],
        "Modification Request Approved",
        f"Your modification request for order {order['order_number']} has been approved by the owner.",
        "order"
    )
    
    return {"message": "Customer modification request approved and applied successfully"}

@api_router.put("/orders/{order_id}/reject-modification")
async def reject_order_modification(
    order_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Owner/Admin rejects customer's modification request"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only owner/admin can reject customer requests
    if current_user['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Only owner/admin can reject customer modification requests")
    
    if order.get('modification_status') != 'pending_owner_approval':
        raise HTTPException(status_code=400, detail="No pending customer modification requests to reject")
    
    # Clear the pending modifications
    update_data = {
        "modification_status": "rejected",
        "pending_modifications": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify the customer
    await create_notification(
        order['customer_id'],
        "Modification Request Rejected",
        f"Your modification request for order {order['order_number']} has been rejected by the owner{'. Reason: ' + reason if reason else ''}",
        "order"
    )
    
    # Send confirmation to customer
    await create_notification(
        order['customer_id'],
        "Modification Rejected",
        f"You have rejected the changes to your recurring order {order['order_number']}. The order will continue as originally scheduled.",
        "order"
    )
    
    return {"message": "Modifications rejected successfully"}

@api_router.put("/orders/{order_id}/assign-driver")
async def assign_driver_to_order(
    order_id: str,
    driver_id: str = Body(..., embed=True),
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Assign a driver to an order"""
    # Verify order exists
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order already has a driver assigned
    if order.get('driver_id'):
        raise HTTPException(
            status_code=400, 
            detail=f"Order is already assigned to driver: {order.get('driver_name', 'Unknown')}"
        )
    
    # Verify driver exists and has driver role
    driver = await db.users.find_one({"id": driver_id, "role": "driver"})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Update order with driver info
    update_data = {
        "driver_id": driver_id,
        "driver_name": driver['full_name'],
        "delivery_status": "assigned",
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Send notification to driver
    await create_notification(
        driver_id,
        "New Delivery Assignment",
        f"You have been assigned to deliver order {order['order_number']}",
        "delivery"
    )
    
    # Send notification to customer
    await create_notification(
        order['customer_id'],
        "Driver Assigned",
        f"A driver has been assigned to your order {order['order_number']}",
        "delivery"
    )
    
    return {"message": "Driver assigned successfully"}

@api_router.put("/orders/{order_id}/unassign-driver")
async def unassign_driver_from_order(
    order_id: str,
    current_user: dict = Depends(require_role(["owner", "admin"]))
):
    """Unassign a driver from an order to allow reassignment"""
    # Verify order exists
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order has a driver assigned
    if not order.get('driver_id'):
        raise HTTPException(status_code=400, detail="Order does not have a driver assigned")
    
    # Store old driver info for notification
    old_driver_id = order.get('driver_id')
    old_driver_name = order.get('driver_name')
    
    # Remove driver assignment
    update_data = {
        "driver_id": None,
        "driver_name": None,
        "delivery_status": "pending",
        "assigned_at": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Send notification to the unassigned driver
    if old_driver_id:
        await create_notification(
            old_driver_id,
            "Delivery Unassigned",
            f"You have been unassigned from order {order['order_number']}",
            "delivery"
        )
    
    # Send notification to customer
    await create_notification(
        order['customer_id'],
        "Driver Unassigned",
        f"The driver assignment for your order {order['order_number']} has been updated",
        "delivery"
    )
    
    return {"message": "Driver unassigned successfully", "old_driver": old_driver_name}

# Recurring Orders Routes
@api_router.get("/orders/recurring/list", response_model=List[Order])
async def get_recurring_orders(current_user: dict = Depends(get_current_user)):
    """Get all recurring order templates"""
    query = {"is_recurring": True, "status": {"$ne": "cancelled"}}
    if current_user['role'] == 'customer':
        query['customer_id'] = current_user['id']
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at']) if isinstance(order['created_at'], str) else order['created_at']
        order['updated_at'] = datetime.fromisoformat(order['updated_at']) if isinstance(order['updated_at'], str) else order['updated_at']
        if order.get('locked_at'):
            order['locked_at'] = datetime.fromisoformat(order['locked_at']) if isinstance(order['locked_at'], str) else order['locked_at']
    return orders

@api_router.delete("/orders/recurring/{order_id}")
async def cancel_recurring_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a recurring order (stops future occurrences)"""
    order_doc = await db.orders.find_one({"id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order_doc.get('is_recurring'):
        raise HTTPException(status_code=400, detail="Order is not a recurring order")
    
    if current_user['role'] == 'customer' and order_doc['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Clear any old pending modifications before cancelling
    await db.orders.update_one(
        {"id": order_id}, 
        {
            "$set": {"status": "cancelled", "is_recurring": False},
            "$unset": {
                "pending_modifications": "",
                "modification_requested_at": ""
            }
        }
    )
    
    await send_notification(
        user_id=order_doc['customer_id'],
        email=order_doc['customer_email'],
        title="Recurring Order Cancelled",
        message=f"Your recurring order #{order_doc['order_number']} has been cancelled. No future orders will be generated.",
        notif_type="order_cancelled"
    )
    
    return {"message": "Recurring order cancelled successfully"}

# Delivery Routes
@api_router.post("/deliveries", response_model=Delivery)
async def create_delivery(delivery: DeliveryBase, current_user: dict = Depends(require_role(["owner", "admin"]))):
    delivery_obj = Delivery(**delivery.model_dump())
    doc = delivery_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.deliveries.insert_one(doc)
    return delivery_obj

@api_router.put("/orders/{order_id}/recalculate-total")
async def recalculate_order_total(order_id: str, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Recalculate order total from items - admin/owner only"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items = order.get('items', [])
    if not items:
        raise HTTPException(status_code=400, detail="Order has no items")
    
    # Calculate total from items
    calculated_total = sum(item.get('price', 0) * item.get('quantity', 1) for item in items)
    calculated_gst = calculated_total * 0.10
    calculated_total_with_gst = calculated_total + calculated_gst
    old_total = order.get('total_amount', 0)
    
    if calculated_total == old_total:
        return {
            "message": "Total is already correct", 
            "total_amount": calculated_total,
            "gst_amount": calculated_gst,
            "total_with_gst": calculated_total_with_gst
        }
    
    # Update the order
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "total_amount": calculated_total,
            "gst_amount": calculated_gst,
            "total_with_gst": calculated_total_with_gst,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Total recalculated successfully",
        "old_total": old_total,
        "new_total": calculated_total,
        "gst_amount": calculated_gst,
        "total_with_gst": calculated_total_with_gst,
        "difference": calculated_total - old_total
    }

@api_router.put("/orders/{order_id}/clear-pending-approval")
async def clear_pending_approval(order_id: str, current_user: dict = Depends(require_role(["owner", "admin"]))):
    """Clear old pending_approval status and pending_modifications - admin/owner only"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Clear old workflow fields
    await db.orders.update_one(
        {"id": order_id},
        {"$unset": {
            "pending_modifications": "",
            "modification_requested_at": ""
        },
        "$set": {
            "modification_status": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Pending approval cleared successfully", "order_id": order_id}

@api_router.get("/deliveries", response_model=List[Delivery])
async def get_deliveries(current_user: dict = Depends(require_role(["owner", "admin"]))):
    deliveries = await db.deliveries.find({}, {"_id": 0}).to_list(1000)
    for delivery in deliveries:
        delivery['created_at'] = datetime.fromisoformat(delivery['created_at']) if isinstance(delivery['created_at'], str) else delivery['created_at']
        delivery['updated_at'] = datetime.fromisoformat(delivery['updated_at']) if isinstance(delivery['updated_at'], str) else delivery['updated_at']
    return deliveries

@api_router.get("/deliveries/order/{order_id}", response_model=Delivery)
async def get_delivery_by_order(order_id: str, current_user: dict = Depends(get_current_user)):
    delivery_doc = await db.deliveries.find_one({"order_id": order_id}, {"_id": 0})
    if not delivery_doc:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_doc['created_at'] = datetime.fromisoformat(delivery_doc['created_at']) if isinstance(delivery_doc['created_at'], str) else delivery_doc['created_at']
    delivery_doc['updated_at'] = datetime.fromisoformat(delivery_doc['updated_at']) if isinstance(delivery_doc['updated_at'], str) else delivery_doc['updated_at']
    return Delivery(**delivery_doc)

@api_router.put("/deliveries/{delivery_id}")
async def update_delivery(delivery_id: str, update_data: dict, current_user: dict = Depends(require_role(["owner", "admin"]))):
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.deliveries.update_one({"id": delivery_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {"message": "Delivery updated successfully"}

# Case Request Routes
@api_router.post("/cases", response_model=CaseRequest)
async def create_case(case: CaseRequestBase, current_user: dict = Depends(get_current_user)):
    # Generate case number
    count = await db.cases.count_documents({}) + 1
    case_number = f"CASE-{count:06d}"
    
    case_dict = case.model_dump()
    case_dict['case_number'] = case_number
    case_obj = CaseRequest(**case_dict)
    
    doc = case_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.cases.insert_one(doc)
    
    # Prepare detailed case info
    case_details = f"""
    Case Number: {case_number}
    Customer: {case.customer_name}
    Email: {case.customer_email}
    Type: {case.type}
    Subject: {case.subject}
    Description: {case.description}
    Priority: {case.priority}
    """
    
    # Get customer user (to send notification)
    customer = await db.users.find_one({"id": case.customer_id})
    
    # Send notification to customer
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="Case Created Successfully",
            message=f"Your case #{case_number} has been created and our team will review it shortly.{case_details}",
            notif_type="case_created"
        )
    
    # Notify admins and owners
    admins = await db.users.find({"role": {"$in": ["owner", "admin"]}}, {"_id": 0}).to_list(100)
    for admin in admins:
        await send_notification(
            user_id=admin['id'],
            email=admin['email'],
            title="New Case Request",
            message=f"New case #{case_number} created by {case.customer_name}.{case_details}",
            notif_type="case_created"
        )
    
    return case_obj

@api_router.get("/cases", response_model=List[CaseRequest])
async def get_cases(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user['role'] == 'customer':
        query['customer_id'] = current_user['id']
    
    cases = await db.cases.find(query, {"_id": 0}).to_list(1000)
    for case in cases:
        case['created_at'] = datetime.fromisoformat(case['created_at']) if isinstance(case['created_at'], str) else case['created_at']
        case['updated_at'] = datetime.fromisoformat(case['updated_at']) if isinstance(case['updated_at'], str) else case['updated_at']
    return sorted(cases, key=lambda x: x['created_at'], reverse=True)

@api_router.get("/cases/{case_id}", response_model=CaseRequest)
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    case_doc = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if current_user['role'] == 'customer' and case_doc['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    case_doc['created_at'] = datetime.fromisoformat(case_doc['created_at']) if isinstance(case_doc['created_at'], str) else case_doc['created_at']
    case_doc['updated_at'] = datetime.fromisoformat(case_doc['updated_at']) if isinstance(case_doc['updated_at'], str) else case_doc['updated_at']
    return CaseRequest(**case_doc)

@api_router.put("/cases/{case_id}", response_model=CaseRequest)
async def update_case(case_id: str, update: CaseUpdate, current_user: dict = Depends(require_role(["owner", "admin"]))):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cases.update_one({"id": case_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    updated_case['created_at'] = datetime.fromisoformat(updated_case['created_at'])
    updated_case['updated_at'] = datetime.fromisoformat(updated_case['updated_at'])
    
    # Get customer details
    customer = await db.users.find_one({"id": updated_case['customer_id']})
    
    # Prepare case details
    case_details = f"""
    Case Number: {updated_case['case_number']}
    Status: {updated_case.get('status', 'N/A')}
    Priority: {updated_case.get('priority', 'N/A')}
    Type: {updated_case.get('case_type', 'N/A')}
    """
    
    # Notify customer with email
    if customer:
        await send_notification(
            user_id=customer['id'],
            email=customer['email'],
            title="Case Updated",
            message=f"Your case #{updated_case['case_number']} has been updated.{case_details}",
            notif_type="case_updated"
        )
    
    return CaseRequest(**updated_case)

# Notification Routes
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    for notif in notifs:
        notif['created_at'] = datetime.fromisoformat(notif['created_at']) if isinstance(notif['created_at'], str) else notif['created_at']
    return sorted(notifs, key=lambda x: x['created_at'], reverse=True)

@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user['id']},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user['id']},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(require_role(["owner", "admin"]))):
    total_orders = await db.orders.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    completed_orders = await db.orders.count_documents({"status": "ready_for_pickup"})
    open_cases = await db.cases.count_documents({"status": "open"})
    
    # Calculate total revenue from delivered orders
    orders = await db.orders.find({
        "$or": [
            {"status": "delivered"},
            {"delivery_status": "delivered"}
        ]
    }, {"total_amount": 1}).to_list(10000)
    total_revenue = sum(order.get('total_amount', 0) for order in orders)
    
    # Add revenue from recurring order deliveries_history
    recurring_orders = await db.orders.find({
        "is_recurring": True,
        "deliveries_history": {"$exists": True, "$ne": []}
    }, {"total_amount": 1, "deliveries_history": 1}).to_list(10000)
    
    for order in recurring_orders:
        history_count = len(order.get('deliveries_history', []))
        total_revenue += order.get('total_amount', 0) * history_count
    
    return {
        "total_orders": total_orders,
        "total_customers": total_customers,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "open_cases": open_cases,
        "total_revenue": total_revenue
    }

# Contact Form
@api_router.post("/contact")
async def submit_contact(form: ContactForm):
    try:
        doc = form.model_dump()
        doc['id'] = str(uuid.uuid4())
        doc['created_at'] = datetime.now(timezone.utc).isoformat()
        doc['status'] = 'new'
        await db.contacts.insert_one(doc)
        
        admin_email = os.environ.get('ADMIN_EMAIL', 'info@infinitelaundrysolutions.com.au')
        
        # Send email notification to admin
        logger.info(f"Sending admin notification to: {admin_email}")
        admin_email_sent = send_email(
            admin_email,
            f"New Contact Form Submission from {form.name}",
            f"<h3>New Contact Form</h3><p><strong>Name:</strong> {form.name}</p><p><strong>Email:</strong> {form.email}</p><p><strong>Phone:</strong> {form.phone}</p><p><strong>Message:</strong> {form.message}</p>"
        )
        logger.info(f"Admin email sent: {admin_email_sent}")
        
        # Send confirmation email to customer
        customer_email_body = f"""
        <h2>Thank You for Contacting Us!</h2>
        <p>Dear {form.name},</p>
        <p>We have received your inquiry and our team will get back to you shortly.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Message Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666;">Name:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{form.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Email:</td>
                    <td style="padding: 8px 0;">{form.email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Phone:</td>
                    <td style="padding: 8px 0;">{form.phone}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; vertical-align: top;">Message:</td>
                    <td style="padding: 8px 0; white-space: pre-line;">{form.message}</td>
                </tr>
            </table>
        </div>
        
        <p>We typically respond within 24 hours during business hours:</p>
        <ul>
            <li><strong>Monday - Friday:</strong> 7:00 AM - 8:00 PM</li>
            <li><strong>Saturday:</strong> 8:00 AM - 6:00 PM</li>
            <li><strong>Sunday:</strong> 9:00 AM - 5:00 PM</li>
        </ul>
        
        <p>For urgent inquiries, please call us at <strong>+61 426 159 286</strong></p>
        
        <p>Thank you for choosing Infinite Laundry Solutions!</p>
        
        <p style="margin-top: 30px;">
            <strong>Infinite Laundry Solutions</strong><br/>
            3/76 Mica Street, Carole Park, QLD, 4300<br/>
            📞 +61 426 159 286<br/>
            📧 info@infinitelaundrysolutions.com.au
        </p>
        """
        
        logger.info(f"Sending customer confirmation to: {form.email}")
        customer_email_sent = send_email(
            form.email,
            "Thank You for Contacting Infinite Laundry Solutions",
            customer_email_body
        )
        logger.info(f"Customer email sent: {customer_email_sent}")
        
        return {
            "message": "Contact form submitted successfully",
            "admin_email_sent": admin_email_sent,
            "customer_email_sent": customer_email_sent
        }
    except Exception as e:
        logger.error(f"Error in contact form submission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process contact form: {str(e)}")

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Export the socket app as the main app for uvicorn
# This ensures Socket.io integration works properly
main_app = socket_app

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Socket.io Event Handlers
@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to Clienty server'}, to=sid)

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    """Join a room based on user_id for targeted notifications"""
    user_id = data.get('user_id')
    if user_id:
        sio.enter_room(sid, user_id)
        logging.info(f"Client {sid} joined room {user_id}")
        await sio.emit('room_joined', {'room': user_id}, to=sid)

# Scheduled Tasks
async def lock_orders_job():
    """Lock orders that are 8 hours before delivery date (only for customers)"""
    try:
        current_time = datetime.now(timezone.utc)
        lock_threshold = current_time + timedelta(hours=8)
        
        # Find orders that need to be locked (delivery date is within 8 hours)
        orders_to_lock = await db.orders.find({
            "is_locked": {"$ne": True},
            "delivery_date": {"$exists": True},
            "status": {"$nin": ["ready_for_pickup", "delivered", "cancelled"]}
        }).to_list(length=None)
        
        locked_count = 0
        for order in orders_to_lock:
            try:
                # Parse delivery date (could be date or datetime string)
                delivery_date_str = order.get('delivery_date', '')
                if not delivery_date_str:
                    continue
                
                # Try parsing as datetime first, then as date
                try:
                    delivery_datetime = datetime.fromisoformat(delivery_date_str.replace('Z', '+00:00'))
                except:
                    # If it's just a date string (YYYY-MM-DD), assume midnight
                    delivery_date = datetime.strptime(delivery_date_str, '%Y-%m-%d')
                    delivery_datetime = delivery_date.replace(tzinfo=timezone.utc)
                
                # Lock if current time is 8 hours or less before delivery
                if current_time >= (delivery_datetime - timedelta(hours=8)):
                    await db.orders.update_one(
                        {"id": order["id"]},
                        {
                            "$set": {
                                "is_locked": True,
                                "locked_at": current_time.isoformat()
                            }
                        }
                    )
                    
                    # Send notifications
                    await notify_order_locked(order)
                    locked_count += 1
            except Exception as e:
                logging.error(f"Error locking order {order.get('id')}: {str(e)}")
                continue
            
        if locked_count > 0:
            logging.info(f"Locked {locked_count} orders (8 hours before delivery)")
    except Exception as e:
        logging.error(f"Error in lock_orders_job: {str(e)}")

async def generate_recurring_orders_job():
    """Generate recurring orders based on schedule"""
    try:
        current_date = datetime.now(timezone.utc).date()
        
        # Find recurring orders that need to be generated
        # ONLY include orders that are NOT cancelled/deleted and have valid status
        recurring_orders = await db.orders.find({
            "is_recurring": True,
            "next_occurrence_date": current_date.isoformat(),
            "status": {"$nin": ["cancelled", "deleted"]},  # Exclude cancelled/deleted orders
            "total_amount": {"$gt": 0}  # Must have valid pricing
        }).to_list(length=None)
        
        generated_count = 0
        failed_count = 0
        
        for template_order in recurring_orders:
            # Create new order based on template with validation
            result = await create_order_from_template(template_order)
            if result:
                generated_count += 1
            else:
                failed_count += 1
            
        if generated_count > 0:
            logging.info(f"Generated {generated_count} recurring orders successfully")
        if failed_count > 0:
            logging.warning(f"Failed to generate {failed_count} recurring orders (validation failed)")
    except Exception as e:
        logging.error(f"Error in generate_recurring_orders_job: {str(e)}")

# Notification Helper Functions
async def notify_order_locked(order):
    """Send notifications when an order is locked"""
    try:
        # Get all owners and admins
        owners = await db.users.find({"role": "owner"}).to_list(length=None)
        admins = await db.users.find({"role": "admin"}).to_list(length=None)
        
        # Get customer
        customer = await db.users.find_one({"id": order["customer_id"]})
        
        notification_message = f"Order #{order['order_number']} has been automatically locked as delivery is scheduled within 8 hours. Contact us if you need to make changes."
        
        # Notify customer
        if customer:
            await send_notification(
                user_id=customer['id'],
                email=customer['email'],
                title="Order Locked",
                message=notification_message,
                notif_type="order_locked"
            )
        
        # Notify owners and admins
        for user in owners + admins:
            await send_notification(
                user_id=user['id'],
                email=user['email'],
                title="Order Locked",
                message=notification_message,
                notif_type="order_locked"
            )
    except Exception as e:
        logging.error(f"Error in notify_order_locked: {str(e)}")

async def send_notification(user_id: str, email: str, title: str, message: str, notif_type: str):
    """Send socket and database notifications (email handled separately with proper templates)"""
    try:
        # Store notification in database
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type
        )
        doc = notif.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.notifications.insert_one(doc)
        
        # Send socket notification (real-time in-app notification)
        await sio.emit('notification', {
            'id': notif.id,
            'title': title,
            'message': message,
            'type': notif_type,
            'created_at': doc['created_at']
        }, room=user_id)
        
        # Email notifications are now handled separately with proper templates
        # Do not send generic emails here
    except Exception as e:
        logging.error(f"Error in send_notification: {str(e)}")

async def create_order_from_template(template_order):
    """Create a new order from a recurring order template with comprehensive validation"""
    try:
        # VALIDATION 1: Check if template order has valid pricing
        if not template_order.get('total_amount') or template_order['total_amount'] <= 0:
            logging.error(f"Refusing to create recurring order from template {template_order.get('order_number')} - Invalid pricing: ${template_order.get('total_amount', 0)}")
            return None
        
        # VALIDATION 2: Check if template order has items
        if not template_order.get('items') or len(template_order['items']) == 0:
            logging.error(f"Refusing to create recurring order from template {template_order.get('order_number')} - No items")
            return None
        
        # VALIDATION 3: Check if template is cancelled or deleted
        if template_order.get('status') in ['cancelled', 'deleted']:
            logging.warning(f"Skipping recurring order generation from {template_order.get('order_number')} - Template is {template_order.get('status')}")
            return None
        
        # VALIDATION 4: Check if customer still exists
        customer = await db.users.find_one({"id": template_order['customer_id']})
        if not customer:
            logging.error(f"Refusing to create recurring order from template {template_order.get('order_number')} - Customer not found")
            return None
        
        # VALIDATION 5: Calculate next delivery date (must be in the future)
        recurrence = template_order.get('recurrence_pattern', {})
        frequency_type = recurrence.get('frequency_type')
        frequency_value = recurrence.get('frequency_value', 1)
        
        if not frequency_type:
            logging.error(f"Refusing to create recurring order from template {template_order.get('order_number')} - No frequency type")
            return None
        
        # Calculate next occurrence date
        current_next_date = datetime.fromisoformat(template_order['next_occurrence_date'])
        if frequency_type == 'daily':
            next_delivery_date = current_next_date + timedelta(days=frequency_value)
        elif frequency_type == 'weekly':
            next_delivery_date = current_next_date + timedelta(weeks=frequency_value)
        elif frequency_type == 'monthly':
            next_delivery_date = current_next_date + timedelta(days=30 * frequency_value)
        else:
            logging.error(f"Refusing to create recurring order - Invalid frequency type: {frequency_type}")
            return None
        
        # Calculate pickup date (2 days before delivery)
        next_pickup_date = next_delivery_date - timedelta(days=2)
        
        # VALIDATION 6: Ensure delivery date is in the future
        if next_delivery_date.date() <= datetime.now(timezone.utc).date():
            logging.error(f"Refusing to create recurring order from template {template_order.get('order_number')} - Delivery date is in the past: {next_delivery_date.date()}")
            # Update next occurrence to skip this date
            await db.orders.update_one(
                {"id": template_order['id']},
                {"$set": {"next_occurrence_date": next_delivery_date.date().isoformat()}}
            )
            return None
        
        # Generate unique order number
        order_number = await get_next_order_number()
        
        # Calculate pricing with GST
        total_amount = template_order['total_amount']
        gst_amount = total_amount * 0.10
        total_with_gst = total_amount + gst_amount
        
        # Create new order with proper validation
        new_order = Order(
            customer_id=template_order['customer_id'],
            customer_name=template_order['customer_name'],
            customer_email=template_order['customer_email'],
            items=template_order['items'],
            pickup_date=next_pickup_date.date().isoformat(),
            delivery_date=next_delivery_date.date().isoformat(),
            pickup_address=template_order['pickup_address'],
            delivery_address=template_order['delivery_address'],
            special_instructions=template_order.get('special_instructions'),
            order_number=order_number,
            total_amount=total_amount,
            gst_amount=gst_amount,
            total_with_gst=total_with_gst,
            created_by='system_recurring',
            is_recurring=False,  # The generated order is not recurring itself
            parent_recurring_id=template_order['id']  # Link to parent template
        )
        
        doc = new_order.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        doc['is_locked'] = False
        await db.orders.insert_one(doc)
        
        # Update next occurrence date in template
        await db.orders.update_one(
            {"id": template_order['id']},
            {"$set": {
                "next_occurrence_date": next_delivery_date.date().isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logging.info(f"✅ Successfully created recurring order {order_number} from template {template_order.get('order_number')} - Delivery: {next_delivery_date.date()}, Total: ${total_with_gst:.2f}")
        
        # Send notification to customer
        if customer:
            await send_notification(
                user_id=customer['id'],
                email=customer['email'],
                title="Recurring Order Generated",
                message=f"Your recurring order #{order_number} has been automatically created for delivery on {next_delivery_date.strftime('%B %d, %Y')}. Total: ${total_with_gst:.2f}",
                notif_type="order_created"
            )
        
        return new_order
        
    except Exception as e:
        logging.error(f"Error in create_order_from_template for {template_order.get('order_number')}: {str(e)}")
        return None

# Application Lifecycle Events
@app.on_event("startup")
async def startup_event():
    logging.info("Starting up Clienty server...")
    
    # Start the scheduler
    scheduler.start()
    
    # Schedule the order locking job (runs every hour)
    scheduler.add_job(
        lock_orders_job,
        IntervalTrigger(hours=1),
        id='lock_orders',
        replace_existing=True
    )
    
    # Schedule recurring orders job (runs daily at midnight)
    scheduler.add_job(
        generate_recurring_orders_job,
        CronTrigger(hour=0, minute=0),
        id='generate_recurring_orders',
        replace_existing=True
    )
    
    logging.info("Scheduler started with jobs: lock_orders, generate_recurring_orders")

@app.on_event("shutdown")
async def shutdown_event():
    logging.info("Shutting down Clienty server...")
    scheduler.shutdown()
    logging.info("Scheduler stopped")
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()