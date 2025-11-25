#!/usr/bin/env python3
"""
Script to permanently delete order ORD-000033 from database
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['laundry_db']

print("Deleting Order ORD-000033...")
print("=" * 60)

# Find the order first to confirm
order = db.orders.find_one({"order_number": "ORD-000033"})

if not order:
    print("❌ Order ORD-000033 not found in database")
else:
    print(f"Found order: {order['order_number']}")
    print(f"  Customer: {order.get('customer_name', 'N/A')}")
    print(f"  Status: {order.get('status', 'N/A')}")
    print(f"  Total: ${order.get('total_amount', 0):.2f}")
    print(f"  Is Recurring: {order.get('is_recurring', False)}")
    print()
    
    # Delete the order
    result = db.orders.delete_one({"order_number": "ORD-000033"})
    
    if result.deleted_count > 0:
        print("✅ Order ORD-000033 has been permanently deleted from database")
    else:
        print("❌ Failed to delete order")

print("=" * 60)
client.close()
