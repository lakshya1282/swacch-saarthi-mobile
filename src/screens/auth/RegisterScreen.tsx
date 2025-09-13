import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  pincode: string;
  userType: 'citizen' | 'worker';
}

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    pincode: '',
    userType: 'citizen',
  });
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigation = useNavigation();
  const { login } = useAuth();

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location for waste pickup services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          Alert.alert('Permission denied', 'Location permission is required for registration.');
        }
      } else {
        getCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    // Simulate location for demo - real geolocation can be added later
    setTimeout(() => {
      setLocation({ latitude: 12.9716, longitude: 77.5946 }); // Bangalore coordinates
      setLocationLoading(false);
    }, 1000);
  };

  const validateForm = (): boolean => {
    if (!formData.firstName || !formData.lastName) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!formData.phone || !/^[6-9]\d{9}$/.test(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid Indian mobile number');
      return false;
    }
    
    if (!formData.password || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    if (!formData.address) {
      Alert.alert('Error', 'Please enter your address');
      return false;
    }
    
    if (!formData.pincode || !/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      Alert.alert('Error', 'Please enter a valid pincode');
      return false;
    }

    if (!location) {
      Alert.alert('Location Required', 'Please allow location access to register.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const userData = {
        ...formData,
        location: {
          latitude: location!.latitude,
          longitude: location!.longitude,
        },
      };

      // Make API call to register user
      const response = await axios.post('http://192.168.29.93:3000/api/auth/register', userData);
      
      if (response.data.success) {
        // Use the auth context to handle login
        await login(response.data.token, formData.userType, response.data.user);
        
        Alert.alert('Success', 'Registration successful!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Register for Waste Management</Text>
        <Text style={styles.subtitle}>Join us in making India cleaner!</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={(value) => handleChange('firstName', value)}
            />
          </View>
          
          <View style={styles.halfInput}>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={(value) => handleChange('lastName', value)}
            />
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phone}
          onChangeText={(value) => handleChange('phone', value)}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(value) => handleChange('password', value)}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(value) => handleChange('confirmPassword', value)}
          secureTextEntry
        />

        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Address"
          value={formData.address}
          onChangeText={(value) => handleChange('address', value)}
          multiline
          numberOfLines={3}
        />

        <TextInput
          style={styles.input}
          placeholder="Pincode"
          value={formData.pincode}
          onChangeText={(value) => handleChange('pincode', value)}
          keyboardType="numeric"
          maxLength={6}
        />

        <Text style={styles.label}>Register as:</Text>
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              formData.userType === 'citizen' && styles.selectedUserType,
            ]}
            onPress={() => handleChange('userType', 'citizen')}>
            <Text
              style={[
                styles.userTypeText,
                formData.userType === 'citizen' && styles.selectedUserTypeText,
              ]}>
              Citizen
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              formData.userType === 'worker' && styles.selectedUserType,
            ]}
            onPress={() => handleChange('userType', 'worker')}>
            <Text
              style={[
                styles.userTypeText,
                formData.userType === 'worker' && styles.selectedUserTypeText,
              ]}>
              Waste Worker
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationContainer}>
          <Text style={styles.label}>Location:</Text>
          {locationLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.locationText}>Getting your location...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>✓ Location captured</Text>
              <Text style={styles.coordinates}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
              <Text style={styles.refreshButtonText}>Refresh Location</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.registerButton, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.loginLinkText}>
            Already have an account? Login here
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedUserType: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  userTypeText: {
    fontSize: 16,
    color: '#666',
  },
  selectedUserTypeText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationInfo: {
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  locationText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 10,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  refreshButton: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#4CAF50',
    fontSize: 16,
  },
});

export default RegisterScreen;
