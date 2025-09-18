# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a React Native mobile application for waste management that serves two user types:
- **Citizens**: Schedule waste pickups, access waste sorting training, validate waste through AI
- **Workers**: Manage pickup tasks, scan QR codes for verification, track earnings

Built with React Native 0.81.1, Expo SDK 54, and TypeScript. Uses TensorFlow.js for AI-powered waste classification.

## Common Development Commands

### Starting Development
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Clear Metro cache and restart
npx react-native start --reset-cache
```

### Building and Testing
```bash
# Run tests
npm test

# Run specific test file
npm test -- src/services/__tests__/api.test.ts

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Android Development
```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Generate signed APK
cd android && ./gradlew assembleRelease

# Install APK on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# View Android logs
npx react-native log-android
```

### iOS Development (macOS only)
```bash
# Install CocoaPods dependencies
cd ios && bundle exec pod install && cd ..

# Clean build
cd ios && xcodebuild clean && cd ..

# Open in Xcode
open ios/WasteManagementMobile.xcworkspace

# View iOS logs
npx react-native log-ios
```

## Architecture

### Navigation Structure
The app uses React Navigation with a hierarchical structure:

```
NavigationContainer
├── RootStack (Stack.Navigator)
│   ├── Auth Stack (not logged in)
│   │   ├── Login
│   │   └── Register
│   ├── CitizenStack (citizen users)
│   │   ├── CitizenTabs (Tab.Navigator)
│   │   │   ├── Home
│   │   │   ├── Training
│   │   │   ├── Schedule
│   │   │   └── Profile
│   │   ├── WasteValidation
│   │   └── QRCode
│   └── WorkerStack (worker users)
│       ├── WorkerTabs (Tab.Navigator)
│       │   ├── Dashboard
│       │   ├── Tasks
│       │   └── Scanner
│       └── WorkerProfile
```

The main entry point (`App.js`) handles:
- TensorFlow.js platform initialization for AI features
- Authentication state management via AsyncStorage
- Dynamic navigation based on user type (citizen/worker)

### API Service Architecture
The API service (`src/services/api.service.ts`) provides:
- Centralized HTTP client using Axios
- Automatic token management via interceptors
- Retry logic with exponential backoff
- Environment-specific base URL configuration
- Comprehensive error handling and logging

Key API endpoints:
- `/auth/*` - Authentication (login, register, logout)
- `/users/*` - User profile management
- `/pickups/*` - Pickup scheduling and management
- `/worker/*` - Worker-specific operations
- `/qr/*` - QR code generation/validation
- `/waste/*` - Waste validation

### State Management
- **Authentication**: Managed through AsyncStorage with tokens and user type
- **Navigation State**: Handled by React Navigation
- **Local Storage Keys**:
  - `authToken` - JWT authentication token
  - `userType` - Either 'citizen' or 'worker'
  - `userData` - User profile information

### AI/ML Features
The app includes TensorFlow.js integration for waste classification:
- Models loaded from `src/services/tensorflowSetup.js`
- Waste validation service in `src/services/aiWasteValidation.js`
- Image classification using MobileNet and COCO-SSD models
- Camera integration via Expo Camera API

## Backend Configuration

