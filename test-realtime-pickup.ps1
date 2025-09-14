# Test Real-time Pickup Updates
# This script creates new pickups to test real-time updates for workers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Real-time Pickup Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Login as citizen first to get token
Write-Host "1. Logging in as citizen..." -ForegroundColor Yellow
$loginBody = @{
    email = "citizen@demo.com"
    password = "demo123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://192.168.29.93:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed. Make sure demo accounts exist." -ForegroundColor Red
    exit 1
}

# Create a new pickup
Write-Host ""
Write-Host "2. Creating new pickup..." -ForegroundColor Yellow

$pickupBody = @{
    wasteTypes = @("Dry Waste", "Wet Waste", "Electronic Waste")
    estimatedWeight = "10-15 kg"
    timeSlot = "Morning (9 AM - 12 PM)"
    specialInstructions = "Real-time test pickup - Please handle with care"
    scheduledDate = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
    address = "Test Location, Sector " + (Get-Random -Minimum 1 -Maximum 20)
    customerPhone = "9876543210"
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $pickupResponse = Invoke-WebRequest -Uri "http://192.168.29.93:3000/api/pickups/schedule" -Method POST -Body $pickupBody -Headers $headers -UseBasicParsing
    $pickupData = $pickupResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Pickup created successfully!" -ForegroundColor Green
    Write-Host "   Pickup ID: $($pickupData.pickup._id)" -ForegroundColor Gray
    Write-Host "   Status: $($pickupData.pickup.status)" -ForegroundColor Gray
    Write-Host "   Scheduled: $($pickupData.pickup.scheduledDate)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✨ Real-time Update Sent!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check the Worker app now - it should receive:" -ForegroundColor Yellow
    Write-Host "  1. Notification about new pickup" -ForegroundColor White
    Write-Host "  2. Updated task list" -ForegroundColor White
    Write-Host "  3. Updated dashboard stats" -ForegroundColor White
    Write-Host ""
    Write-Host "The pickup will be auto-assigned in 2 seconds..." -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Failed to create pickup: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to create another pickup, or Ctrl+C to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
