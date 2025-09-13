import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiService from '../../services/api.service';

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  alternativePhone: string;
  address: string;
  pincode: string;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const profile = (route.params as any)?.profile;

  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phone: '',
    alternativePhone: '',
    address: '',
    pincode: '',
  });

  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [altPhoneAvailable, setAltPhoneAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        alternativePhone: profile.alternativePhone || '',
        address: profile.address || '',
        pincode: profile.pincode || '000000', // Default pincode if missing
      });
    }
  }, [profile]);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePincode = (pincode: string): boolean => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  };

  const checkPhoneAvailability = async (phone: string, isAlternative: boolean = false) => {
    if (!validatePhone(phone)) {
      if (isAlternative) {
        setAltPhoneAvailable(false);
      } else {
        setPhoneAvailable(false);
      }
      return;
    }

    if (phone === profile?.phone && !isAlternative) {
      setPhoneAvailable(true);
      return;
    }

    if (phone === profile?.alternativePhone && isAlternative) {
      setAltPhoneAvailable(true);
      return;
    }

    setCheckingPhone(true);
    try {
      const response = await apiService.checkPhoneAvailability(phone);
      if (isAlternative) {
        setAltPhoneAvailable(response.available);
        if (!response.available) {
          setErrors(prev => ({
            ...prev,
            alternativePhone: 'This number belongs to another user',
          }));
        } else {
          setErrors(prev => ({ ...prev, alternativePhone: undefined }));
        }
      } else {
        setPhoneAvailable(response.available);
        if (!response.available) {
          setErrors(prev => ({
            ...prev,
            phone: 'Phone number already in use by another user',
          }));
        } else {
          setErrors(prev => ({ ...prev, phone: undefined }));
        }
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setCheckingPhone(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (formData.alternativePhone && !validatePhone(formData.alternativePhone)) {
      newErrors.alternativePhone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (formData.pincode && formData.pincode !== '000000' && !validatePincode(formData.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    if (phoneAvailable === false) {
      Alert.alert('Error', 'Phone number is already in use');
      return;
    }

    if (altPhoneAvailable === false) {
      Alert.alert('Error', 'Alternative phone number belongs to another user');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {};
      
      if (formData.firstName !== profile?.firstName) updateData.firstName = formData.firstName;
      if (formData.lastName !== profile?.lastName) updateData.lastName = formData.lastName;
      if (formData.phone !== profile?.phone) updateData.phone = formData.phone;
      if (formData.alternativePhone !== profile?.alternativePhone) {
        updateData.alternativePhone = formData.alternativePhone || null;
      }
      if (formData.address !== profile?.address) updateData.address = formData.address;
      if (formData.pincode !== profile?.pincode) updateData.pincode = formData.pincode;

      if (Object.keys(updateData).length === 0) {
        Alert.alert('No Changes', 'No changes were made to your profile');
        return;
      }

      await apiService.updateUserProfile(updateData);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    key: keyof ProfileData,
    placeholder: string,
    keyboardType: any = 'default',
    icon: string,
    onBlur?: () => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <MaterialIcons name={icon as any} size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, errors[key] ? styles.inputError : null]}
          value={value}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, [key]: text }));
            setErrors(prev => ({ ...prev, [key]: undefined }));
          }}
          placeholder={placeholder}
          keyboardType={keyboardType}
          onBlur={onBlur}
        />
        {key === 'phone' && checkingPhone && !altPhoneAvailable && (
          <ActivityIndicator size="small" color="#4CAF50" />
        )}
        {key === 'alternativePhone' && checkingPhone && altPhoneAvailable === null && (
          <ActivityIndicator size="small" color="#4CAF50" />
        )}
        {key === 'phone' && phoneAvailable === false && (
          <MaterialIcons name="error" size={20} color="#f44336" />
        )}
        {key === 'alternativePhone' && altPhoneAvailable === false && (
          <MaterialIcons name="error" size={20} color="#f44336" />
        )}
        {key === 'phone' && phoneAvailable === true && (
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        )}
        {key === 'alternativePhone' && altPhoneAvailable === true && formData.alternativePhone && (
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        )}
      </View>
      {errors[key] && (
        <Text style={styles.errorText}>{errors[key]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {renderInput(
              'First Name',
              formData.firstName,
              'firstName',
              'Enter your first name',
              'default',
              'person'
            )}

            {renderInput(
              'Last Name',
              formData.lastName,
              'lastName',
              'Enter your last name',
              'default',
              'person-outline'
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {renderInput(
              'Phone Number',
              formData.phone,
              'phone',
              'Enter your phone number',
              'phone-pad',
              'phone',
              () => checkPhoneAvailability(formData.phone)
            )}

            {renderInput(
              'Alternative Phone (Optional)',
              formData.alternativePhone,
              'alternativePhone',
              'Enter alternative phone number',
              'phone-pad',
              'phone-android',
              () => formData.alternativePhone && checkPhoneAvailability(formData.alternativePhone, true)
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Information</Text>
            
            {renderInput(
              'Address',
              formData.address,
              'address',
              'Enter your full address',
              'default',
              'location-on'
            )}

            {renderInput(
              'Pincode',
              formData.pincode,
              'pincode',
              'Enter your pincode',
              'numeric',
              'pin-drop'
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    marginLeft: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default SettingsScreen;