### API Base URL
Currently configured in `src/services/api.service.ts`:
- Development: `http://192.168.29.93:3000/api`
- Android Emulator: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`

Update the `getApiBaseUrl()` function in `src/services/api.service.ts` when deploying to production.

### Environment Detection
The app automatically detects the environment:
- Uses `__DEV__` flag to determine development mode
- Platform.OS to differentiate between Android and iOS
- Adjusts API URLs accordingly

## Project Dependencies

### Core Dependencies
- **React Native**: 0.81.1 - Mobile framework
- **Expo**: 54.0.2 - Development platform and SDK
- **React Navigation**: v7 - Navigation solution
- **Axios**: HTTP client for API calls
- **Socket.io-client**: Real-time communication

### AI/ML Libraries
- **@tensorflow/tfjs**: 4.22.0 - Machine learning framework
- **@tensorflow/tfjs-react-native**: TensorFlow.js React Native platform adapter
- **@tensorflow-models/mobilenet**: Pre-trained image classification model
- **@tensorflow-models/coco-ssd**: Object detection model

### UI/UX Libraries
- **react-native-vector-icons**: Icon library
- **expo-linear-gradient**: Gradient backgrounds
- **react-native-svg**: SVG rendering
- **react-native-qrcode-svg**: QR code generation
- **react-native-reanimated**: Animation library

### Camera & Media
- **expo-camera**: Camera access
- **expo-barcode-scanner**: QR/barcode scanning
- **expo-image-picker**: Image selection
- **expo-image-manipulator**: Image processing

## Error Handling Patterns

### Navigation Errors
When encountering navigation errors like "The action 'NAVIGATE' was not handled":
1. Verify the screen is registered in the correct navigator
2. Check navigator hierarchy - screens must be in the same stack
3. Use `navigation.navigate('ScreenName')` for same-stack navigation
4. For cross-stack navigation, use nested navigation patterns

### API Error Handling
The API service implements:
- Automatic retry on network failures (up to 3 attempts)
- Token refresh on 401 responses
- Graceful degradation with fallback endpoints
- Comprehensive error logging in development mode

## Testing Strategy

### Unit Tests
- API service methods: `src/services/__tests__/`
- Utility functions: Test pure functions in isolation
- Component logic: Test component methods and state

### Integration Tests
- Navigation flows between screens
- API integration with mock responses
- AsyncStorage persistence

### Manual Testing Checklist
- [ ] Authentication flow (login/register/logout)
- [ ] Citizen features: schedule pickup, view training, generate QR
- [ ] Worker features: view tasks, scan QR, update status
- [ ] Camera permissions and functionality
- [ ] Network error handling and offline behavior

## Performance Optimization

### Bundle Size
- Use dynamic imports for heavy features (TensorFlow models)
- Enable Hermes on Android for faster startup
- Minimize image assets using expo-optimize

### Memory Management
- Properly dispose TensorFlow models when not in use
- Clear navigation stack on logout
- Use FlatList for long lists with proper keyExtractor

### Network Optimization
- Implement request caching where appropriate
- Use pagination for large data sets
- Compress images before upload

## Security Considerations

### Authentication
- JWT tokens stored securely in AsyncStorage
- Automatic token cleanup on 401 responses
- User type validation on each app launch

### API Security
- All requests use HTTPS in production
- Bearer token authentication
- Request timeout configuration

### Data Privacy
- Camera permissions requested only when needed
- Location data handled with user consent
- Sensitive data never logged in production

## Deployment Checklist

### Before Release
1. Update API base URL to production endpoint
2. Disable console logs in production builds
3. Generate proper signing keys for Android/iOS
4. Test on real devices (various OS versions)
5. Update version number in package.json and app.json
6. Create production build configurations

### Android Release
```bash
# Generate release keystore (first time only)
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android && ./gradlew assembleRelease

# Build release AAB (for Play Store)
cd android && ./gradlew bundleRelease
```

### iOS Release
1. Open project in Xcode
2. Update bundle identifier and team
3. Archive and upload to App Store Connect
4. Submit for review

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache
npx react-native start --reset-cache
npx react-native clean

# Reset everything
watchman watch-del-all
rm -rf node_modules
npm install
cd ios && pod install && cd ..
```

### Android Build Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

### iOS Build Issues
```bash
# Clean build folder
cd ios
xcodebuild clean
pod install --repo-update
```

### TensorFlow.js Issues
If AI features fail to initialize:
1. Check model loading in tensorflowSetup.js
2. Verify camera permissions are granted
3. Ensure sufficient device memory
4. Check console for specific error messages

## Development Workflow

### Feature Development
1. Create feature branch from main
2. Implement feature following existing patterns
3. Test on both Android and iOS
4. Ensure linting passes
5. Update relevant documentation
6. Submit pull request

### Code Style
- TypeScript for new components
- Functional components with hooks
- Consistent naming: PascalCase for components, camelCase for functions
- Group imports: React, React Native, third-party, local

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic
- Test before committing