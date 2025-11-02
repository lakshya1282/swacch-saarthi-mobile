# Network Configuration Checker
# Verifies that IP configuration matches and server is accessible

Write-Host "🔍 Checking Network Configuration..." -ForegroundColor Cyan
Write-Host ""

# 1. Check current IP
Write-Host "1. Checking Current Network IP" -ForegroundColor Yellow
Write-Host "   ----------------------------" -ForegroundColor DarkGray
$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "   Current IP: " -NoNewline
Write-Host $currentIP -ForegroundColor Green
Write-Host ""

# 2. Check configured IP
Write-Host "2. Checking Configured IP" -ForegroundColor Yellow
Write-Host "   ------------------------" -ForegroundColor DarkGray
$configFile = "src/config/env.ts"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    if ($configContent -match "DEFAULT_API_HOST = '([^']+)'") {
        $configuredIP = $matches[1]
        Write-Host "   Configured IP: " -NoNewline
        Write-Host $configuredIP -ForegroundColor Cyan
        
        if ($configContent -match "DEFAULT_API_PORT = '([^']+)'") {
            $configuredPort = $matches[1]
            Write-Host "   Configured Port: " -NoNewline
            Write-Host $configuredPort -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "   ❌ Config file not found!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Compare IPs
Write-Host "3. IP Comparison" -ForegroundColor Yellow
Write-Host "   ---------------" -ForegroundColor DarkGray
if ($currentIP -eq $configuredIP) {
    Write-Host "   ✅ IP addresses match!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  IP MISMATCH DETECTED!" -ForegroundColor Red
    Write-Host "   Current:    $currentIP" -ForegroundColor Yellow
    Write-Host "   Configured: $configuredIP" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Action needed: Update src/config/env.ts with your current IP" -ForegroundColor Magenta
}
Write-Host ""

# 4. Check if backend server is running
Write-Host "4. Checking Backend Server" -ForegroundColor Yellow
Write-Host "   ------------------------" -ForegroundColor DarkGray

# Check for Node processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Node.js processes found: $($nodeProcesses.Count)" -ForegroundColor Green
} else {
    Write-Host "   ❌ No Node.js processes running" -ForegroundColor Red
}

# Check if port is listening
$port = if ($configuredPort) { $configuredPort } else { "3001" }
$listeningPort = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($listeningPort) {
    Write-Host "   ✅ Port $port is listening" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port $port is NOT listening" -ForegroundColor Red
    Write-Host "   Action needed: Start the backend server" -ForegroundColor Magenta
}
Write-Host ""

# 5. Test server connectivity
Write-Host "5. Testing Server Connectivity" -ForegroundColor Yellow
Write-Host "   ----------------------------" -ForegroundColor DarkGray

$testUrls = @(
    "http://$configuredIP`:$port",
    "http://$configuredIP`:$port/api/health",
    "http://localhost:$port",
    "http://localhost:$port/api/health"
)

foreach ($url in $testUrls) {
    Write-Host "   Testing: $url" -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "      ✅ Success (200 OK)" -ForegroundColor Green
        } else {
            Write-Host "      ⚠️  Response: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*Cannot GET*") {
            Write-Host "      ✅ Server responding (endpoint exists)" -ForegroundColor Green
        } else {
            Write-Host "      ❌ Failed: $($errorMsg.Split("`n")[0])" -ForegroundColor Red
        }
    }
}
Write-Host ""

# 6. Summary
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor DarkGray

$issues = @()
if ($currentIP -ne $configuredIP) {
    $issues += "IP mismatch - update src/config/env.ts"
}
if (-not $listeningPort) {
    $issues += "Backend server not running on port $port"
}

if ($issues.Count -eq 0) {
    Write-Host "   ✅ All checks passed! Ready to connect." -ForegroundColor Green
    Write-Host ""
    Write-Host "   Next step: Run the mobile app" -ForegroundColor Cyan
    Write-Host "   Command: " -NoNewline
    Write-Host "npx expo start" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠️  Issues found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "      • $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "   📖 See NETWORK_CONFIGURATION.md for help" -ForegroundColor Cyan
}
Write-Host ""
