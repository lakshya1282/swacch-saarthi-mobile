# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Swachh Saarthi** (meaning "Clean Companion" in Hindi) is a comprehensive digital waste management solution with three main components:

1. **React Native Mobile App** (`/src/`, `/`) - For citizens and workers
2. **Node.js/Express Backend** (`/server/`) - API server with MongoDB
3. **React Dashboard** (`/dashboard/`) - Web-based monitoring dashboard

## Development Commands

### Prerequisites
- Node.js 20+ required
- At least 5-10GB free space on C: drive for Android builds
- MongoDB (optional - has demo mode)
- Android SDK for mobile builds

### Start Development Environment
```powershell
# Start MongoDB (Windows batch file provided)
.\START_SERVER.bat

# Start backend server (port 3001) with hot reload
cd server
npm run dev

# Alternative: Start backend without hot reload
cd server
npm start

# Start mobile Metro bundler
npm start

# Build and run mobile app (requires Android SDK)
npm run android
npm run ios  # macOS only

# Start dashboard (port 3000)
cd dashboard
npm run dev
# Alternative: npm start
```

### Testing & Quality
```bash
# Run Jest tests
npm test

# Run ESLint
npm run lint

# Mobile development commands
npx react-native run-android
npx react-native run-ios

# Manual QR testing (browser-based)
# Open TEST_QR_GENERATOR.html in browser

# Demo mode testing (when backend unavailable)
# Use demo credentials: citizen@demo.com/demo123 or worker@demo.com/demo123
```

## Architecture Overview

### Mobile App Architecture
- **Tech Stack**: React Native 0.81.1 + TypeScript + Expo modules
- **Navigation**: React Navigation v7 with tab-based structure for user types
- **State Management**: React Context (AuthContext) + AsyncStorage for persistence
- **User Types**: Citizens and Workers with completely separate interfaces
- **QR System**: Dual QR codes - permanent household IDs + temporary pickup verification
- **Demo Mode**: Full offline functionality with demo credentials when backend unavailable
- **Real-time**: Socket.IO client for live updates and task assignments
- **Permissions**: Camera (QR scanning), location, storage configured for both platforms

### Backend Architecture  
- **Framework**: Express.js with CommonJS modules
- **Database**: MongoDB with Mongoose ODM and validation schemas
- **Real-time**: Socket.IO namespaces (/dashboard) with JWT authentication
- **Authentication**: JWT tokens with role-based middleware protection
- **File Handling**: Multer for image uploads (waste validation photos)
- **Dual Mode**: Graceful fallback when MongoDB unavailable
- **Atomic Operations**: Race condition prevention for task assignments

### Key Models (MongoDB)
- `User` - Citizens, workers, office operators
- `Pickup` - Waste pickup requests with QR verification
- `Training` - Educational modules for citizens
- `WasteValidation` - AI-powered waste segregation validation

### QR Code System
The app uses a sophisticated dual QR code system:

1. **Household QR Codes**: Permanent identifiers for registered addresses
2. **Pickup Verification Codes**: Unique 6-character codes per pickup
3. **Validation Flow**: 
   - Citizens schedule pickup → get verification code
   - Workers scan QR → validate against database
   - Atomic task acceptance prevents race conditions

```javascript
// QR Data Structure
{
  "pickupId": "PU12345",
  "verificationCode": "ABC123", 
  "customerName": "John Doe",
  "address": "123 Green Street"
}
```

### Real-time Features
Socket.IO namespaces handle live updates:
- Worker task assignments
- Pickup status changes  
- Dashboard monitoring
- Citizen notifications

## Development Guidelines

### File Structure Patterns
```
src/
├── screens/
│   ├── auth/          # Login/Register screens
│   ├── citizen/       # Citizen-specific screens (scheduling, history)
│   └── worker/        # Worker-specific screens (tasks, QR scanning)
├── components/
│   ├── common/        # Reusable UI components
│   └── QR*.js         # QR-related components (scanner, generator, processor)
├── contexts/          # React Context providers (AuthContext)
├── services/          # API integration (apiService.ts, socketService.ts)
└── constants/         # App-wide constants

server/
├── models/            # MongoDB schemas (User, Pickup, Training, etc.)
├── routes/            # Express route handlers (API endpoints)
├── socketHandlers/    # Socket.IO namespaces (dashboardSocket.js)
└── services/          # Business logic and utilities

dashboard/
├── src/
│   ├── components/    # React dashboard components
│   ├── pages/         # Dashboard pages
│   └── services/      # Dashboard API services
```

