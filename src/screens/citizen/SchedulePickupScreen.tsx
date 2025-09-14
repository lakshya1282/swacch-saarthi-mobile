import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';

interface WasteType {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
}

interface TimeSlot {
  id: string;
  label: string;
  value: string;
}

const SchedulePickupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([
    { id: '1', name: 'Dry Waste', icon: 'recycling', selected: false },
    { id: '2', name: 'Wet Waste', icon: 'eco', selected: false },
    { id: '3', name: 'Hazardous Waste', icon: 'warning', selected: false },
    { id: '4', name: 'Electronic Waste', icon: 'computer', selected: false },
    { id: '5', name: 'Medical Waste', icon: 'local-hospital', selected: false },
  ]);
  
  const [timeSlots] = useState<TimeSlot[]>([
    { id: '1', label: 'Morning (6:00 AM - 10:00 AM)', value: '6:00 AM - 10:00 AM' },
    { id: '2', label: 'Mid-day (10:00 AM - 2:00 PM)', value: '10:00 AM - 2:00 PM' },
    { id: '3', label: 'Afternoon (2:00 PM - 6:00 PM)', value: '2:00 PM - 6:00 PM' },
    { id: '4', label: 'Evening (6:00 PM - 10:00 PM)', value: '6:00 PM - 10:00 PM' },
  ]);
  
  const [formData, setFormData] = useState({
    estimatedWeight: '',
    specialInstructions: '',
    selectedTimeSlot: '',
    scheduledDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('=== Loading User Data ===');
      const storedUserData = await AsyncStorage.getItem('userData');
      const authToken = await AsyncStorage.getItem('authToken');
      const userType = await AsyncStorage.getItem('userType');
      
      console.log('Stored userData:', storedUserData);
      console.log('Auth token exists:', !!authToken);
      console.log('User type:', userType);
      
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        console.log('Parsed user data:', parsedUserData);
      } else {
        console.log('No user data found in AsyncStorage');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const toggleWasteType = (id: string) => {
    setWasteTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, selected: !type.selected } : type
      )
    );
  };

  const selectTimeSlot = (value: string) => {
    setFormData(prev => ({ ...prev, selectedTimeSlot: value }));
  };

  const validateForm = (): boolean => {
    const selectedWastes = wasteTypes.filter(type => type.selected);
    
    if (selectedWastes.length === 0) {
      Alert.alert('Error', 'Please select at least one waste type');
      return false;
    }
    
    if (!formData.selectedTimeSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return false;
    }
    
    if (!formData.estimatedWeight.trim()) {
      Alert.alert('Error', 'Please enter estimated weight');
      return false;
    }
    
    return true;
  };

  const generatePickupId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `PU${timestamp}${Math.floor(Math.random() * 1000)}`;
  };

  const handleSchedulePickup = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      console.log('=== Schedule Pickup Debug ===');
      console.log('User Data:', userData);
      
      const selectedWastes = wasteTypes.filter(type => type.selected);
      const pickupData = {
        pickupId: generatePickupId(),
        userId: userData?.id || 'guest',
        customerName: userData ? `${userData.name || userData.firstName + ' ' + userData.lastName || 'User'}` : 'Guest User',
        customerPhone: userData?.phone || 'Not provided',
        customerAddress: userData?.address || 'Address not specified',
        customerPincode: userData?.pincode || '',
        wasteTypes: selectedWastes.map(type => type.name),
        estimatedWeight: formData.estimatedWeight,
        timeSlot: formData.selectedTimeSlot,
        specialInstructions: formData.specialInstructions,
        scheduledDate: formData.scheduledDate,
        scheduledTime: new Date().toLocaleTimeString(),
        location: {
          latitude: 12.9716, // Default Bangalore coordinates
          longitude: 77.5946
        },
        address: userData?.address || 'Address not specified',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      console.log('Pickup Data to send:', JSON.stringify(pickupData, null, 2));
      
      const response = await apiService.schedulePickup(pickupData);
      
      console.log('API Response:', response.status, response.data);
      
      if (response.data && response.data.success) {
        const { pickupId, verificationCode, estimatedArrival, qrCodeData } = response.data.data;
        
        // Generate QR code data with verification code
        const qrData = {
          pickupId: pickupId,
          userId: userData?.id || 'guest',
          customerName: userData ? `${userData.name || userData.firstName + ' ' + userData.lastName || 'User'}` : 'Guest User',
          wasteTypes: selectedWastes.map(type => type.name),
          estimatedWeight: formData.estimatedWeight,
          timeSlot: formData.selectedTimeSlot,
          scheduledDate: formData.scheduledDate,
          address: userData?.address || 'Address not specified',
          verificationCode: verificationCode,
          location: {
            latitude: 12.9716,
            longitude: 77.5946
          },
          timestamp: new Date().toISOString()
        };
        
        // Save complete pickup data locally with QR code data
        await AsyncStorage.setItem(`pickup_${pickupId}`, JSON.stringify({
          pickupId,
          verificationCode,
          scheduledDate: estimatedArrival,
          qrCodeData: qrData,
          status: 'pending',
          createdAt: new Date().toISOString()
        }));
        
        Alert.alert(
          'Pickup Scheduled Successfully! 🎉', 
          `Pickup ID: ${pickupId}\n\n✅ QR Code generated for verification\n✅ Verification Code: ${verificationCode}\n\n📱 Your QR code is ready:\n• Go to the QR Code tab to view it\n• Show it to the worker for verification\n• Keep your verification code safe\n\nEstimated Arrival: ${new Date(estimatedArrival).toLocaleDateString()}`,
          [
            { 
              text: 'View QR Code', 
              onPress: () => {
                // Navigate to QR Code screen
                // navigation.navigate('QRCode' as never);
              }
            },
            { 
              text: 'OK', 
              onPress: () => {
                // Reset form
                setWasteTypes(prev => prev.map(type => ({ ...type, selected: false })));
                setFormData({
                  estimatedWeight: '',
                  specialInstructions: '',
                  selectedTimeSlot: '',
                  scheduledDate: new Date().toISOString().split('T')[0],
                });
              },
              style: 'cancel'
            }
          ]
        );
      } else {
        console.log('API returned non-success response:', response.data);
        Alert.alert('Error', response.data?.message || 'Failed to schedule pickup');
      }
    } catch (error: any) {
      console.error('Pickup scheduling error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      
      // Save locally as fallback when backend is not available
      try {
        const existingPickups = await AsyncStorage.getItem('localPickups');
        const pickups = existingPickups ? JSON.parse(existingPickups) : [];
        
        const selectedWastes = wasteTypes.filter(type => type.selected);
        const localPickup = {
          pickupId: generatePickupId(),
          userId: userData?.id || 'guest',
          customerName: userData ? `${userData.firstName} ${userData.lastName}` : 'Guest User',
          customerPhone: userData?.phone || 'Not provided',
          customerAddress: userData?.address || 'Address not specified',
          wasteTypes: selectedWastes.map(type => type.name),
          estimatedWeight: formData.estimatedWeight,
          timeSlot: formData.selectedTimeSlot,
          specialInstructions: formData.specialInstructions,
          scheduledDate: formData.scheduledDate,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        
        pickups.push(localPickup);
        await AsyncStorage.setItem('localPickups', JSON.stringify(pickups));
        
        Alert.alert(
          'Success!', 
          `Pickup scheduled successfully (offline)!\n\nPickup ID: ${localPickup.pickupId}\n\nYour pickup has been saved and will sync when connection is restored.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Reset form
                setWasteTypes(prev => prev.map(type => ({ ...type, selected: false })));
                setFormData({
                  estimatedWeight: '',
                  specialInstructions: '',
                  selectedTimeSlot: '',
                  scheduledDate: new Date().toISOString().split('T')[0],
                });
              }
            }
          ]
        );
      } catch (storageError) {
        console.error('Error saving pickup locally:', storageError);
        Alert.alert(
          'Error', 
          'Failed to schedule pickup. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Development helper function to test connectivity
  const testConnectivity = async () => {
    try {
      console.log('Testing server connectivity...');
      const response = await fetch('http://192.168.29.93:3000/api/health');
      const data = await response.json();
      
      Alert.alert(
        'Connection Test', 
        `Server Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`,
        [{ text: 'OK' }]
      );
      
      console.log('Server health check:', response.status, data);
    } catch (error) {
      console.error('Connectivity test failed:', error);
      Alert.alert(
        'Connection Failed', 
        `Error: ${error.message}\n\nCheck if server is running on http://192.168.29.93:3000`,
        [{ text: 'OK' }]
      );
    }
  };
  
  // Development helper to test QR code generation
  const testQRCodeGeneration = async () => {
    try {
      console.log('Testing QR Code generation...');
      
      const selectedWastes = wasteTypes.filter(type => type.selected);
      if (selectedWastes.length === 0) {
        Alert.alert('Error', 'Please select at least one waste type for the test');
        return;
      }
      
      const testPickup = {
        pickupId: `QR_TEST_${Date.now()}`,
        userId: userData?.id || 'test_user',
        customerName: userData?.name || 'QR Test User',
        customerPhone: userData?.phone || '+91 9876543210',
        customerAddress: userData?.address || 'QR Test Address, Bangalore',
        wasteTypes: selectedWastes.map(type => type.name),
        estimatedWeight: formData.estimatedWeight || '3kg',
        timeSlot: formData.selectedTimeSlot || 'Morning (6:00 AM - 10:00 AM)',
        scheduledDate: formData.scheduledDate,
        specialInstructions: 'QR Code test pickup',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const response = await apiService.schedulePickup(testPickup);
      
      if (response.data?.success) {
        const { pickupId, verificationCode } = response.data.data;
        
        // Generate and save QR code data locally
        const qrData = {
          pickupId,
          userId: testPickup.userId,
          customerName: testPickup.customerName,
          wasteTypes: testPickup.wasteTypes,
          estimatedWeight: testPickup.estimatedWeight,
          timeSlot: testPickup.timeSlot,
          scheduledDate: testPickup.scheduledDate,
          address: testPickup.customerAddress,
          verificationCode,
          location: { latitude: 12.9716, longitude: 77.5946 },
          timestamp: new Date().toISOString()
        };
        
        await AsyncStorage.setItem(`pickup_${pickupId}`, JSON.stringify({
          pickupId,
          verificationCode,
          qrCodeData: qrData,
          status: 'pending',
          createdAt: new Date().toISOString()
        }));
        
        Alert.alert(
          '✅ QR Code Test Successful!',
          `Pickup ID: ${pickupId}\nVerification Code: ${verificationCode}\n\n📱 QR Code generated and saved locally!\n\n🔍 You can now:\n• View the QR code in the QR tab\n• Test worker scanning with this verification code\n• Use either QR scan or manual code entry`,
          [{ text: 'Great!' }]
        );
        
        console.log('✅ QR Test successful:', { pickupId, verificationCode, qrData });
      } else {
        throw new Error(response.data?.message || 'Failed to create test pickup');
      }
    } catch (error) {
      console.error('QR test failed:', error);
      Alert.alert(
        '❌ QR Test Failed',
        `Error: ${error.message}\n\nCheck console for details`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule Pickup</Text>
        <Text style={styles.subtitle}>Schedule waste collection</Text>
      </View>

      <View style={styles.content}>
        {/* Waste Type Selection */}
        <Text style={styles.sectionTitle}>Select Waste Types</Text>
        <View style={styles.wasteTypesContainer}>
          {wasteTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.wasteTypeCard,
                type.selected && styles.selectedWasteType
              ]}
              onPress={() => toggleWasteType(type.id)}
            >
              <MaterialIcons 
                name={type.icon as any} 
                size={24} 
                color={type.selected ? '#fff' : '#4CAF50'} 
              />
              <Text style={[
                styles.wasteTypeText,
                type.selected && styles.selectedWasteTypeText
              ]}>
                {type.name}
              </Text>
              {type.selected && (
                <MaterialIcons name="check-circle" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Slot Selection */}
        <Text style={styles.sectionTitle}>Select Time Slot</Text>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.timeSlotCard,
              formData.selectedTimeSlot === slot.value && styles.selectedTimeSlot
            ]}
            onPress={() => selectTimeSlot(slot.value)}
          >
            <MaterialIcons 
              name="schedule" 
              size={20} 
              color={formData.selectedTimeSlot === slot.value ? '#4CAF50' : '#666'} 
            />
            <Text style={[
              styles.timeSlotText,
              formData.selectedTimeSlot === slot.value && styles.selectedTimeSlotText
            ]}>
              {slot.label}
            </Text>
            {formData.selectedTimeSlot === slot.value && (
              <MaterialIcons name="radio-button-checked" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}

        {/* Estimated Weight */}
        <Text style={styles.sectionTitle}>Estimated Weight</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter estimated weight (e.g., 5 kg)"
          value={formData.estimatedWeight}
          onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedWeight: text }))}
        />

        {/* Special Instructions */}
        <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textAreaInput]}
          placeholder="Any special instructions for pickup..."
          value={formData.specialInstructions}
          onChangeText={(text) => setFormData(prev => ({ ...prev, specialInstructions: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Schedule Button */}
        <TouchableOpacity
          style={[styles.scheduleButton, loading && styles.disabledButton]}
          onPress={handleSchedulePickup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="schedule" size={20} color="#fff" />
              <Text style={styles.scheduleButtonText}>Schedule Pickup</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Development Test Buttons */}
        {__DEV__ && (
          <View>
            <TouchableOpacity
              style={styles.testButton}
              onPress={testConnectivity}
            >
              <MaterialIcons name="network-check" size={20} color="#2196F3" />
              <Text style={styles.testButtonText}>Test Server Connection</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.testButton, { marginTop: 5, backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}
              onPress={testQRCodeGeneration}
            >
              <MaterialIcons name="qr-code" size={20} color="#FF9800" />
              <Text style={[styles.testButtonText, { color: '#FF9800' }]}>Test QR Code Generation</Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
  },
  wasteTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wasteTypeCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedWasteType: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  wasteTypeText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  selectedWasteTypeText: {
    color: '#fff',
  },
  timeSlotCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedTimeSlot: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  selectedTimeSlotText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  scheduleButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  testButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SchedulePickupScreen;
