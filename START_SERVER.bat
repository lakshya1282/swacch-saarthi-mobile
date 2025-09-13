@echo off
title Waste Management Server
color 0A
echo.
echo ====================================================
echo         WASTE MANAGEMENT SERVER STARTUP
echo ====================================================
echo.

REM Check if MongoDB is running
netstat -an | findstr :27017 >nul
if errorlevel 1 (
    echo [!] MongoDB is not running. Starting MongoDB...
    start /B "" "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath C:\data\db
    timeout /t 3 /nobreak >nul
    echo [+] MongoDB started
) else (
    echo [+] MongoDB is already running
)

echo.
echo [*] Starting Node.js server...
echo.

cd /d E:\project\WasteManagementApp\server
npm run dev

pause