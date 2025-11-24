# Deployment Script for Price Update Fix
# PowerShell version for Windows

# Server configuration
$SERVER_USER = "root"
$SERVER_IP = "157.173.218.172"
$FRONTEND_PATH = "/var/www/infinitelaundrysolutions/frontend"
$BACKEND_PATH = "/var/www/infinitelaundrysolutions/backend"
$LOCAL_BACKEND = "d:\Internship\swafinix\laundary\backend\server.py"
$LOCAL_FRONTEND = "d:\Internship\swafinix\laundary\frontend_backup_2025-11-19_22-21-36\src\pages\CustomerDashboard.js"

Write-Host "============================================"
Write-Host "Deploying Price Update Fix" 
Write-Host "============================================"
Write-Host ""

# Step 1: Upload backend
Write-Host "[1/5] Uploading backend file..." -ForegroundColor Yellow
if (Test-Path $LOCAL_BACKEND) {
    scp "$LOCAL_BACKEND" "$SERVER_USER@$SERVER_IP`:$BACKEND_PATH/server.py"
    Write-Host "[OK] Backend uploaded" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend file not found: $LOCAL_BACKEND" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Upload frontend
Write-Host "[2/5] Uploading frontend file..." -ForegroundColor Yellow
if (Test-Path $LOCAL_FRONTEND) {
    scp "$LOCAL_FRONTEND" "$SERVER_USER@$SERVER_IP`:$FRONTEND_PATH/src/pages/CustomerDashboard.js"
    Write-Host "[OK] Frontend uploaded" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Frontend file not found: $LOCAL_FRONTEND" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Build frontend
Write-Host "[3/5] Building frontend..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_IP" "source ~/.nvm/nvm.sh; cd $FRONTEND_PATH && npm run build"
Write-Host "[OK] Frontend built" -ForegroundColor Green

Write-Host ""

# Step 4: Reload Nginx
Write-Host "[4/5] Reloading Nginx..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_IP" "systemctl reload nginx"
Write-Host "[OK] Nginx reloaded" -ForegroundColor Green

Write-Host ""

# Step 5: Restart backend
Write-Host "[5/5] Restarting backend..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_IP" "systemctl restart laundry-backend"
Write-Host "[OK] Backend restarted" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes deployed:" -ForegroundColor Cyan
Write-Host "  * Backend: server.py updated"
Write-Host "  * Frontend: CustomerDashboard.js updated"
Write-Host "  * Frontend: Rebuilt and deployed"
Write-Host "  * Services: Reloaded and restarted"
Write-Host ""
Write-Host "Verify at: http://157.173.218.172" -ForegroundColor Yellow
