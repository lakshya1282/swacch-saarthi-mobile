@echo off
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                                                                      ║
echo ║       WASTE MANAGEMENT - COMPLETE PROJECT STARTUP SYSTEM             ║
echo ║         Backend ^| Mobile App ^| Dashboard - Full Stack               ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
set ROOT_DIR=%cd%
set SERVER_DIR=%ROOT_DIR%\server
set DASHBOARD_DIR=%ROOT_DIR%\dashboard

echo 📍 Project Directories:
echo    Root: %ROOT_DIR%
echo    Server: %SERVER_DIR%
echo    Dashboard: %DASHBOARD_DIR%
echo    Frontend: %ROOT_DIR%
echo.

REM Check if directories exist
if not exist "%SERVER_DIR%" (
    echo ❌ Server directory not found at: %SERVER_DIR%
    pause
    exit /b 1
)

if not exist "%DASHBOARD_DIR%" (
    echo ⚠️  Dashboard directory not found at: %DASHBOARD_DIR%
    echo    Dashboard will not be started
)

REM Install dependencies
echo.
echo 🔍 Checking Dependencies...
echo.

if not exist "%SERVER_DIR%\node_modules" (
    echo ⏳ Installing Backend Dependencies...
    cd /d "%SERVER_DIR%"
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ Backend npm install failed
        pause
        exit /b 1
    )
    cd /d "%ROOT_DIR%"
)

if not exist "%ROOT_DIR%\node_modules" (
    echo ⏳ Installing Frontend Dependencies...
    cd /d "%ROOT_DIR%"
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ Frontend npm install failed
        pause
        exit /b 1
    )
)

if exist "%DASHBOARD_DIR%" (
    if not exist "%DASHBOARD_DIR%\node_modules" (
        echo ⏳ Installing Dashboard Dependencies...
        cd /d "%DASHBOARD_DIR%"
        call npm install
        if !errorlevel! neq 0 (
            echo ❌ Dashboard npm install failed
            pause
            exit /b 1
        )
        cd /d "%ROOT_DIR%"
    )
)

echo ✅ All dependencies ready
echo.

REM Display startup information
echo ═══════════════════════════════════════════════════════════════════════
echo 🚀 STARTING SERVICES
echo ═══════════════════════════════════════════════════════════════════════
echo.
echo Services to start:
echo   1. Backend Server       → PORT 3001
echo   2. Expo Metro Bundler   → PORT 8081
echo   3. Dashboard Web UI     → PORT 3000 (optional)
echo.
echo ═══════════════════════════════════════════════════════════════════════
echo.

REM Start Backend Server
echo 🟢 Starting Backend Server...
echo    Location: %SERVER_DIR%
echo    Command: npm start
echo.
start "Waste Management Backend Server - PORT 3001" cmd /k "cd /d "%SERVER_DIR%" && echo. && echo Starting backend on port 3001... && npm start"

REM Wait for backend to initialize
timeout /t 5 /nobreak

REM Start Expo Frontend
echo.
echo 🟠 Starting Expo Frontend (Metro Bundler)...
echo    Location: %ROOT_DIR%
echo    Command: npx expo start --tunnel
echo.
start "Waste Management Mobile App - Expo Metro PORT 8081" cmd /k "cd /d "%ROOT_DIR%" && echo. && echo Starting Expo on port 8081... && npx expo start --tunnel"

REM Wait a moment
timeout /t 3 /nobreak

REM Start Dashboard (optional)
if exist "%DASHBOARD_DIR%" (
    echo.
    echo 🔵 Starting Dashboard Web UI...
    echo    Location: %DASHBOARD_DIR%
    echo    Command: npm start
    echo.
    start "Waste Management Dashboard - PORT 3000" cmd /k "cd /d "%DASHBOARD_DIR%" && echo. && echo Starting dashboard on port 3000... && npm start"
)

echo.
echo ═══════════════════════════════════════════════════════════════════════
echo ✅ ALL SERVICES STARTED
echo ═══════════════════════════════════════════════════════════════════════
echo.
echo 📱 ACCESS POINTS:
echo.
echo   BACKEND API:
echo     • Health Check: http://localhost:3001/api/health
echo     • API Base: http://localhost:3001/api
echo     • Socket.IO: http://localhost:3001
echo.
echo   MOBILE APP:
echo     • Expo Metro: http://localhost:8081
echo     • Use Expo Go app to scan QR code
echo     • Or press 'w' in terminal for web
echo     • Or press 'i' for iOS Simulator
echo     • Or press 'a' for Android Emulator
echo.
echo   DASHBOARD (if running):
echo     • URL: http://localhost:3000
echo     • Admin dashboard for monitoring
echo.
echo ═══════════════════════════════════════════════════════════════════════
echo.
echo ℹ️  NOTES:
echo   • Check each terminal window for errors
echo   • Backend must be running before mobile app connects
echo   • Dashboard connects to backend on port 3001
echo   • All services are in development mode
echo.
echo 🔌 Database: MongoDB Atlas (Cloud)
echo 💾 Real-time: Socket.IO enabled
echo 📡 API: REST with Express.js
echo.
echo Press any terminal to see detailed logs and messages.
echo.
echo ═══════════════════════════════════════════════════════════════════════
