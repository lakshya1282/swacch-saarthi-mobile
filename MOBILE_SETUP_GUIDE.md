# Waste Management Mobile App Setup Guide

## Overview
This React Native mobile application is the mobile version of your Waste Management web application. It includes all the core features with mobile-specific enhancements like camera access for QR scanning, location services, and native mobile UI components.

## Installation and Setup

### Prerequisites
1. **Node.js** (v16 or higher)
2. **React Native development environment** properly configured
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development, macOS only)
5. **Java 17** (required for Android builds)

### Step 1: Install Dependencies
```bash
cd E:\project\WasteManagementApp\WasteManagementMobile
npm install
```

### Step 2: Platform-Specific Setup

#### Android Setup
1. Ensure Android SDK is installed and configured
2. Set JAVA_HOME to Java 17 path
3. Create virtual device in Android Studio
4. Run the app:
```bash
npm run android
```

#### iOS Setup (macOS only)
1. Install Xcode from App Store
2. Install iOS Simulator
3. Install CocoaPods dependencies:
```bash
cd ios && pod install && cd ..
```
4. Run the app:
```bash
npm run ios
```

### Step 3: Start Metro Bundler
If not started automatically:
```bash
npm start
# or with specific port
npx react-native start --port 8082
```

## App Structure

```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── citizen/
│   │   ├── HomeScreen.tsx
│   │   ├── TrainingScreen.tsx
│   │   ├── SchedulePickupScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── WasteValidationScreen.tsx
│   │   └── QRCodeScreen.tsx
│   └── worker/
│       ├── WorkerHomeScreen.tsx
│       ├── WorkerTasksScreen.tsx
│       └── WorkerScannerScreen.tsx
├── components/
│   └── QRScanner.tsx
├── services/
│   └── apiService.ts
└── utils/
```

## Features Implemented

### ✅ Core Features
- **Authentication System**: Login/Register with demo mode fallback
- **Navigation**: Tab-based navigation for citizens and workers
- **User Management**: AsyncStorage for session persistence
- **API Integration**: Complete REST API service with interceptors
- **QR Code Scanning**: Native camera integration with permissions
- **Location Services**: GPS integration for waste pickup scheduling
- **Permissions**: Android and iOS camera, location, storage permissions

### 🔄 Navigation Structure
- **Authentication Stack**: Login → Register
- **Citizen Tabs**: Home → Training → Schedule → Profile
- **Worker Tabs**: Dashboard → Tasks → Scanner
- **Stack Screens**: QR Code, Waste Validation

### 🛡️ Permissions Configured
**Android (AndroidManifest.xml):**
- Camera access
- Location (fine and coarse)
- Storage (read/write)
- Internet access

**iOS (Info.plist):**
- Camera usage description
- Location usage description
- Photo library access
- Microphone access

## Backend Integration

### API Service Features
- **Base URL**: `http://localhost:3000/api`
- **Authentication**: JWT token with interceptors
- **Auto-logout**: On 401 responses
- **Endpoints**: Complete CRUD operations for all features

### Demo Mode
When backend server is unavailable, the app falls back to demo mode:
- **Citizen**: `citizen@demo.com` / `demo123`
- **Worker**: `worker@demo.com` / `demo123`

## Development Workflow

### 1. Start Backend Server
```bash
cd E:\project\WasteManagementApp
npm run dev
```

### 2. Start Mobile App
```bash
cd E:\project\WasteManagementApp\WasteManagementMobile
npm start
```

### 3. Run on Device/Emulator
```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## Troubleshooting

### Common Issues

1. **Java Version Error**
   - Ensure Java 17 is installed and JAVA_HOME is set correctly
   - Update gradle.properties if needed

2. **Metro Port Conflict**
   - Use different port: `npx react-native start --port 8082`
   - Clear Metro cache: `npx react-native start --reset-cache`

3. **Android Build Errors**
   - Clean build: `cd android && ./gradlew clean && cd ..`
   - Rebuild: `npm run android`

4. **Permission Issues**
   - Grant permissions manually in device settings
   - For emulator, extended controls → settings → permissions

5. **Network Issues**
   - For physical device, change API base URL from localhost to your computer's IP
   - Ensure both devices are on same network

### Build Optimization

#### Release Build (Android)
```bash
cd android
./gradlew assembleRelease
```

#### Release Build (iOS)
- Open `ios/WasteManagementMobile.xcworkspace` in Xcode
- Select "Generic iOS Device" or specific device
- Product → Archive

## Next Steps for Enhancement

1. **Add Real-Time Features**
   - WebSocket integration for live pickup updates
   - Push notifications for pickup reminders

2. **Enhanced UI/UX**
   - Dark mode support
   - Animations and transitions
   - Offline mode with local database

3. **Advanced Features**
   - AI-powered waste classification
   - Route optimization for workers
   - Analytics and reporting

4. **Testing**
   - Unit tests with Jest
   - E2E tests with Detox
   - Integration testing

## Production Deployment

### Android
1. Generate signed APK or AAB
2. Upload to Google Play Store
3. Configure app signing and release management

### iOS
1. Archive and validate app
2. Upload to App Store Connect
3. Submit for review

## Support and Maintenance

- **Dependencies**: Keep React Native and dependencies updated
- **Security**: Regular security audits and token refresh implementation
- **Performance**: Monitor app performance and optimize as needed
- **User Feedback**: Implement crash reporting and analytics

---

## Developer Notes

This mobile app successfully converts your web-based Waste Management application to a native mobile experience. All dependencies have been installed in the E drive as requested, and the app maintains full compatibility with your existing backend server.

The app includes proper error handling, demo mode fallback, and all necessary permissions for production deployment.