### API Patterns
- All routes use `/api/` prefix
- Authentication via `Bearer` tokens
- Consistent response format:
```javascript
{
  "success": true/false,
  "message": "Description",
  "data": {...}
}
```

### Common Development Tasks

#### Adding New Screens
1. Create in appropriate `/screens/` subdirectory (auth, citizen, or worker)
2. Add navigation entry in `App.tsx` main navigator
3. Update tab/stack navigators as needed
4. Import and register in appropriate user flow

#### Adding API Endpoints  
1. Create route handler in `/server/routes/` (e.g., `pickupRoutes.js`)
2. Add route to main server in `/server/index.js`
3. Update API service in `/src/services/apiService.ts` with typed methods
4. Add error handling and demo mode fallbacks

#### Working with QR Codes
- Use `QRProcessor` class for validation logic and format checking
- QR generation handled by `QRCodeDisplay` component with SVG rendering
- Always validate QR format before processing (household vs pickup codes)
- Test using `TEST_QR_GENERATOR.html` for manual verification
- Handle both permanent household QRs and temporary pickup verification codes

#### Socket.IO Real-time Features
- Client: Use `socketService.ts` singleton for connection management
- Server: Add handlers in `/server/socketHandlers/dashboardSocket.js`
- Join appropriate rooms based on user type (worker/citizen/dashboard)
- Emit events for pickup updates, task assignments, and status changes

#### Database Operations
- Models use Mongoose with proper validation and indexes
- Atomic operations prevent race conditions (see `Pickup.acceptTaskAtomically`)
- Demo mode fallbacks for offline development and testing
- All operations gracefully handle MongoDB connection failures

### Environment Setup
- **Node.js 20+** required (specified in package.json engines)
- **Android SDK** needed for mobile builds (requires 5-10GB C: drive space)
- **MongoDB** for persistence (optional - comprehensive demo mode available)
- **Windows batch files** provided for quick startup (`START_SERVER.bat`)
- **Expo modules** integrated for camera, barcode scanning, image picker

### Testing Strategy
- **Jest** for unit tests with TypeScript support
- **Demo modes** with realistic data for testing without full infrastructure
- **Manual QR testing** using `TEST_QR_GENERATOR.html` in browser
- **Integration tests** for critical pickup flows and QR validation
- **Socket.IO testing** via dashboard namespace connection
- **Physical device testing** recommended for camera/QR functionality

### Troubleshooting Common Issues

#### Mobile Build Failures
- **C: drive space**: Ensure 5-10GB free for Android builds and Gradle cache
- **Metro bundler issues**: Clear Metro cache with `npx react-native start --reset-cache`
- **Android SDK**: Verify `ANDROID_HOME` environment variable is set
- **Node modules**: Clear with `rm -rf node_modules && npm install`

#### Backend Connection Issues
- **Demo mode**: App automatically falls back when backend unavailable
- **MongoDB**: Server gracefully handles database connection failures
- **Socket.IO**: Implements reconnection logic with exponential backoff
- **Port conflicts**: Backend runs on 3001, dashboard on 3000, Metro on 8081

#### QR Code Problems
- **Camera permissions**: Check Android/iOS camera permissions in settings
- **QR format validation**: Use `TEST_QR_GENERATOR.html` to create test codes
- **Scanning issues**: Ensure proper lighting and stable camera positioning
- **Code generation**: Verify pickup verification codes are 6 characters

### Mobile-Specific Considerations
- Android builds require significant disk space (5-10GB)
- Alternative testing via Expo or React Native Web
- Physical device testing recommended over emulators
- Camera permissions required for QR scanning

### Critical Business Logic Areas
- **Task Assignment**: Atomic operations prevent multiple workers accepting same task
- **QR Verification**: Strict validation prevents fraudulent completions  
- **Real-time Updates**: Socket.IO keeps all clients synchronized
- **Offline Handling**: Demo modes ensure app functionality without backend

## Project Context

This is a social impact project addressing urban waste management challenges in India. The system promotes proper waste segregation, transparent collection processes, and dignified work for waste collection professionals. Key stakeholders include citizens (households), waste collection workers, and municipal authorities.

The codebase emphasizes reliability and offline capability, with comprehensive demo modes to ensure the app works in various deployment scenarios.