#!/usr/bin/env python3
"""
Script to clear old pending_approval status from orders
This removes the old workflow's pending modifications
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['laundry_db']

print("Clearing old pending approval statuses...")
print("=" * 60)

# Find all orders with old pending_approval status
orders = list(db.orders.find({
    "modification_status": "pending_approval"
}))

print(f"Found {len(orders)} orders with old pending_approval status")
print()

updated_count = 0

for order in orders:
    try:
        order_id = order.get('id')
        order_number = order.get('order_number', 'N/A')
        
        # Clear old workflow fields
        result = db.orders.update_one(
            {'id': order_id},
            {'$unset': {
                'pending_modifications': '',
                'modification_requested_at': ''
            },
            '$set': {
                'modification_status': None
            }}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"✅ {order_number}: Cleared old approval status")
        else:
            print(f"⚠️  {order_number}: Already cleared")
            
    except Exception as e:
        print(f"❌ Error updating {order.get('order_number', 'unknown')}: {e}")

print()
print("=" * 60)
print(f"Complete! Cleared {updated_count} orders")

client.close()
