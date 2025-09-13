# API Endpoint Testing Script for Waste Management App
# Run this script to test all worker endpoints

$baseUrl = "http://192.168.29.93:3000/api"
$localUrl = "http://localhost:3000/api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Waste Management API Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$localUrl/health" -Method GET
    Write-Host "✅ Health Check: " -NoNewline -ForegroundColor Green
    Write-Host "Server is $($response.status), Database is $($response.database)" -ForegroundColor White
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test Get All Pickups
Write-Host "2. Testing Get All Pickups..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$localUrl/pickups" -Method GET
    Write-Host "✅ Get Pickups: " -NoNewline -ForegroundColor Green
    Write-Host "Found $($response.pickups.Count) pickups" -ForegroundColor White
} catch {
    Write-Host "❌ Get Pickups Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test Worker Tasks
Write-Host "3. Testing Worker Tasks Endpoint..." -ForegroundColor Yellow
try {
    # Create a mock token for testing
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$localUrl/worker/tasks" -Method GET -Headers $headers
    Write-Host "✅ Worker Tasks: " -NoNewline -ForegroundColor Green
    Write-Host "Endpoint accessible" -ForegroundColor White
} catch {
    Write-Host "⚠️  Worker Tasks: Requires authentication (Expected)" -ForegroundColor Yellow
}
Write-Host ""

# Test QR Validation
Write-Host "4. Testing QR Validation..." -ForegroundColor Yellow
try {
    $body = @{
        qrData = "TEST123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$localUrl/qr/validate" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ QR Validation: " -NoNewline -ForegroundColor Green
    Write-Host "$($response.message)" -ForegroundColor White
} catch {
    Write-Host "❌ QR Validation Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test Start Task (with auth)
Write-Host "5. Testing Start Task Endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$localUrl/worker/tasks/test-id/start" -Method POST -Headers $headers
    Write-Host "✅ Start Task: " -NoNewline -ForegroundColor Green
    Write-Host "Endpoint accessible" -ForegroundColor White
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "⚠️  Start Task: Requires valid authentication (Expected)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Start Task Failed: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Test Complete Task
Write-Host "6. Testing Complete Task Endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer test-token"
        "Content-Type" = "application/json"
    }
    $body = @{
        actualWeight = "5 kg"
        notes = "Test completion"
        qrVerificationCode = "TEST123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$localUrl/worker/tasks/test-id/complete" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Complete Task: " -NoNewline -ForegroundColor Green
    Write-Host "Endpoint accessible" -ForegroundColor White
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "⚠️  Complete Task: Requires valid authentication (Expected)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Complete Task Failed: $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# CURL Examples
Write-Host ""
Write-Host "CURL Command Examples:" -ForegroundColor Magenta
Write-Host "=====================" -ForegroundColor Magenta
Write-Host ""
Write-Host "# Health Check:" -ForegroundColor White
Write-Host 'curl -X GET http://192.168.29.93:3000/api/health' -ForegroundColor Gray
Write-Host ""
Write-Host "# Get All Pickups:" -ForegroundColor White
Write-Host 'curl -X GET http://192.168.29.93:3000/api/pickups' -ForegroundColor Gray
Write-Host ""
Write-Host "# Validate QR Code:" -ForegroundColor White
Write-Host 'curl -X POST http://192.168.29.93:3000/api/qr/validate -H "Content-Type: application/json" -d "{\"qrData\":\"TEST123\"}"' -ForegroundColor Gray
Write-Host ""
Write-Host "# Start Task (requires auth):" -ForegroundColor White
Write-Host 'curl -X POST http://192.168.29.93:3000/api/worker/tasks/TASK_ID/start -H "Authorization: Bearer YOUR_TOKEN"' -ForegroundColor Gray
Write-Host ""
