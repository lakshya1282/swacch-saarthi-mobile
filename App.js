import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

// Main App Component
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'citizen' or 'worker'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : userType === 'citizen' ? (
          <>
            <Stack.Screen name="CitizenMain" component={CitizenTabs} />
            <Stack.Screen name="WasteValidation" component={WasteValidationScreen} />
            <Stack.Screen name="QRCode" component={QRCodeScreen} />
          </>
        ) : (
          <Stack.Screen name="WorkerMain" component={WorkerTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
