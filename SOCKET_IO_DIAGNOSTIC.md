# Socket.IO Connection Diagnostic Guide

## 🎯 Quick Summary of Fixes Applied

Your code has been fixed with:
1. **Server**: Proper 0.0.0.0 binding with CORS + transport fallbacks
2. **Client**: Multiple fallback URLs with polling support
3. **Version match**: socket.io 4.8.1 (server) and socket.io-client 4.8.1 (client)

---

## ✅ Corrected Server Code (Node.js + Socket.IO)

```javascript path=/server/index.js start=20
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',                           // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowEIO3: true,                       // Engine.IO 3 compatibility
  },
  transports: ['websocket', 'polling', 'webtransport'],  // Fallbacks
  pingInterval: 25000,                     // Keep-alive ping
  pingTimeout: 5000,                       // Timeout before reconnect
  allowUpgrades: true,
  perMessageDeflate: false,                // Disable compression for mobile
});

// Start server on 0.0.0.0 (all interfaces)
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';                    // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  console.log(`✅ Server listening on ${HOST}:${PORT}`);
  console.log(`📱 Mobile app should connect to: http://192.168.29.154:${PORT}`);
});
```

---

## ✅ Corrected Client Code (React Native + Socket.IO Client)

```typescript path=/src/services/socketService.ts start=33
const serverUrl = 'http://192.168.29.154:3001';  // Replace with your PC's IP

this.socket = io(serverUrl, {
  transports: ['websocket', 'polling', 'webtransport'],  // Try WebSocket first, fallback to polling
  reconnection: false,                     // We handle reconnection manually
  timeout: 5000,                           // Connection timeout
  forceNew: true,                          // Force new connection
  autoConnect: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  secure: false,                           // HTTP not HTTPS
  rejectUnauthorized: false,
  perMessageDeflate: false,                // Disable compression
  allowEIO3: true,                         // Engine.IO 3 compatibility
});

// Handle connection success
this.socket.on('connect', () => {
  console.log('✅ Socket connected:', this.socket.id);
});

// Handle errors
this.socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
  // Try fallback URL or fallback to polling
});

// Handle disconnection
this.socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});
```

---

## 🔧 Diagnostic Commands

### 1. Verify Server is Running & Listening

**Check if port 3001 is listening:**
```powershell
# Windows PowerShell
netstat -ano | findstr :3001

# Expected output:
# TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING    12345
```

**Check server process:**
```powershell
Get-Process | Where-Object { $_.ProcessName -match "node" }
```

### 2. Test Server Health from PC

```powershell
# Test if server is responding
curl http://192.168.29.154:3001/api/health

# Expected response:
# {"success":true,"message":"Waste Management API is running","timestamp":"..."}
```

### 3. Find Your PC's Local IP Address

```powershell
# Get IPv4 address
ipconfig

# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.x.x or 192.168.29.154
```

### 4. Test Network Connectivity

**From your phone/emulator, ping your PC:**
```bash
# Android emulator
ping 10.0.2.2
ping 192.168.29.154

# Physical device
ping 192.168.29.154
```

### 5. Check Firewall

```powershell
# List firewall rules for port 3001
Get-NetFirewallRule -DisplayName "*3001*" | Format-List

# Add exception if needed
New-NetFirewallRule -DisplayName "Node.js Socket.IO Port 3001" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001

# Or disable firewall temporarily (for testing only)
Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled False
```

### 6. Verify Socket.IO Package Versions Match

```powershell
# Server
cd server
npm list socket.io

# Client (mobile)
cd ../
npm list socket.io-client

# Both should be 4.8.1
```

---

## 🎯 Connection Flow Diagram

```
Mobile App (React Native)
    │
    ├─ Connect to: http://192.168.29.154:3001
    │  ├─ Attempt WebSocket connection
    │  │  ├─ SUCCESS → Connected ✅
    │  │  └─ FAIL → Try next transport
    │  ├─ Attempt HTTP long-polling
    │  │  ├─ SUCCESS → Connected ✅
    │  │  └─ FAIL → Try next URL
    │  └─ Try next URL: http://localhost:3001
    │
    └─ Server (Node.js + Socket.IO)
       ├─ Listen on 0.0.0.0:3001 (all interfaces)
       ├─ Accept WebSocket connections
       ├─ Fallback to HTTP polling
       └─ Emit real-time events
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: "websocket error" - Connection Attempt Fails
```
ERROR  Socket connection error: websocket error
ERROR  Failed URL: http://192.168.29.154:3001
```

**Diagnosis:**
```powershell
# Check if server is running
netstat -ano | findstr :3001

# Verify you can reach it
curl http://192.168.29.154:3001/api/health
```

