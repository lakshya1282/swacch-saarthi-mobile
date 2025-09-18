import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigation = useNavigation();

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone: Yup.string()
      .matches(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number')
      .required('Phone number is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
    address: Yup.string().required('Address is required'),
    pincode: Yup.string()
      .matches(/^[1-9][0-9]{5}$/, 'Enter a valid pincode')
      .required('Pincode is required'),
    userType: Yup.string().oneOf(['citizen', 'worker'], 'Select user type').required('User type is required'),
  });

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
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setLocationLoading(false);
      },
      (error) => {
        console.error(error);
        setLocationLoading(false);
        Alert.alert('Location Error', 'Unable to fetch your location. Please enable GPS and try again.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const handleRegister = async (values) => {
    if (!location) {
      Alert.alert('Location Required', 'Please allow location access to register.');
      return;
    }

    try {
      const userData = {
        ...values,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      };

      // Make API call to register user
      const response = await axios.post('http://your-api-url/api/auth/register', userData);
      
      if (response.data.success) {
        // Save user data to AsyncStorage
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userType', values.userType);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        
        Alert.alert('Success', 'Registration successful!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Register for Waste Management</Text>
        <Text style={styles.subtitle}>Join us in making India cleaner!</Text>
      </View>

      <Formik
        initialValues={{
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          address: '',
          pincode: '',
          userType: 'citizen',
        }}
        validationSchema={validationSchema}
        onSubmit={handleRegister}>
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={values.firstName}
                  onChangeText={handleChange('firstName')}
                  onBlur={handleBlur('firstName')}
                />
                {touched.firstName && errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>
              
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={values.lastName}
                  onChangeText={handleChange('lastName')}
                  onBlur={handleBlur('lastName')}
                />
                {touched.lastName && errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={values.email}
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {touched.email && errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={values.phone}
              onChangeText={handleChange('phone')}
              onBlur={handleBlur('phone')}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {touched.phone && errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={values.password}
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              secureTextEntry
            />
            {touched.password && errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={values.confirmPassword}
              onChangeText={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              secureTextEntry
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Address"
              value={values.address}
              onChangeText={handleChange('address')}
              onBlur={handleBlur('address')}
              multiline
              numberOfLines={3}
            />
            {touched.address && errors.address && (
              <Text style={styles.errorText}>{errors.address}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Pincode"
              value={values.pincode}
              onChangeText={handleChange('pincode')}
              onBlur={handleBlur('pincode')}
              keyboardType="numeric"
              maxLength={6}
            />
            {touched.pincode && errors.pincode && (
              <Text style={styles.errorText}>{errors.pincode}</Text>
            )}

            <Text style={styles.label}>Register as:</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  values.userType === 'citizen' && styles.selectedUserType,
                ]}
                onPress={() => setFieldValue('userType', 'citizen')}>
                <Text
                  style={[
                    styles.userTypeText,
                    values.userType === 'citizen' && styles.selectedUserTypeText,
                  ]}>
                  Citizen
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  values.userType === 'worker' && styles.selectedUserType,
                ]}
                onPress={() => {
                  // Navigate to Aadhaar registration for workers
                  Alert.alert(
                    'Worker Registration',
                    'Workers must register with Aadhaar verification for security.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Register with Aadhaar', 
                        onPress: () => navigation.navigate('AadhaarRegister')
                      }
                    ]
                  );
                }}>
                <Text
                  style={[
                    styles.userTypeText,
                    values.userType === 'worker' && styles.selectedUserTypeText,
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

            <TouchableOpacity style={styles.registerButton} onPress={handleSubmit}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>
                Already have an account? Login here
              </Text>
            </TouchableOpacity>
            
            {/* Prominent Aadhaar Registration Button for Workers */}
            <View style={styles.aadhaarSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity
                style={styles.aadhaarButton}
                onPress={() => navigation.navigate('AadhaarRegister')}>
                <Text style={styles.aadhaarIcon}>🔐</Text>
                <View style={styles.aadhaarTextContainer}>
                  <Text style={styles.aadhaarButtonText}>Register as Worker with Aadhaar</Text>
                  <Text style={styles.aadhaarButtonSubtext}>Secure verification for waste management workers</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Formik>
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
    marginBottom: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 5,
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
  aadhaarSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    fontWeight: '600',
  },
  aadhaarButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  aadhaarIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  aadhaarTextContainer: {
    flex: 1,
  },
  aadhaarButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  aadhaarButtonSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default RegisterScreen;
