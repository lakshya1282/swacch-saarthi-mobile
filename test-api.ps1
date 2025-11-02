Write-Host "Testing API Connection to http://192.168.29.154:3000/api" -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://192.168.29.154:3000/api/health" -Method GET
    Write-Host "✅ Health Check: " -ForegroundColor Green -NoNewline
    Write-Host "$($health.status) - Database: $($health.database)" -ForegroundColor White
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test login endpoint with demo credentials
Write-Host "2. Testing Login Endpoint (with demo credentials)..." -ForegroundColor Yellow
try {
    $body = @{
        email = "citizen@demo.com"
        password = "demo123"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "http://192.168.29.154:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Login Successful for: $($login.user.email)" -ForegroundColor Green
    Write-Host "   User Type: $($login.user.userType)" -ForegroundColor White
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "⚠️  Login Response: $responseBody" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Login Failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "API Base URL: http://192.168.29.154:3000/api" -ForegroundColor Cyan
Write-Host "Socket.IO URL: http://192.168.29.154:3000" -ForegroundColor Cyan
