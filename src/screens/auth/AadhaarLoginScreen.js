import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = Platform.select({
  android: 'http://192.168.29.93:3000/api',
  ios: 'http://localhost:3000/api',
});

const AadhaarLoginScreen = ({ navigation }) => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Format Aadhaar number with spaces
  const formatAadhaar = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/^(\d{0,4})(\d{0,4})(\d{0,4})$/);
    if (match) {
      const formatted = [match[1], match[2], match[3]].filter(Boolean).join(' ');
      return formatted;
    }
    return text;
  };

  const handleLogin = async () => {
    const cleanedAadhaar = aadhaarNumber.replace(/\s/g, '');
    
    if (cleanedAadhaar.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/aadhaar/login`, {
        aadhaarNumber: cleanedAadhaar,
        password,
      });

      if (response.data.success) {
        // Save authentication data
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userType', 'worker');
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.worker));
        
        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => navigation.navigate('WorkerMain') }
        ]);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        const status = error.response.data.verificationStatus;
        const workerId = error.response.data.workerId;
        
        if (status === 'pending' || status === 'otp_sent') {
          Alert.alert(
            'Verification Pending',
            'Your Aadhaar verification is pending. Would you like to complete it now?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Verify Now', 
                onPress: () => {
                  // Navigate to OTP verification with workerId
                  navigation.navigate('AadhaarRegister', { 
                    step: 6, 
                    workerId: workerId 
                  });
                }
              }
            ]
          );
        } else if (status === 'failed') {
          Alert.alert('Verification Failed', 'Your Aadhaar verification has failed. Please contact support.');
        } else if (status === 'rejected') {
          Alert.alert('Registration Rejected', 'Your registration has been rejected. Please contact support.');
        }
      } else {
        Alert.alert('Login Failed', error.response?.data?.message || 'Invalid Aadhaar number or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <Icon name="fingerprint" size={80} color="#FF9800" />
          <Text style={styles.title}>Worker Login</Text>
          <Text style={styles.subtitle}>Login with your Aadhaar credentials</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Icon name="credit-card" size={24} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter 12-digit Aadhaar Number"
              value={formatAadhaar(aadhaarNumber)}
              onChangeText={(text) => setAadhaarNumber(text.replace(/\s/g, ''))}
              keyboardType="numeric"
              maxLength={14} // 12 digits + 2 spaces
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={24} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}>
              <Icon
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="login" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.loginButtonText}>Login with Aadhaar</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            <TouchableOpacity
              onPress={() => Alert.alert('Forgot Password', 'Please contact your supervisor to reset your password')}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>New Worker?</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('AadhaarRegister')}>
          <Icon name="person-add" size={20} color="#FF9800" style={{ marginRight: 8 }} />
          <Text style={styles.registerButtonText}>Register with Aadhaar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}>
          <Icon name="arrow-back" size={20} color="#666" style={{ marginRight: 8 }} />
          <Text style={styles.backButtonText}>Back to Regular Login</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Icon name="info" size={20} color="#1976D2" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Aadhaar Authentication</Text>
            <Text style={styles.infoText}>
              This login is exclusively for registered waste management workers. 
              Your Aadhaar details are securely verified and protected.
            </Text>
          </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  links: {
    alignItems: 'center',
    marginTop: 15,
  },
  linkText: {
    color: '#FF9800',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  registerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  registerButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
});

export default AadhaarLoginScreen;