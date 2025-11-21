import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🌱 Seeding database: {db_name}")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.skus.delete_many({})
    await db.orders.delete_many({})
    await db.cases.delete_many({})
    await db.deliveries.delete_many({})
    await db.notifications.delete_many({})
    await db.contacts.delete_many({})
    await db.frequency_templates.delete_many({})
    await db.customer_pricing.delete_many({})
    print("✅ Cleared existing data")
    
    # Create demo users
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "owner@clienty.com",
            "password": pwd_context.hash("owner123"),
            "full_name": "John Smith",
            "role": "owner",
            "phone": "+61 400 123 456",
            "address": "123 Business St, Sydney NSW 2000",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "admin@clienty.com",
            "password": pwd_context.hash("admin123"),
            "full_name": "Sarah Johnson",
            "role": "admin",
            "phone": "+61 400 234 567",
            "address": "456 Admin Ave, Melbourne VIC 3000",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "customer@clienty.com",
            "password": pwd_context.hash("customer123"),
            "full_name": "Michael Chen",
            "role": "customer",
            "phone": "+61 400 345 678",
            "address": "789 Customer Rd, Brisbane QLD 4000",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(users)
    print(f"✅ Created {len(users)} demo users")
    print("   - owner@clienty.com / owner123")
    print("   - admin@clienty.com / admin123")
    print("   - customer@clienty.com / customer123")
    
    # Create SKUs
    skus = [
        {
            "id": str(uuid.uuid4()),
            "name": "Shirt - Wash & Fold",
            "category": "Clothing",
            "price": 5.00,
            "unit": "per item",
            "description": "Professional wash, dry, and fold service for shirts",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pants - Wash & Fold",
            "category": "Clothing",
            "price": 7.00,
            "unit": "per item",
            "description": "Professional wash, dry, and fold service for pants",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Suit - Dry Clean",
            "category": "Dry Cleaning",
            "price": 25.00,
            "unit": "per item",
            "description": "Professional dry cleaning for suits",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dress - Dry Clean",
            "category": "Dry Cleaning",
            "price": 20.00,
            "unit": "per item",
            "description": "Professional dry cleaning for dresses",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bedding Set - Wash",
            "category": "Household",
            "price": 30.00,
            "unit": "per set",
            "description": "Complete wash and fold for bedding sets",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Curtains - Dry Clean",
            "category": "Household",
            "price": 35.00,
            "unit": "per pair",
            "description": "Professional dry cleaning for curtains",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ironing Service",
            "category": "Services",
            "price": 3.00,
            "unit": "per item",
            "description": "Professional ironing service",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.skus.insert_many(skus)
    print(f"✅ Created {len(skus)} SKU items")
    
    # Create Frequency Templates
    frequency_templates = [
        {
            "id": str(uuid.uuid4()),
            "name": "Daily Pickup",
            "frequency_type": "daily",
            "frequency_value": 1,
            "description": "Pickup every day",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Weekly Service",
            "frequency_type": "weekly",
            "frequency_value": 1,
            "description": "Once a week service",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bi-Weekly Service",
            "frequency_type": "weekly",
            "frequency_value": 2,
            "description": "Every two weeks",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Monthly Service",
            "frequency_type": "monthly",
            "frequency_value": 1,
            "description": "Once a month",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bi-Monthly Service",
            "frequency_type": "monthly",
            "frequency_value": 2,
            "description": "Every two months",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.frequency_templates.insert_many(frequency_templates)
    print(f"✅ Created {len(frequency_templates)} frequency templates")
    
    print("\n🎉 Database seeding completed successfully!")
    print("\n📝 Next steps:")
    print("   1. Restart the backend: sudo supervisorctl restart backend")
    print("   2. Open the application and login with demo credentials")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
