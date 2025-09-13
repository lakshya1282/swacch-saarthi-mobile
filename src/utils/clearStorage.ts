import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all authentication-related data from AsyncStorage
 * Use this during development to reset the app state
 */
export const clearAuthStorage = async (): Promise<void> => {
  try {
    const keys = ['authToken', 'userType', 'userData'];
    await AsyncStorage.multiRemove(keys);
    console.log('✅ Auth storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
    throw error;
  }
};

/**
 * Clear ALL AsyncStorage data
 * WARNING: This will remove all stored data
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('✅ All storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing all storage:', error);
    throw error;
  }
};

/**
 * Get current auth state from storage
 * Useful for debugging
 */
export const getAuthState = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const userType = await AsyncStorage.getItem('userType');
    const userData = await AsyncStorage.getItem('userData');
    
    console.log('Current Auth State:');
    console.log('Token:', token ? 'Present' : 'Not set');
    console.log('User Type:', userType || 'Not set');
    console.log('User Data:', userData ? JSON.parse(userData) : 'Not set');
    
    return {
      hasToken: !!token,
      userType,
      userData: userData ? JSON.parse(userData) : null
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
};
