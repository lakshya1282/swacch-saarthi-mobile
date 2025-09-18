import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

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
import WorkerProfileScreen from './src/screens/worker/WorkerProfileScreen';
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
          } else if (route.name === 'Attendance') {
            iconName = 'access-time';
          } else if (route.name === 'Scanner') {
            iconName = 'qr-code-scanner';
          } else if (route.name === 'Profile') {
            iconName = 'person';
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
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
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
          <>
            <Stack.Screen name="WorkerMain" component={WorkerTabs} />
            <Stack.Screen 
              name="WorkerProfile" 
              component={WorkerProfileScreen}
              options={{
                headerShown: true,
                headerTitle: 'Profile',
                headerStyle: { backgroundColor: '#FF9800' },
                headerTintColor: '#fff',
              }}
            />
          </>
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
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
