import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar, View, Text } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AttendanceProvider, useAttendance } from './src/contexts/AttendanceContext';

// Import screens
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/citizen/HomeScreen';
import TrainingScreen from './src/screens/citizen/TrainingScreen';
import SchedulePickupScreen from './src/screens/citizen/SchedulePickupScreen';
import ProfileScreen from './src/screens/citizen/ProfileScreen';
import WasteValidationScreen from './src/screens/citizen/WasteValidationScreen';
import QRCodeScreen from './src/screens/citizen/QRCodeScreen';
import SettingsScreen from './src/screens/citizen/SettingsScreen';
import PickupHistoryScreen from './src/screens/citizen/PickupHistoryScreen';

// Worker screens
import WorkerHomeScreen from './src/screens/worker/WorkerHomeScreen';
import WorkerTasksScreen from './src/screens/worker/WorkerTasksScreen';
import WorkerScannerScreen from './src/screens/worker/WorkerScannerScreen';
import AttendanceScreen from './src/screens/worker/AttendanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Citizen Tab Navigator
function CitizenTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Training') {
            iconName = 'school';
          } else if (route.name === 'Schedule') {
            iconName = 'schedule';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'help';
          }
          
          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Training" component={TrainingScreen} />
      <Tab.Screen name="Schedule" component={SchedulePickupScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Worker Navigator with Attendance Check
function WorkerNavigator() {
  const { hasMarkedAttendance, isCheckingAttendance, markAttendanceComplete } = useAttendance();
  
  if (isCheckingAttendance) {
    // Show loading screen while checking attendance
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <MaterialIcons name="access-time" size={48} color="#FF9800" />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#333', fontWeight: 'bold' }}>Checking Attendance...</Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 30 }}>
          Please wait while we verify your attendance status for today.
        </Text>
      </View>
    );
  }
  
  if (!hasMarkedAttendance) {
    // Show attendance screen if not marked
    return (
      <AttendanceScreen 
        onAttendanceMarked={markAttendanceComplete}
      />
    );
  }
  
  // Show normal worker tabs if attendance is marked
  return <WorkerTabs />;
}

// Worker Tab Navigator
function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          
          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Scanner') {
            iconName = 'qr-code-scanner';
          } else {
            iconName = 'help';
          }
          
          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF9800',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#FF9800',
        },
        headerTintColor: '#fff',
      })}>
      <Tab.Screen name="Dashboard" component={WorkerHomeScreen} />
      <Tab.Screen name="Tasks" component={WorkerTasksScreen} />
      <Tab.Screen name="Scanner" component={WorkerScannerScreen} />
    </Tab.Navigator>
  );
}

// Navigation Component
function AppNavigator() {
  const { isLoggedIn, userType, isLoading } = useAuth();

  if (isLoading) {
    return null; // Add loading screen component here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : userType === 'citizen' ? (
          <>
            <Stack.Screen name="CitizenMain" component={CitizenTabs} />
            <Stack.Screen name="WasteValidation" component={WasteValidationScreen} />
            <Stack.Screen name="QRCode" component={QRCodeScreen} />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ headerShown: true, headerTitle: 'Settings' }}
            />
            <Stack.Screen 
              name="PickupHistory" 
              component={PickupHistoryScreen}
              options={{ headerShown: true, headerTitle: 'Pickup History' }}
            />
          </>
        ) : (
          <Stack.Screen name="WorkerMain" component={WorkerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main App Component
function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <AuthProvider>
        <AttendanceProvider>
          <AppNavigator />
        </AttendanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
