# Waste Management Server Startup Script
# This script ensures the server starts properly with MongoDB

Write-Host "🚀 Starting Waste Management Server..." -ForegroundColor Green
Write-Host ""

# Check if MongoDB is running
$mongoRunning = netstat -an | Select-String ":27017"
if (-not $mongoRunning) {
    Write-Host "⚠️  MongoDB is not running. Starting MongoDB..." -ForegroundColor Yellow
    
    # Try to start MongoDB
    $mongodPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    if (Test-Path $mongodPath) {
        Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", "C:\data\db" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB not found. Please install MongoDB first." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ MongoDB is already running" -ForegroundColor Green
}

# Kill any existing node processes
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "🔄 Stopping existing Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Change to server directory
Set-Location -Path "E:\project\WasteManagementApp\server"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🌟 Starting server with nodemon..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Start the server
npm run dev