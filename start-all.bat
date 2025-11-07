@echo off
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║    Waste Management Mobile - Full Stack Development Server    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
set ROOT_DIR=%cd%
set SERVER_DIR=%ROOT_DIR%\server

echo 📍 Project Root: %ROOT_DIR%
echo 📍 Server Dir: %SERVER_DIR%
echo.

REM Check if server directory exists
if not exist "%SERVER_DIR%" (
    echo ❌ Server directory not found at: %SERVER_DIR%
    pause
    exit /b 1
)

REM Check and install dependencies
echo 🔍 Checking dependencies...

if not exist "%SERVER_DIR%\node_modules" (
    echo ⚠️  Installing server dependencies...
    cd /d "%SERVER_DIR%"
    call npm install
    cd /d "%ROOT_DIR%"
)

if not exist "%ROOT_DIR%\node_modules" (
    echo ⚠️  Installing frontend dependencies...
    cd /d "%ROOT_DIR%"
    call npm install
)

echo ✅ Dependencies ready
echo.

echo 🚀 Starting Backend Server...
echo    Port: 3001
echo    Location: %SERVER_DIR%
echo.

REM Start backend in a new window
start "Waste Management Backend - Port 3001" cmd /k "cd /d "%SERVER_DIR%" && npm start"

REM Wait for backend to start
echo ⏳ Waiting for backend server to start...
timeout /t 3 /nobreak

echo.
echo 🚀 Starting Frontend (Expo Metro)...
echo    Port: 8081
echo    Location: %ROOT_DIR%
echo.
echo ════════════════════════════════════════════════════════════════
echo 📱 Expo Metro Bundler Starting...
echo ════════════════════════════════════════════════════════════════
echo.

REM Start frontend in current window
cd /d "%ROOT_DIR%"
call npx expo start --tunnel

pause
