# Start Both Backend and Frontend

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Waste Management Mobile - Full Stack Development Server    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get the root project directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $rootDir "server"

Write-Host "📍 Project Root: $rootDir" -ForegroundColor Yellow
Write-Host "📍 Server Dir: $serverDir" -ForegroundColor Yellow
Write-Host ""

# Check if server directory exists
if (-not (Test-Path $serverDir)) {
    Write-Host "❌ Server directory not found at: $serverDir" -ForegroundColor Red
    exit 1
}

# Check if node_modules exist in both directories
Write-Host "🔍 Checking dependencies..." -ForegroundColor Blue
if (-not (Test-Path "$serverDir\node_modules")) {
    Write-Host "⚠️  Installing server dependencies..." -ForegroundColor Yellow
    Push-Location $serverDir
    npm install
    Pop-Location
}

if (-not (Test-Path "$rootDir\node_modules")) {
    Write-Host "⚠️  Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $rootDir
    npm install
    Pop-Location
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Kill any existing processes on port 3001 and 8081
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3001 -or $_.LocalPort -eq 8081 }
foreach ($proc in $processes) {
    $process = Get-Process -Id $proc.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Killing process $($process.Name) (PID: $($process.Id))" -ForegroundColor Gray
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}

Write-Host ""
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Write-Host "   Port: 3001" -ForegroundColor Gray
Write-Host "   Location: $serverDir" -ForegroundColor Gray
Write-Host ""

# Start backend server in a new window
$backendCommand = "
cd '$serverDir'
Write-Host 'Starting Node.js server...' -ForegroundColor Green
npm start
Write-Host 'Backend server stopped' -ForegroundColor Red
Read-Host 'Press Enter to exit'
"

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -PassThru
Write-Host "✅ Backend server process started (PID: $($backendProcess.Id))" -ForegroundColor Green

# Wait for backend to start
Write-Host "⏳ Waiting for backend server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if backend is running
$backendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend server is running and responding" -ForegroundColor Green
            $backendReady = $true
            break
        }
    }
    catch {
        Write-Host "   Attempt $($i + 1)/10: Backend not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "⚠️  Backend server may not be responding. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Frontend (Expo Metro)..." -ForegroundColor Green
Write-Host "   Port: 8081" -ForegroundColor Gray
Write-Host "   Location: $rootDir" -ForegroundColor Gray
Write-Host ""

# Start frontend
Push-Location $rootDir
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📱 Expo Metro Bundler Starting..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

npx expo start --tunnel

Pop-Location
