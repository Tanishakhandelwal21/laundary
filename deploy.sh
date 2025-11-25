#!/bin/bash
# Deployment Script for Price Update Fix
# This script deploys the updated files and rebuilds services

set -e  # Exit on error

echo "============================================"
echo "Deploying Price Update Fix"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server info
SERVER_USER="root"
SERVER_IP="157.173.218.172"
FRONTEND_PATH="/var/www/infinitelaundrysolutions/frontend"
BACKEND_PATH="/var/www/infinitelaundrysolutions/backend"

echo -e "${YELLOW}Deploying to server: ${SERVER_IP}${NC}"

# Function to upload and process
deploy() {
    echo -e "${YELLOW}[1/5] Uploading backend files...${NC}"
    scp -r backend/server.py ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/
    
    echo -e "${YELLOW}[2/5] Uploading frontend files...${NC}"
    scp -r frontend_backup_2025-11-19_22-21-36/src/pages/CustomerDashboard.js ${SERVER_USER}@${SERVER_IP}:${FRONTEND_PATH}/src/pages/
    
    echo -e "${YELLOW}[3/5] Building frontend...${NC}"
    ssh ${SERVER_USER}@${SERVER_IP} "cd ${FRONTEND_PATH} && npm run build"
    
    echo -e "${YELLOW}[4/5] Reloading Nginx...${NC}"
    ssh ${SERVER_USER}@${SERVER_IP} "systemctl reload nginx"
    
    echo -e "${YELLOW}[5/5] Restarting backend...${NC}"
    ssh ${SERVER_USER}@${SERVER_IP} "cd ${BACKEND_PATH} && systemctl restart laundry-backend"
    
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
}

# Run deployment
deploy
