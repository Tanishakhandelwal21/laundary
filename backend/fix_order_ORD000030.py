#!/usr/bin/env python3
"""
Fix order ORD-000030 - recalculate total_amount from items
This order has incorrect total_amount ($120) when it should be $360 (3 x $120)
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['laundry_db']

# Find the order
order = db.orders.find_one({'id': 'ORD-000030'})

if not order:
    print("Order ORD-000030 not found!")
    exit(1)

print(f"Order ID: {order['id']}")
print(f"Order Number: {order.get('order_number')}")
print(f"Current total_amount: ${order.get('total_amount', 0)}")
print(f"Items: {order.get('items')}")

# Recalculate total from items
items = order.get('items', [])
calculated_total = sum(item.get('price', 0) * item.get('quantity', 1) for item in items)

print(f"\nCalculated total from items: ${calculated_total}")

if calculated_total != order.get('total_amount'):
    print(f"\n⚠️  Mismatch detected!")
    print(f"Database has: ${order.get('total_amount')}")
    print(f"Should be: ${calculated_total}")
    
    response = input("\nDo you want to fix this? (yes/no): ")
    
    if response.lower() == 'yes':
        # Update the order
        result = db.orders.update_one(
            {'id': 'ORD-000030'},
            {'$set': {'total_amount': calculated_total}}
        )
        
        if result.modified_count > 0:
            print(f"\n✅ Order updated successfully!")
            print(f"Total amount changed from ${order.get('total_amount')} to ${calculated_total}")
        else:
            print("\n❌ Failed to update order")
    else:
        print("\nNo changes made.")
else:
    print("\n✅ Total amount is already correct!")

client.close()
