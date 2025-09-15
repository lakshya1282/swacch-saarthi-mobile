import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isLoggedIn: boolean;
  userType: string | null;
  userData: any;
  isLoading: boolean;
  login: (token: string, userType: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check login status on app start
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('Checking login status...');
      const token = await AsyncStorage.getItem('authToken');
      const type = await AsyncStorage.getItem('userType');
      const data = await AsyncStorage.getItem('userData');
      
      console.log('Found token:', !!token);
      console.log('Found userType:', type);
      
      if (token && type) {
        setIsLoggedIn(true);
        setUserType(type);
        if (data) {
          try {
            setUserData(JSON.parse(data));
          } catch (e) {
            console.log('Could not parse userData, using as string');
            setUserData(data);
          }
        }
      } else {
        console.log('No auth data found, user needs to login');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userType: string, userData: any) => {
    try {
      console.log('Storing auth token...');
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userType', userType);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      console.log('Auth data stored successfully');
      console.log('Token stored:', !!token);
      console.log('User type:', userType);
      
      setIsLoggedIn(true);
      setUserType(userType);
      setUserData(userData);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userType', 'userData']);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setIsLoggedIn(false);
      setUserType(null);
      setUserData(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      userType,
      userData,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