**Solutions:**
1. Start the server: `npm run dev` (in server folder)
2. Update .env: Ensure `API_HOST=192.168.29.154` (your actual IP)
3. Check firewall: Allow port 3001 inbound traffic

---

### Issue 2: "Connection timeout" on All URLs
```
LOG  Connection timeout for http://192.168.29.154:3001
LOG  Connection timeout for http://localhost:3001
LOG  Connection timeout for http://10.0.2.2:3001
```

**Diagnosis:**
```powershell
# Test connection manually
Test-NetConnection -ComputerName 192.168.29.154 -Port 3001

# Check server logs for errors
```

**Solutions:**
1. Verify server process: `Get-Process node`
2. Check for errors in server console
3. Restart server: `npm run dev`
4. Clear client cache: `npx react-native start --reset-cache`

---

### Issue 3: Physical Device Can't Connect (But Emulator Can)
```
ERROR  Socket connection error: websocket error
ERROR  Failed URL: http://192.168.29.154:3001
```

**Diagnosis:**
- PC and phone on same WiFi? ✅
- PC's IP correct in .env? ✅
- Firewall blocking port 3001? ❌

**Solutions:**
```powershell
# Allow port 3001 through firewall
New-NetFirewallRule -DisplayName "Socket.IO" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001

# Or temporarily disable firewall
Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled False
```

---

### Issue 4: Android Emulator Connection Issues

For Android Emulator, these IPs work:
- `10.0.2.2` → Host PC (use this)
- `10.0.3.2` → Genymotion emulator
- `127.0.0.1` → Emulator itself (NOT your PC)

**Your env.ts already tries all three:**
```typescript path=/src/config/env.ts start=79
export const getSocketUrls = (): string[] => {
  const host = getApiHost();
  const port = getApiPort();
  
  return [
    `http://${host}:${port}`,           // Network IP: 192.168.29.154:3001
    `http://localhost:${port}`,         // Localhost fallback: 127.0.0.1:3001
    `http://10.0.2.2:${port}`,          // Android emulator: 10.0.2.2:3001
  ];
};
```

---

## ✅ Step-by-Step Connection Test

### Step 1: Start Server
```powershell
cd "C:\Users\laksh\OneDrive\Desktop\WasteManagementMobile\server"
npm run dev

# Expected output:
# Server running on 0.0.0.0:3001
# MongoDB connected
# Socket.IO: Enabled for real-time updates
```

### Step 2: Verify Port Listening
```powershell
netstat -ano | findstr :3001

# Should show:
# TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING
```

### Step 3: Test Health Endpoint
```powershell
curl http://192.168.29.154:3001/api/health

# Expected:
# {"success":true,"message":"Waste Management API is running"}
```

### Step 4: Start Mobile App
```powershell
cd "C:\Users\laksh\OneDrive\Desktop\WasteManagementMobile"
npx react-native start --reset-cache
```

### Step 5: Run App on Device/Emulator
```powershell
# Press 'a' for Android
# OR 'i' for iOS
```

### Step 6: Monitor Logs
```
Expected success sequence:
LOG  Attempting Socket.IO connection to: http://192.168.29.154:3001
LOG  ✅ Socket connected: [socket-id]
LOG  Connected to: http://192.168.29.154:3001
```

---

## 🔍 Real-Time Debugging

### Monitor Server Socket Events
The server logs all connections:
```
🔌 New client connected: abc123def456
Worker abc123 joined rooms
✅ Socket connected: abc123def456
🔌 Client disconnected: abc123def456
```

### Monitor Client Socket Events
The app logs all attempts:
```
LOG  API Base URL: http://192.168.29.154:3001/api
LOG  Attempting Socket.IO connection to: http://192.168.29.154:3001
LOG  ✅ Socket connected: xyz789abc123
LOG  Connected to: http://192.168.29.154:3001
```

---

## 📋 Pre-Connection Checklist

Before troubleshooting, verify:

- [ ] Server started: `npm run dev` in server directory
- [ ] Port 3001 listening: `netstat -ano | findstr :3001`
- [ ] Server responds: `curl http://192.168.29.154:3001/api/health`
- [ ] .env has correct IP: `API_HOST=192.168.29.154`
- [ ] Phone/emulator on same network as PC
- [ ] Firewall allows port 3001 inbound
- [ ] socket.io package versions match (4.8.1)
- [ ] Metro cache cleared: `npm start --reset-cache`

---

## 🚀 If All Else Fails

**Complete Reset:**
```powershell
# 1. Kill all Node processes
Get-Process | Where-Object { $_.ProcessName -match "node" } | Stop-Process -Force

# 2. Clear caches
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Start fresh
cd server
npm install
npm run dev

# In another terminal:
cd ../
npm install
npm start --reset-cache
```

---

**Status**: ✅ Fixes applied and ready to test  
**Last Updated**: November 2025
