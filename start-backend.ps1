# Waste Management App - Backend Startup Script
# This script starts MongoDB and the Node.js backend server

Write-Host "========================================" -ForegroundColor Green
Write-Host "Waste Management App - Backend Startup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if MongoDB is already running
$mongoRunning = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoRunning) {
    Write-Host "✅ MongoDB is already running (PID: $($mongoRunning.Id))" -ForegroundColor Yellow
} else {
    Write-Host "Starting MongoDB..." -ForegroundColor Cyan
    Start-Process mongod -ArgumentList "--dbpath E:\project\WasteManagementApp\mongodb-data" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verify MongoDB started
    $mongoCheck = Get-Process mongod -ErrorAction SilentlyContinue
    if ($mongoCheck) {
        Write-Host "✅ MongoDB started successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start MongoDB. Please check if MongoDB is installed." -ForegroundColor Red
        exit 1
    }
}

# Check if Node server is already running
$nodeRunning = netstat -an | findstr :3000 | findstr LISTENING
if ($nodeRunning) {
    Write-Host "⚠️  Server already running on port 3000. Stopping it first..." -ForegroundColor Yellow
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Starting backend server..." -ForegroundColor Cyan
Set-Location -Path "E:\project\WasteManagementApp\server"
Start-Process node -ArgumentList "index.js" -WindowStyle Hidden

Start-Sleep -Seconds 3

# Test server health
Write-Host "Testing server health..." -ForegroundColor Cyan
try {
    $health = Invoke-WebRequest -Uri "http://192.168.29.93:3000/api/health" -Method GET -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    
    if ($healthData.status -eq "healthy") {
        Write-Host "✅ Server is healthy!" -ForegroundColor Green
        Write-Host "   - Server: $($healthData.server)" -ForegroundColor Gray
        Write-Host "   - Database: $($healthData.database)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Server is running but unhealthy" -ForegroundColor Yellow
        Write-Host "   - Database: $($healthData.database)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to connect to server. Please check the logs." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend Services Status:" -ForegroundColor Green
Write-Host "  MongoDB:    http://localhost:27017" -ForegroundColor Cyan
Write-Host "  API Server: http://192.168.29.93:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Yellow
Write-Host "  Citizen: citizen@demo.com / demo123" -ForegroundColor Gray
Write-Host "  Worker:  worker@demo.com / demo123" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the services" -ForegroundColor Gray
