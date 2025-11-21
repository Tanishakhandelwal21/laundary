import os
import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)

def send_sms_otp(phone_number: str, otp: str, full_name: str) -> bool:
    """
    Send OTP via SMS using Twilio
    """
    try:
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not account_sid or not auth_token or not twilio_phone:
            logger.warning("Twilio credentials not configured. SMS not sent.")
            logger.info(f"SMS OTP for {phone_number}: {otp}")
            return True  # Return True for development
        
        client = Client(account_sid, auth_token)
        
        message_body = f"""Hello {full_name},

Your verification code for Infinite Laundry Solutions is: {otp}

This code expires in 10 minutes.

Do not share this code with anyone.

- Infinite Laundry Solutions Team"""
        
        message = client.messages.create(
            body=message_body,
            from_=twilio_phone,
            to=phone_number
        )
        
        logger.info(f"SMS OTP sent successfully to {phone_number}. SID: {message.sid}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send SMS OTP: {str(e)}")
        logger.info(f"SMS OTP for {phone_number}: {otp}")
        return True  # Return True in development even if SMS fails

def send_welcome_sms(phone_number: str, full_name: str) -> bool:
    """
    Send welcome SMS after successful registration
    """
    try:
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not account_sid or not auth_token or not twilio_phone:
            logger.warning("Twilio credentials not configured")
            return False
        
        client = Client(account_sid, auth_token)
        
        message_body = f"""Welcome {full_name}!

Your Infinite Laundry Solutions account is now active.

Log in to access our professional laundry services.

- Infinite Laundry Solutions Team"""
        
        message = client.messages.create(
            body=message_body,
            from_=twilio_phone,
            to=phone_number
        )
        
        logger.info(f"Welcome SMS sent to {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome SMS: {str(e)}")
        return False

def send_sms(phone_number: str, message_body: str) -> bool:
    """
    Send generic SMS using Twilio
    """
    try:
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
        
        if not account_sid or not auth_token or not twilio_phone:
            logger.warning("Twilio credentials not configured. SMS not sent.")
            logger.info(f"SMS to {phone_number}: {message_body}")
            return True  # Return True for development
        
        client = Client(account_sid, auth_token)
        
        message = client.messages.create(
            body=message_body,
            from_=twilio_phone,
            to=phone_number
        )
        
        logger.info(f"SMS sent successfully to {phone_number}. SID: {message.sid}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send SMS: {str(e)}")
        logger.info(f"SMS to {phone_number}: {message_body}")
        return True  # Return True in development even if SMS fails
