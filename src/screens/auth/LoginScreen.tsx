import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { clearAuthStorage, getAuthState } from '../../utils/clearStorage';

interface FormData {
  email: string;
  password: string;
}

const LoginScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { login } = useAuth();
  
  // Check auth state on mount (for debugging)
  React.useEffect(() => {
    if (__DEV__) {
      getAuthState(); // This will log the current auth state
    }
  }, []);
  
  const handleClearStorage = async () => {
    try {
      await clearAuthStorage();
      Alert.alert('Success', 'Storage cleared! Please restart the app for changes to take effect.', [
        { text: 'OK' }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://192.168.29.93:3000/api/auth/login', formData);
      
      if (response.data.success) {
        // Use the auth context to handle login
        await login(response.data.token, response.data.user.userType, response.data.user);
        
        Alert.alert('Success', 'Login successful!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          // Network error - server might not be running
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please ensure:\n\n' +
            '1. The backend server is running\n' +
            '2. MongoDB is running\n' +
            '3. Your device is connected to the same network\n' +
            '4. The IP address (192.168.29.93) is correct\n\n' +
            'Current server: http://192.168.29.93:3000',
            [
              { text: 'OK' },
              { 
                text: 'Retry', 
                onPress: handleLogin 
              }
            ]
          );
        } else if (error.response?.status === 401) {
          // Authentication failed
          Alert.alert(
            'Login Failed',
            error.response?.data?.message || 'Invalid email or password. Please check your credentials and try again.',
            [{ text: 'OK' }]
          );
        } else if (error.response?.status === 404) {
          // User not found
          Alert.alert(
            'Account Not Found',
            'No account found with this email. Please check your email or register a new account.',
            [
              { text: 'Register', onPress: () => navigation.navigate('Register' as never) },
              { text: 'OK' }
            ]
          );
        } else if (error.response?.status === 500) {
          // Server error - likely database issue
          const errorMessage = error.response?.data?.error || '';
          const isMongoError = errorMessage.includes('mongo') || errorMessage.includes('database');
          
          Alert.alert(
            'Server Error',
            isMongoError 
              ? 'Database connection failed. Please ensure MongoDB is running and try again.'
              : 'Something went wrong on our end. Please try again later.\n\nError: ' + errorMessage,
            [
              { text: 'OK' },
              { text: 'Retry', onPress: handleLogin }
            ]
          );
        } else {
          // Other errors
          Alert.alert(
            'Login Error',
            error.response?.data?.message || 'Failed to login. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Non-Axios error
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register' as never)}
          >
            <Text style={styles.linkText}>Don't have an account? Register here</Text>
          </TouchableOpacity>
          
          {/* Development Only - Clear Storage Button */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.linkButton, { marginTop: 10 }]}
              onPress={handleClearStorage}
            >
              <Text style={[styles.linkText, { color: '#FF5722' }]}>🔧 Clear Storage (Dev Only)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>🔐 Demo Credentials</Text>
          <Text style={styles.demoText}>
            <Text style={styles.demoBold}>Citizen Access:</Text> citizen@demo.com / demo123
          </Text>
          <Text style={styles.demoText}>
            <Text style={styles.demoBold}>Worker Access:</Text> worker@demo.com / demo123
          </Text>
          <Text style={styles.demoNote}>
            Note: Demo mode is active when backend server is not running.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  demoSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  demoBold: {
    fontWeight: 'bold',
  },
  demoNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
});

export default LoginScreen;
