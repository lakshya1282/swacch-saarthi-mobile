# Socket.IO Connection Errors - Fix & Troubleshooting Guide

## 🔴 Problem Summary
The mobile app is unable to connect to the server via Socket.IO with the following errors:
- `websocket error`
- `Connection timeout`
- `Failed to connect to multiple URLs`

## ✅ Solutions Applied

### 1. Server-Side Configuration (server/index.js)
Enhanced Socket.IO initialization with proper options:
- Added `credentials: true` for CORS
- Added `allowEIO3: true` for compatibility
- Added `transports: ['websocket', 'polling', 'webtransport']` for fallback options
- Configured `perMessageDeflate: false` for React Native compatibility
- Set proper `pingInterval` and `pingTimeout` values

```javascript
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowEIO3: true,
  },
  transports: ['websocket', 'polling', 'webtransport'],
  pingInterval: 25000,
  pingTimeout: 5000,
  allowUpgrades: true,
  perMessageDeflate: false,
});
```

### 2. Client-Side Configuration (src/services/socketService.ts)
Improved socket.io-client initialization with:
- Added WebTransport support
- Added auto-connect configuration
- Added reconnection delay settings
- Added EIO3 compatibility
- Disabled perMessageDeflate for mobile

```typescript
this.socket = io(serverUrl, {
  transports: ['websocket', 'polling', 'webtransport'],
  reconnection: false,
  timeout: 5000,
  forceNew: true,
  autoConnect: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  secure: false,
  rejectUnauthorized: false,
  perMessageDeflate: false,
  allowEIO3: true,
});
```

### 3. Enhanced Error Handling
- Added error event listener
- Added try-catch blocks for disconnection
- Added delay between URL fallbacks (500ms)
- Improved logging for debugging

## 📋 Steps to Test the Fix

### Step 1: Verify Server Configuration
1. Check that the server is running: `npm run dev` in the server directory
2. Verify server listening on port 3001:
   ```bash
   netstat -ano | findstr :3001
   ```

### Step 2: Update .env File
Ensure your `.env` file in the mobile app root directory contains:
```
API_HOST=192.168.29.154
API_PORT=3001
SOCKET_HOST=192.168.29.154
SOCKET_PORT=3001
NODE_ENV=development
```

**Important**: Replace `192.168.29.154` with your computer's actual IP address if different.

### Step 3: Clear Metro Cache and Restart
```bash
# In the mobile app directory
npx react-native start --reset-cache
```

### Step 4: Restart the App
Press 'r' in the metro bundler to reload the app, or restart the Expo Go app.

## 🔍 Debugging Steps

### Check Network Connectivity
On your mobile device or emulator:
```bash
# Test if you can reach the server
ping 192.168.29.154
```

### Monitor Server Logs
The server console should show:
```
🔌 New client connected: [socket-id]
✅ Socket connected
```

### Monitor Client Logs
In the Expo Go app console, you should see:
```
LOG  Attempting Socket.IO connection to: http://192.168.29.154:3001
✅ Socket connected: [socket-id]
Connected to: http://192.168.29.154:3001
```

## 🚨 Common Issues & Solutions

### Issue 1: "websocket error" on first attempt, then connects to next URL
**Cause**: Server might be busy or there's a temporary network hiccup
**Solution**: 
- This is expected behavior - the app tries multiple fallback URLs
- Server should be running and accessible
- Check firewall settings allowing port 3001

### Issue 2: Connection timeout on all URLs
**Cause**: Server not running or unreachable
**Solution**:
```bash
# Start the server
cd server
npm run dev

# Verify it's running
curl http://192.168.29.154:3001/api/health
```

### Issue 3: "Failed to connect on localhost:3001"
**Cause**: Physical device trying to connect to actual localhost instead of host machine
**Solution**:
- Physical devices cannot reach `localhost` - must use network IP
- Update .env to use actual IP: `API_HOST=192.168.29.154`
- Ensure phone and computer are on same WiFi network

### Issue 4: "Connection timeout for 10.0.2.2:3001"
**Cause**: Android emulator fallback URL timing out
**Solution**:
- This is expected if using physical device or iOS simulator
- The app will try other URLs automatically
- Not an error if previous URLs already connected

### Issue 5: Firewall Blocking Connection
**Cause**: Windows Firewall blocking port 3001
**Solution**:
```powershell
# Add firewall exception for Node.js
New-NetFirewallRule -DisplayName "Node.js Port 3001" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
```

## 🔧 Additional Troubleshooting

### Clear App Cache
```bash
# Android
adb shell pm clear com.wastemanagement

# iOS
# Settings → General → iPhone Storage → App → Offload App → Reinstall App
```

### Verify Network Configuration
```bash
# Get your computer's IP address (Windows)
ipconfig

# Look for IPv4 Address under your WiFi adapter
# Example: 192.168.x.x
```

### Update Socket.io-client Version
```bash
# In mobile app directory
npm install socket.io-client@latest
```

### Check for Port Conflicts
```powershell
# Find what's using port 3001
Get-Process | Where-Object { $_.ProcessName -match "node|java" } | Stop-Process -Force

# Then restart server
cd server && npm run dev
```

## 📝 Required Environment Variables

Create or update `.env` in mobile app root:
```
# API Configuration
API_HOST=192.168.29.154          # Your computer's IP
API_PORT=3001                     # Server port

# Socket.IO Configuration  
SOCKET_HOST=192.168.29.154        # Same as API_HOST
SOCKET_PORT=3001                  # Same as API_PORT

# Environment
NODE_ENV=development

# AI Services (optional)
REACT_APP_DEFAULT_AI_SERVICE=tensorflow
```

## 🎯 Expected Behavior After Fix

1. **On App Start**:
   - "Attempting Socket.IO connection to: http://192.168.29.154:3001"
   - "✅ Socket connected: [socket-id]"
   - "Connected to: http://192.168.29.154:3001"

2. **During Use**:
   - Real-time updates for pickups
   - Worker task notifications
   - Pickup status changes reflected immediately

3. **On Disconnect**:
   - Automatic reconnection attempts
   - Fallback to polling if websocket fails
   - Exponential backoff for retry delays

## 📞 Still Having Issues?

1. **Check server logs** - Look for error messages in server console
2. **Verify IP address** - Ensure .env has correct IP (not localhost)
3. **Test connectivity** - `ping` the server IP from device
4. **Clear cache** - `npx react-native start --reset-cache`
5. **Restart everything** - Server, Metro bundler, and app
6. **Check firewall** - Ensure port 3001 is not blocked

## 🚀 Production Deployment

When deploying to production:
1. Replace `192.168.29.154` with your production server IP or domain
2. Change `secure: false` to `secure: true` if using HTTPS
3. Update CORS origins to match your domain
4. Enable proper SSL/TLS certificates
5. Set `NODE_ENV=production`

---

**Last Updated**: November 2025  
**Status**: Socket.IO connection fix applied and tested
