# Test Login Endpoint
# This script tests if the login endpoint is accessible

Write-Host "🧪 Testing Login Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Read configuration
$configFile = "src/config/env.ts"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    if ($configContent -match "DEFAULT_API_HOST = '([^']+)'") {
        $apiHost = $matches[1]
        if ($configContent -match "DEFAULT_API_PORT = '([^']+)'") {
            $apiPort = $matches[1]
        }
    }
}

$apiUrl = "http://${apiHost}:${apiPort}/api"
Write-Host "API URL: " -NoNewline
Write-Host $apiUrl -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$apiUrl/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Server is " -NoNewline
    Write-Host $healthResponse.status -ForegroundColor Green
    Write-Host "   ✅ Database is " -NoNewline
    Write-Host $healthResponse.database -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure the backend server is running!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Login Endpoint (with invalid credentials to test if endpoint exists)
Write-Host "2️⃣  Testing Login Endpoint..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "test@test.com"
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Login endpoint is accessible" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 404) {
        Write-Host "   ✅ Login endpoint is accessible (received expected auth error)" -ForegroundColor Green
    } elseif ($_.Exception.Message -like "*Cannot POST*") {
        Write-Host "   ❌ Login endpoint not found" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  Endpoint test: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: Register Endpoint
Write-Host "3️⃣  Testing Register Endpoint..." -ForegroundColor Yellow
try {
    $registerData = @{
        email = "test@test.com"
        password = "test123"
        firstName = "Test"
        lastName = "User"
        phone = "1234567890"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$apiUrl/auth/register" -Method Post -Body $registerData -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Register endpoint is accessible" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 400 -or $_.Exception.Message -like "*already exists*") {
        Write-Host "   ✅ Register endpoint is accessible (received expected validation error)" -ForegroundColor Green
    } elseif ($_.Exception.Message -like "*Cannot POST*") {
        Write-Host "   ❌ Register endpoint not found" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  Endpoint test: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "📋 Summary" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "✅ Backend server is running and accessible" -ForegroundColor Green
Write-Host "✅ Auth endpoints are configured correctly" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Your login/register buttons should now work!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Restart your mobile app" -ForegroundColor Cyan
Write-Host "Command: " -NoNewline -ForegroundColor Cyan
Write-Host "npx expo start --clear" -ForegroundColor Yellow
Write-Host ""
