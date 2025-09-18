# PowerShell script to test worker-specific tasks endpoint

Write-Host "Testing Worker-Specific Tasks Endpoint" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Test worker IDs
$workerId1 = "68c6688b54e9418d99508601"  # Dhairya Parmar
$workerId2 = "68c668e354e9418d99508605"  # Leeza Khiyani

Write-Host "`nTest 1: Fetching tasks for Worker ID: $workerId1" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Gray

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/pickups/worker/$workerId1/tasks" -Method Get
    
    if ($response1.success) {
        Write-Host "✅ Success! Retrieved tasks for worker" -ForegroundColor Green
        Write-Host "📊 Total tasks: $($response1.data.Count)" -ForegroundColor White
        
        if ($response1.stats) {
            Write-Host "`n📈 Statistics:" -ForegroundColor Cyan
            Write-Host "  - Total: $($response1.stats.total)" -ForegroundColor White
            Write-Host "  - Assigned: $($response1.stats.assigned)" -ForegroundColor White
            Write-Host "  - In Progress: $($response1.stats.inProgress)" -ForegroundColor White
            Write-Host "  - Completed: $($response1.stats.completed)" -ForegroundColor White
            Write-Host "  - Today's Tasks: $($response1.stats.todayTasks)" -ForegroundColor White
        }
        
        if ($response1.data.Count -gt 0) {
            Write-Host "`n📦 First task details:" -ForegroundColor Cyan
            $firstTask = $response1.data[0]
            Write-Host "  - Pickup ID: $($firstTask.pickupId)" -ForegroundColor White
            Write-Host "  - Status: $($firstTask.status)" -ForegroundColor White
            Write-Host "  - Customer: $($firstTask.customerName)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`nTest 2: Fetching tasks for Worker ID: $workerId2" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Gray

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/pickups/worker/$workerId2/tasks" -Method Get
    
    if ($response2.success) {
        Write-Host "✅ Success! Retrieved tasks for second worker" -ForegroundColor Green
        Write-Host "📊 Total tasks: $($response2.data.Count)" -ForegroundColor White
        
        # Check for scheduled tasks (should be excluded)
        $scheduledTasks = $response2.data | Where-Object { $_.status -eq 'scheduled' }
        if ($scheduledTasks.Count -gt 0) {
            Write-Host "⚠️ WARNING: Found 'scheduled' tasks - these should be excluded!" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Correctly excluding 'scheduled' (available) tasks" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Green