# Restart Mobile App with Fresh Configuration
# This script restarts the Expo/React Native app with cleared cache

Write-Host "🔄 Restarting Mobile App with Fresh Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check current IP
Write-Host "📡 Checking current network IP..." -ForegroundColor Yellow
$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "✅ Current IP: $currentIP" -ForegroundColor Green

# Check if IP matches configuration
$configFile = "src/config/env.ts"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    if ($configContent -match "DEFAULT_API_HOST = '([^']+)'") {
        $configuredIP = $matches[1]
        Write-Host "⚙️  Configured IP: $configuredIP" -ForegroundColor Yellow
        
        if ($currentIP -ne $configuredIP) {
            Write-Host "⚠️  WARNING: IP mismatch detected!" -ForegroundColor Red
            Write-Host "   Your current IP ($currentIP) doesn't match the configured IP ($configuredIP)" -ForegroundColor Red
            Write-Host "   Update src/config/env.ts if you changed networks" -ForegroundColor Yellow
            Write-Host ""
            $continue = Read-Host "Continue anyway? (y/n)"
            if ($continue -ne "y") {
                Write-Host "❌ Cancelled" -ForegroundColor Red
                exit
            }
        } else {
            Write-Host "✅ IP configuration matches!" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "🧹 Clearing cache and restarting..." -ForegroundColor Yellow

# Kill any existing Expo/Metro processes
Write-Host "Stopping existing processes..." -ForegroundColor Gray
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like "*Metro*" -or $_.Path -like "*expo*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear watchman (if installed)
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    Write-Host "Clearing watchman..." -ForegroundColor Gray
    watchman watch-del-all 2>$null
}

# Clear Metro bundler cache
Write-Host "Clearing Metro cache..." -ForegroundColor Gray
if (Test-Path ".\.expo") {
    Remove-Item -Recurse -Force ".\.expo" -ErrorAction SilentlyContinue
}

# Clear node_modules cache (optional, uncomment if needed)
# Write-Host "Clearing node_modules cache..." -ForegroundColor Gray
# if (Test-Path ".\node_modules\.cache") {
#     Remove-Item -Recurse -Force ".\node_modules\.cache" -ErrorAction SilentlyContinue
# }

Write-Host ""
Write-Host "🚀 Starting Expo with cleared cache..." -ForegroundColor Green
Write-Host ""

# Start Expo with cleared cache
npx expo start --clear

# Note: The script will continue running as npx expo start takes over
