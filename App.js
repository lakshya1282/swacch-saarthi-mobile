import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import TensorFlow.js setup
import { initializeTensorFlowPlatform } from './src/services/tensorflowSetup';

// Import AuthProvider
import { AuthProvider } from './src/contexts/AuthContext';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import AadhaarRegisterScreen from './src/screens/auth/AadhaarRegisterScreen';
import AadhaarLoginScreen from './src/screens/auth/AadhaarLoginScreen';
import HomeScreen from './src/screens/citizen/HomeScreen';
import TrainingScreen from './src/screens/citizen/TrainingScreen';
import SchedulePickupScreen from './src/screens/citizen/SchedulePickupScreen';
import ProfileScreen from './src/screens/citizen/ProfileScreen';
import WasteValidationScreen from './src/screens/citizen/WasteValidationScreen';
import QRCodeScreen from './src/screens/citizen/QRCodeScreen';

// Worker screens
import WorkerHomeScreen from './src/screens/worker/WorkerHomeScreen';
import WorkerTasksScreen from './src/screens/worker/WorkerTasksScreen';
import WorkerScannerScreen from './src/screens/worker/WorkerScannerScreen';
import WorkerProfileScreen from './src/screens/worker/WorkerProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

// Citizen Tab Navigator
function CitizenTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Training') {
            iconName = 'school';
          } else if (route.name === 'Schedule') {
            iconName = 'schedule';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          
          return <MaterialIcons name={iconName} size={size} color={color} />;
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

// Worker Tab Navigator
function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Scanner') {
            iconName = 'qr-code-scanner';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          
          return <MaterialIcons name={iconName} size={size} color={color} />;
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
      <Tab.Screen name="Profile" component={WorkerProfileScreen} />
    </Tab.Navigator>
  );
}

// Worker Stack Navigator - Contains both tabs and profile screen
function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
    </Stack.Navigator>
  );
}

// Import useAuth hook
import { useAuth } from './src/contexts/AuthContext';

// Main Navigation Component
function AppNavigation() {
  const { isLoggedIn, userType, isLoading } = useAuth();

  if (isLoading) {
    return null; // Add loading screen component here
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen name="AadhaarRegister" component={AadhaarRegisterScreen} />
            <RootStack.Screen name="AadhaarLogin" component={AadhaarLoginScreen} />
          </>
        ) : userType === 'citizen' ? (
          <>
            <RootStack.Screen name="CitizenMain" component={CitizenTabs} />
            <RootStack.Screen name="WasteValidation" component={WasteValidationScreen} />
            <RootStack.Screen name="QRCode" component={QRCodeScreen} />
          </>
        ) : (
          <RootStack.Screen name="WorkerMain" component={WorkerStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// Main App Component with AuthProvider
export default function App() {
  useEffect(() => {
    // Initialize TensorFlow.js platform (non-blocking)
    console.log('🚀 Initializing TensorFlow.js platform...');
    initializeTensorFlowPlatform().then((success) => {
      if (success) {
        console.log('✅ TensorFlow.js platform ready');
      } else {
        console.log('⚠️ TensorFlow.js platform initialization failed - AI features may not work');
      }
    }).catch((error) => {
      console.log('⚠️ TensorFlow.js platform error:', error.message);
    });
  }, []);

  return (
    <AuthProvider>
      <AppNavigation />
    </AuthProvider>
  );
}
