import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/env';

const API_BASE_URL = getApiBaseUrl();

const AadhaarRegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [workerId, setWorkerId] = useState(null);
  
  // Step 1: Aadhaar Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarValid, setAadhaarValid] = useState(false);
  
  // Step 2: Personal Details
  const [nameAsPerAadhaar, setNameAsPerAadhaar] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  
  // Step 3: Address Details
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Step 4: Contact & Auth
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 5: Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
  
  // Step 6: OTP Verification
  const [otp, setOtp] = useState('');
  const [demoOTP, setDemoOTP] = useState('');

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

  // Validate Aadhaar number
  const validateAadhaarNumber = async () => {
    if (aadhaarNumber.replace(/\s/g, '').length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/aadhaar/verify-number`, {
        aadhaarNumber: aadhaarNumber.replace(/\s/g, '')
      });

      if (response.data.success) {
        setAadhaarValid(true);
        setStep(2);
        Alert.alert('Success', 'Aadhaar number verified successfully');
      } else if (response.data.alreadyRegistered) {
        Alert.alert('Already Registered', 'This Aadhaar number is already registered. Please login instead.');
        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify Aadhaar number');
    } finally {
      setLoading(false);
    }
  };

  // Submit registration
  const submitRegistration = async () => {
    // Validate passwords match
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Validate required fields
    if (!phone || !password || !emergencyContactName || !emergencyContactPhone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        nameAsPerAadhaar,
        dateOfBirth: dateOfBirth.toISOString(),
        gender,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        phone,
        email,
        password,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
      };

      const response = await axios.post(`${API_BASE_URL}/aadhaar/register-worker`, registrationData);

      if (response.data.success) {
        setWorkerId(response.data.data.workerId);
        setDemoOTP(response.data.data.demoOTP);
        setStep(6);
        Alert.alert('Success', `Registration successful! Your OTP is: ${response.data.data.demoOTP}`);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/aadhaar/verify-otp`, {
        workerId,
        otp
      });

      if (response.data.success) {
        // Save authentication data
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userType', 'worker');
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.worker));
        
        Alert.alert('Success', 'Aadhaar verification completed successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('WorkerMain') }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/aadhaar/resend-otp`, {
        workerId
      });

      if (response.data.success) {
        setDemoOTP(response.data.data.demoOTP);
        Alert.alert('Success', `New OTP sent! Demo OTP: ${response.data.data.demoOTP}`);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Icon name="credit-card" size={80} color="#FF9800" style={styles.centerIcon} />
            <Text style={styles.stepTitle}>Aadhaar Verification</Text>
            <Text style={styles.stepDescription}>Enter your 12-digit Aadhaar number</Text>
            
            <TextInput
              style={styles.input}
              placeholder="XXXX XXXX XXXX"
              value={formatAadhaar(aadhaarNumber)}
              onChangeText={(text) => setAadhaarNumber(text.replace(/\s/g, ''))}
              keyboardType="numeric"
              maxLength={14} // 12 digits + 2 spaces
            />
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={validateAadhaarNumber}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Aadhaar</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Personal Details</Text>
            <Text style={styles.stepDescription}>Enter your details as per Aadhaar</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name (as per Aadhaar)"
              value={nameAsPerAadhaar}
              onChangeText={setNameAsPerAadhaar}
            />
            
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}>
              <Text>{dateOfBirth.toLocaleDateString()}</Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDateOfBirth(selectedDate);
                }}
              />
            )}
            
            <View style={styles.genderContainer}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                  onPress={() => setGender(g)}>
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(3)}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Address Details</Text>
            <Text style={styles.stepDescription}>Enter your address as per Aadhaar</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Address Line 1"
              value={addressLine1}
              onChangeText={setAddressLine1}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Address Line 2 (Optional)"
              value={addressLine2}
              onChangeText={setAddressLine2}
            />
            
            <TextInput
              style={styles.input}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            
            <TextInput
              style={styles.input}
              placeholder="State"
              value={state}
              onChangeText={setState}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(2)}>
                <Text style={styles.buttonTextSecondary}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => setStep(4)}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Contact & Authentication</Text>
            <Text style={styles.stepDescription}>Set up your login credentials</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(3)}>
                <Text style={styles.buttonTextSecondary}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => setStep(5)}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Emergency Contact</Text>
            <Text style={styles.stepDescription}>Provide emergency contact details</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Contact Phone"
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Relationship"
              value={emergencyContactRelationship}
              onChangeText={setEmergencyContactRelationship}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(4)}>
                <Text style={styles.buttonTextSecondary}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={submitRegistration}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Icon name="verified-user" size={80} color="#4CAF50" style={styles.centerIcon} />
            <Text style={styles.stepTitle}>OTP Verification</Text>
            <Text style={styles.stepDescription}>
              Enter the 6-digit OTP sent to {phone}
            </Text>
            
            {demoOTP && (
              <View style={styles.demoOTPContainer}>
                <Text style={styles.demoOTPText}>Demo OTP: {demoOTP}</Text>
              </View>
            )}
            
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={verifyOTP}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={resendOTP}
              disabled={loading}>
              <Text style={styles.linkText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
                s === step && styles.progressDotCurrent
              ]}
            />
          ))}
        </View>
        
        {renderStep()}
        
        {step === 1 && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already registered? Login</Text>
          </TouchableOpacity>
        )}
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
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#FF9800',
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepContainer: {
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
  },
  centerIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  otpInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 5,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  genderText: {
    color: '#666',
    fontSize: 16,
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9800',
    marginRight: 10,
  },
  buttonTextSecondary: {
    color: '#FF9800',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#FF9800',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  demoOTPContainer: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  demoOTPText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AadhaarRegisterScreen;