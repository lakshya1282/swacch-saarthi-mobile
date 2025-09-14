# Server Monitoring Script
# This script monitors the server and automatically restarts it if it crashes

$serverUrl = "http://localhost:3000/api/health"
$checkInterval = 30  # Check every 30 seconds
$maxRetries = 3

Write-Host "🔍 Starting Server Monitor..." -ForegroundColor Cyan
Write-Host "   Checking server health every $checkInterval seconds" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""

function Test-ServerHealth {
    try {
        $response = Invoke-RestMethod -Uri $serverUrl -TimeoutSec 5 -ErrorAction Stop
        if ($response.status -eq "healthy") {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

function Start-Server {
    Write-Host "🚀 Starting server..." -ForegroundColor Yellow
    
    # Ensure MongoDB is running
    $mongoRunning = netstat -an | Select-String ":27017"
    if (-not $mongoRunning) {
        Write-Host "   Starting MongoDB..." -ForegroundColor Gray
        Start-Process -FilePath "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" `
                     -ArgumentList "--dbpath", "C:\data\db" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
    
    # Start the Node.js server
    Set-Location -Path "E:\project\WasteManagementApp\server"
    Start-Job -ScriptBlock { 
        Set-Location -Path "E:\project\WasteManagementApp\server"
        npm run dev 
    } | Out-Null
    
    Start-Sleep -Seconds 5
    
    if (Test-ServerHealth) {
        Write-Host "✅ Server started successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Failed to start server" -ForegroundColor Red
        return $false
    }
}

$retryCount = 0

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    if (Test-ServerHealth) {
        Write-Host "[$timestamp] ✅ Server is healthy" -ForegroundColor Green
        $retryCount = 0
    } else {
        Write-Host "[$timestamp] ⚠️  Server is not responding!" -ForegroundColor Red
        
        if ($retryCount -lt $maxRetries) {
            $retryCount++
            Write-Host "   Attempting restart ($retryCount/$maxRetries)..." -ForegroundColor Yellow
            
            # Kill any existing node processes
            Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            
            if (Start-Server) {
                $retryCount = 0
            } else {
                Write-Host "   Retry failed. Will try again in $checkInterval seconds." -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Maximum retries reached. Manual intervention required." -ForegroundColor Red
            Write-Host "   Please check the server logs for errors." -ForegroundColor Yellow
            break
        }
    }
    
    Start-Sleep -Seconds $checkInterval
}