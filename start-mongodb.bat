@echo off
echo Starting MongoDB...
start /B mongod --dbpath C:\data\db > mongodb.log 2>&1
echo MongoDB started in background
timeout /t 3 /nobreak > nul
echo MongoDB should now be running on port 27017