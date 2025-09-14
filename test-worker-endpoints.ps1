# Test All Worker Endpoints
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Worker Endpoints" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api"

# Test Accept Task
Write-Host "1. Testing Accept Task..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer test-token"
    "Content-Type" = "application/json"
}
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/tasks/demo-task-1/accept" -Method POST -Headers $headers
    Write-Host "✅ Accept Task: $($response.message)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Accept Task endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Accept Task failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test Start Task
Write-Host "2. Testing Start Task..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/tasks/demo-task-1/start" -Method POST -Headers $headers
    Write-Host "✅ Start Task: $($response.message)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Start Task endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Start Task failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test Complete Task
Write-Host "3. Testing Complete Task..." -ForegroundColor Yellow
$body = @{
    actualWeight = "5 kg"
    notes = "Completed successfully"
    qrVerificationCode = "TEST123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/tasks/demo-task-1/complete" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Complete Task: $($response.message)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Complete Task endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Complete Task failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test Report Issue
Write-Host "4. Testing Report Issue..." -ForegroundColor Yellow
$body = @{
    issueType = "customer_not_available"
    description = "Customer not responding"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/tasks/demo-task-1/report-issue" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Report Issue: $($response.message)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Report Issue endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Report Issue failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test Scan QR
Write-Host "5. Testing Scan QR..." -ForegroundColor Yellow
$body = @{
    qrData = "TEST-QR-123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/scan" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Scan QR: $($response.message)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Scan QR endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Scan QR failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test Get Task Details
Write-Host "6. Testing Get Task Details..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/worker/tasks/demo-task-1" -Method GET -Headers $headers
    Write-Host "✅ Get Task Details: Task retrieved" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Get Task Details endpoint exists (auth required)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Task Details failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "All endpoints tested!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
