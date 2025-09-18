# React Navigation Complete Guide - Fixing Navigation Errors

## Understanding the Navigation Error

### Why The Error Happens
The error `The action 'NAVIGATE' with payload {"name":"WorkerProfile"} was not handled by any navigator` occurs because:

1. **Screen Registration**: The screen you're trying to navigate to isn't registered in the current navigator context
2. **Navigator Hierarchy**: You're trying to navigate to a screen that exists in a different navigator level
3. **Nested Navigation**: The screen is in a parent/sibling navigator, not accessible from the current navigator

## The Solution: Proper Navigator Structure

### Navigator Hierarchy
```
NavigationContainer
  └── RootStack (Stack Navigator)
      ├── Auth Stack
      │   ├── Login
      │   └── Register
      ├── CitizenMain (Stack)
      │   ├── CitizenTabs
      │   ├── WasteValidation
      │   └── QRCode
      └── WorkerMain (Stack) ← This is the key!
          ├── WorkerTabs (Tab Navigator)
          │   ├── Dashboard (WorkerHomeScreen)
          │   ├── Tasks
          │   └── Scanner
          └── WorkerProfile ← Now at the same level as tabs!
```

## Key Changes Made

### 1. Created a WorkerStack Navigator
Instead of having WorkerProfile as a sibling to WorkerTabs, we wrapped both in a WorkerStack:

```javascript
function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
      <Stack.Screen 
        name="WorkerProfile" 
        component={WorkerProfileScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}
```

### 2. Updated Root Navigator
Changed from registering WorkerTabs directly to registering WorkerStack:

```javascript
// Before (WRONG):
<RootStack.Screen name="WorkerMain" component={WorkerTabs} />
<RootStack.Screen name="WorkerProfile" component={WorkerProfileScreen} />

// After (CORRECT):
<RootStack.Screen name="WorkerMain" component={WorkerStack} />
```

### 3. Simple Navigation Call
Now from WorkerHomeScreen, you can simply navigate:

```javascript
// This now works because WorkerProfile is in the same Stack Navigator
navigation.navigate('WorkerProfile');
```

## Navigation Methods Explained

### 1. Simple Navigation (Within Same Navigator)
```javascript
// When screens are in the same navigator
navigation.navigate('ScreenName');
```

### 2. Nested Navigation (Different Navigator)
```javascript
// Method 1: Navigate to parent then screen
navigation.navigate('ParentStack', {
  screen: 'TargetScreen'
});

// Method 2: Using getParent() - when navigating to parent navigator
navigation.getParent()?.navigate('ScreenName');

// Method 3: Reset navigation stack
navigation.reset({
  index: 0,
  routes: [{ name: 'TargetScreen' }],
});
```

### 3. Deep Linking Navigation
```javascript
// For deeply nested screens
navigation.navigate('RootStack', {
  screen: 'ParentStack',
  params: {
    screen: 'TargetScreen',
    params: {
      // params for TargetScreen
    }
  }
});
```

## Common Pitfalls and Solutions

### Pitfall 1: Registering Screens at Wrong Level
❌ **Wrong**: Putting stack screens as siblings to tab navigator
✅ **Right**: Wrapping both in a parent stack

### Pitfall 2: Using getParent() Unnecessarily
❌ **Wrong**: `navigation.getParent()?.navigate()` when screens are in same stack
✅ **Right**: `navigation.navigate()` for same-level navigation

### Pitfall 3: Not Understanding Navigator Context
Each navigator only knows about its direct children. A Tab Navigator doesn't know about screens in a sibling Stack Navigator.

## Testing Your Navigation

### 1. Check Registration
```javascript
// In your screen component
console.log(navigation.getState()); // Shows current navigation state
console.log(navigation.getParent()); // Shows parent navigator
```

### 2. Debug Navigation
```javascript
// Add this to see available routes
const state = navigation.getState();
console.log('Available routes:', state.routeNames);
```

## Complete Working Example

Here's your complete working navigation setup:

```javascript
// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

// Worker Stack - Contains tabs and profile
function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
      <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
    </Stack.Navigator>
  );
}

// Worker Tabs
function WorkerTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={WorkerHomeScreen} />
      <Tab.Screen name="Tasks" component={WorkerTasksScreen} />
      <Tab.Screen name="Scanner" component={WorkerScannerScreen} />
    </Tab.Navigator>
  );
}

// Main App
export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen name="WorkerMain" component={WorkerStack} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
```

```javascript
// WorkerHomeScreen.tsx
import { useNavigation } from '@react-navigation/native';

const WorkerHomeScreen = () => {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('WorkerProfile')}
    >
      <Text>Go to Profile</Text>
    </TouchableOpacity>
  );
};
```

## Summary

The key to fixing your navigation error was:
1. **Restructure the navigators** - Create a WorkerStack that contains both WorkerTabs and WorkerProfile
2. **Register at the right level** - Register WorkerStack (not WorkerTabs) in the root navigator
3. **Navigate simply** - Use `navigation.navigate('WorkerProfile')` without getParent()

This structure ensures that WorkerProfile is accessible from any screen within the WorkerStack, including screens inside WorkerTabs.