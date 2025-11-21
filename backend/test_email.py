#!/usr/bin/env python3
"""
Test script to verify email configuration
Run this on your server to test if emails are working
"""
import os
from dotenv import load_dotenv
from utils.email_service import send_email

# Load environment variables
load_dotenv()

def test_email():
    print("=" * 60)
    print("Testing Email Configuration")
    print("=" * 60)
    
    # Check environment variables
    gmail_user = os.environ.get('GMAIL_USER')
    gmail_password = os.environ.get('GMAIL_PASSWORD')
    admin_email = os.environ.get('ADMIN_EMAIL')
    
    print(f"\nEnvironment Variables:")
    print(f"GMAIL_USER: {gmail_user}")
    print(f"GMAIL_PASSWORD: {'*' * len(gmail_password) if gmail_password else 'NOT SET'}")
    print(f"ADMIN_EMAIL: {admin_email}")
    
    if not gmail_user or not gmail_password:
        print("\n❌ ERROR: Gmail credentials not configured!")
        print("Make sure GMAIL_USER and GMAIL_PASSWORD are set in .env file")
        return False
    
    print("\n" + "=" * 60)
    print("Test 1: Sending email to admin")
    print("=" * 60)
    
    admin_result = send_email(
        to_email=admin_email or "info@infinitelaundrysolutions.com.au",
        subject="Test Email - Contact Form Admin Notification",
        html_content="""
        <h3>Test Contact Form Submission</h3>
        <p><strong>Name:</strong> Test User</p>
        <p><strong>Email:</strong> test@example.com</p>
        <p><strong>Phone:</strong> +61 400 000 000</p>
        <p><strong>Message:</strong> This is a test message to verify the contact form email notifications are working correctly.</p>
        """
    )
    
    if admin_result:
        print(f"✅ Admin email sent successfully to {admin_email}")
    else:
        print(f"❌ Failed to send admin email to {admin_email}")
    
    print("\n" + "=" * 60)
    print("Test 2: Sending confirmation email to customer")
    print("=" * 60)
    
    test_customer_email = input("Enter test customer email (or press Enter to use bharat7954@gmail.com): ").strip()
    if not test_customer_email:
        test_customer_email = "bharat7954@gmail.com"
    
    customer_result = send_email(
        to_email=test_customer_email,
        subject="Thank You for Contacting Infinite Laundry Solutions",
        html_content="""
        <h2>Thank You for Contacting Us!</h2>
        <p>Dear Test User,</p>
        <p>We have received your inquiry and our team will get back to you shortly.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Message Details:</h3>
            <p><strong>Name:</strong> Test User</p>
            <p><strong>Email:</strong> test@example.com</p>
            <p><strong>Phone:</strong> +61 400 000 000</p>
            <p><strong>Message:</strong> This is a test message.</p>
        </div>
        
        <p>Thank you for choosing Infinite Laundry Solutions!</p>
        """
    )
    
    if customer_result:
        print(f"✅ Customer email sent successfully to {test_customer_email}")
    else:
        print(f"❌ Failed to send customer email to {test_customer_email}")
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Admin Email: {'✅ SUCCESS' if admin_result else '❌ FAILED'}")
    print(f"Customer Email: {'✅ SUCCESS' if customer_result else '❌ FAILED'}")
    
    if admin_result and customer_result:
        print("\n🎉 All email tests passed! Contact form emails are working correctly.")
        return True
    else:
        print("\n⚠️  Some email tests failed. Check the error messages above.")
        return False

if __name__ == "__main__":
    test_email()
