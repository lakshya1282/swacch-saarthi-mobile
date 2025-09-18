import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import TensorFlow.js setup
import { initializeTensorFlowPlatform } from './src/services/tensorflowSetup';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
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
          
          return <Icon name={iconName} size={size} color={color} />;
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

// Worker Tab Navigator (without Profile tab since it's a stack screen)
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
          }
          
          return <Icon name={iconName} size={size} color={color} />;
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

// Worker Stack Navigator - This contains both the tabs and the profile screen
function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
      <Stack.Screen 
        name="WorkerProfile" 
        component={WorkerProfileScreen}
        options={{
          headerShown: false,
          // Add slide animation
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

// Citizen Stack Navigator
function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
      <Stack.Screen name="WasteValidation" component={WasteValidationScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
    </Stack.Navigator>
  );
}

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'citizen' or 'worker'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize TensorFlow.js platform first (non-blocking)
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
      
      // Check login status
      await checkLoginStatus();
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const type = await AsyncStorage.getItem('userType');
      
      if (token && type) {
        setIsLoggedIn(true);
        setUserType(type);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Add loading screen component here
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <RootStack.Screen name="Auth" component={AuthStack} />
        ) : userType === 'citizen' ? (
          <RootStack.Screen name="CitizenMain" component={CitizenStack} />
        ) : (
          <RootStack.Screen name="WorkerMain" component={WorkerStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}