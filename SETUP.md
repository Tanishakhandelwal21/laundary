# Environment Setup Guide

This project requires several environment files and credentials to be configured before running.

## Required Files

### 1. Backend Environment File

**Location:** `backend/.env`

Copy the example file and fill in your credentials:

```bash
cp backend/.env.example backend/.env
```

Required configurations:

- `MONGO_URL`: MongoDB connection string
- `SECRET_KEY`: Secret key for JWT tokens
- `GMAIL_USER` & `GMAIL_PASSWORD`: Email service credentials
- `GOOGLE_MAPS_API_KEY`: Google Maps API key
- `FIREBASE_SERVICE_ACCOUNT`: Path to Firebase service account JSON

### 2. Frontend Environment File

**Location:** `frontend_backup_2025-11-19_22-21-36/.env`

Copy the example file and fill in your credentials:

```bash
cp frontend_backup_2025-11-19_22-21-36/.env.example frontend_backup_2025-11-19_22-21-36/.env
```

Required configurations:

- `REACT_APP_BACKEND_URL`: Backend API URL
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `REACT_APP_FIREBASE_*`: Firebase configuration

### 3. Firebase Service Account

**Location:** `backend/laundry-196f0-firebase-adminsdk-fbsvc-a395b03897.json`

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the downloaded JSON file in the `backend/` directory
6. Update the `FIREBASE_SERVICE_ACCOUNT` path in `backend/.env`

### 4. Frontend Firebase Credentials (Optional)

**Location:** `frontend_backup_2025-11-19_22-21-36/laundry-196f0-firebase-adminsdk-fbsvc-a395b03897.json`

Same as backend Firebase credentials (if needed in frontend).

## Security Notes

⚠️ **IMPORTANT:** Never commit the following files to git:

- `.env` files
- `*firebase*.json` files (except `.example.json` files)
- `backend.log` or any log files

These files are already added to `.gitignore` for your protection.

## Getting API Keys

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps JavaScript API
4. Go to Credentials > Create Credentials > API Key
5. Copy the key to your `.env` files

### Gmail App Password (for email notifications)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Search for "App passwords"
4. Generate a new app password for "Mail"
5. Use this password in `GMAIL_PASSWORD` (not your regular password)

### MongoDB Connection

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string from "Connect" button
4. Replace `<username>`, `<password>`, and `<database>` in the connection string

## Verification

After setting up all files, verify they exist:

```bash
ls backend/.env
ls backend/laundry-196f0-firebase-adminsdk-fbsvc-a395b03897.json
ls frontend_backup_2025-11-19_22-21-36/.env
```

All files should exist before running the application.
