#!/usr/bin/env python3
"""
Migration script to add gst_amount and total_with_gst fields to existing orders
Run this once to update all existing orders with the new pricing fields
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['laundry_db']

print("Starting migration to add GST fields to existing orders...")
print("=" * 60)

# Find all orders that don't have the new fields
orders = list(db.orders.find({
    "$or": [
        {"gst_amount": {"$exists": False}},
        {"total_with_gst": {"$exists": False}}
    ]
}))

print(f"Found {len(orders)} orders needing migration")
print()

updated_count = 0
error_count = 0

for order in orders:
    try:
        order_id = order.get('id')
        order_number = order.get('order_number', 'N/A')
        total_amount = order.get('total_amount', 0)
        
        # Calculate GST fields
        gst_amount = total_amount * 0.10
        total_with_gst = total_amount + gst_amount
        
        # Update the order
        result = db.orders.update_one(
            {'id': order_id},
            {'$set': {
                'gst_amount': gst_amount,
                'total_with_gst': total_with_gst
            }}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"✅ {order_number}: Base ${total_amount:.2f} → GST ${gst_amount:.2f} → Total ${total_with_gst:.2f}")
        else:
            print(f"⚠️  {order_number}: Already up to date")
            
    except Exception as e:
        error_count += 1
        print(f"❌ Error updating {order.get('order_number', 'unknown')}: {e}")

print()
print("=" * 60)
print(f"Migration complete!")
print(f"  ✅ Updated: {updated_count} orders")
print(f"  ❌ Errors: {error_count} orders")
print(f"  📊 Total processed: {len(orders)} orders")

client.close()
