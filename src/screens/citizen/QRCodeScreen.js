import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-generator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const QRCodeScreen = ({ navigation, route }) => {
  const [qrData, setQrData] = useState('');
  const [pickupDetails, setPickupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);

  // Get pickup details from route params or generate mock data
  const pickupId = route?.params?.pickupId || 'pickup_' + Date.now();

  useEffect(() => {
    generatePickupQR();
  }, []);

  const generatePickupQR = async () => {
    try {
      setLoading(true);

      // Get user data
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : { 
        firstName: 'John', 
        lastName: 'Doe', 
        phone: '+91 9876543210',
        address: '123 Green Street, Delhi, 110001'
      };

      // Mock pickup details - in real app, fetch from API
      const mockPickupDetails = {
        id: pickupId,
        citizenId: user.id || 'citizen_123',
        citizenName: `${user.firstName} ${user.lastName}`,
        citizenPhone: user.phone,
        address: user.address,
        scheduledTime: new Date().toLocaleString(),
        wasteTypes: ['Dry Waste', 'Wet Waste'],
        estimatedWeight: '2.5 kg',
        specialInstructions: 'Please ring the bell twice',
        status: 'pending_pickup',
        qrCode: '',
      };

      // Generate QR code data
      const qrCodeData = JSON.stringify({
        pickupId: mockPickupDetails.id,
        citizenId: mockPickupDetails.citizenId,
        citizenName: mockPickupDetails.citizenName,
        citizenPhone: mockPickupDetails.citizenPhone,
        address: mockPickupDetails.address,
        timestamp: Date.now(),
        wasteTypes: mockPickupDetails.wasteTypes,
        estimatedWeight: mockPickupDetails.estimatedWeight,
      });

      setPickupDetails(mockPickupDetails);
      setQrData(qrCodeData);
      setQrCodeGenerated(true);
      setLoading(false);

    } catch (error) {
      setLoading(false);
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    }
  };

  const refreshQRCode = () => {
    setQrCodeGenerated(false);
    setPickupConfirmed(false);
    generatePickupQR();
  };

  const simulateWorkerScan = () => {
    // Simulate worker scanning the QR code
    Alert.alert(
      'QR Code Scanned!',
      'Your waste pickup has been confirmed by the worker. Thank you for using our service!',
      [
        {
          text: 'Rate Service',
          onPress: () => showRatingDialog(),
        },
        {
          text: 'Continue',
          onPress: () => {
            setPickupConfirmed(true);
            // Navigate back or to home screen
            setTimeout(() => {
              navigation.goBack();
            }, 2000);
          },
        },
      ]
    );
  };

  const showRatingDialog = () => {
    Alert.alert(
      'Rate Your Experience',
      'How was your waste pickup service today?',
      [
        { text: '⭐⭐⭐⭐⭐ Excellent', onPress: () => submitRating(5) },
        { text: '⭐⭐⭐⭐ Good', onPress: () => submitRating(4) },
        { text: '⭐⭐⭐ Average', onPress: () => submitRating(3) },
        { text: '⭐⭐ Poor', onPress: () => submitRating(2) },
        { text: '⭐ Very Poor', onPress: () => submitRating(1) },
      ]
    );
  };

  const submitRating = (rating) => {
    // Submit rating to backend
    Alert.alert('Thank You!', `You rated this service ${rating} star${rating > 1 ? 's' : ''}. Your feedback helps us improve!`);
    setPickupConfirmed(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1500);
  };

  const copyQRData = () => {
    // In a real app, you might want to copy to clipboard
    Alert.alert('QR Data', qrData.substring(0, 100) + '...');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Generating QR Code...</Text>
      </View>
    );
  }

  if (pickupConfirmed) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Icon name="check-circle" size={100} color="#4CAF50" />
          <Text style={styles.successTitle}>Pickup Confirmed!</Text>
          <Text style={styles.successMessage}>
            Your waste has been successfully collected. Thank you for contributing to a cleaner environment!
          </Text>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => navigation.goBack()}>
            <Icon name="home" size={24} color="#fff" />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup QR Code</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshQRCode}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.instructionCard}>
          <Icon name="info" size={24} color="#2196F3" />
          <Text style={styles.instructionText}>
            Show this QR code to the waste collection worker to confirm pickup completion
          </Text>
        </View>

        {qrCodeGenerated && (
          <View style={styles.qrContainer}>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={qrData}
                size={width * 0.6}
                bgColor="#000000"
                fgColor="#FFFFFF"
              />
            </View>
            
            <Text style={styles.qrLabel}>Pickup Confirmation Code</Text>
            
            <TouchableOpacity style={styles.copyButton} onPress={copyQRData}>
              <Icon name="content-copy" size={20} color="#666" />
              <Text style={styles.copyButtonText}>View QR Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {pickupDetails && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Pickup Details</Text>
            
            <View style={styles.detailRow}>
              <Icon name="confirmation-number" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Pickup ID</Text>
                <Text style={styles.detailValue}>{pickupDetails.id}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="person" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Citizen</Text>
                <Text style={styles.detailValue}>{pickupDetails.citizenName}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="phone" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{pickupDetails.citizenPhone}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="location-on" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{pickupDetails.address}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="schedule" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Scheduled Time</Text>
                <Text style={styles.detailValue}>{pickupDetails.scheduledTime}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="delete" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Waste Types</Text>
                <Text style={styles.detailValue}>{pickupDetails.wasteTypes.join(', ')}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="fitness-center" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Estimated Weight</Text>
                <Text style={styles.detailValue}>{pickupDetails.estimatedWeight}</Text>
              </View>
            </View>

            {pickupDetails.specialInstructions && (
              <View style={styles.detailRow}>
                <Icon name="note" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Special Instructions</Text>
                  <Text style={styles.detailValue}>{pickupDetails.specialInstructions}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon name="schedule" size={24} color="#FF9800" />
            <Text style={styles.statusTitle}>Waiting for Worker</Text>
          </View>
          <Text style={styles.statusMessage}>
            Please wait for the waste collection worker to arrive and scan this QR code to confirm the pickup.
          </Text>
        </View>

        {/* Demo button - remove in production */}
        <TouchableOpacity 
          style={styles.demoButton} 
          onPress={simulateWorkerScan}>
          <Icon name="qr-code-scanner" size={24} color="#fff" />
          <Text style={styles.demoButtonText}>Simulate Worker Scan (Demo)</Text>
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Icon name="phone" size={20} color="#2196F3" />
            <Text style={styles.helpButtonText}>Call Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton}>
            <Icon name="chat" size={20} color="#2196F3" />
            <Text style={styles.helpButtonText}>Chat with Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#4CAF50',
    marginTop: 20,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionCard: {
    backgroundColor: '#e3f2fd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#1976d2',
    marginLeft: 15,
    flex: 1,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 2,
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  copyButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailContent: {
    marginLeft: 15,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 10,
  },
  statusMessage: {
    fontSize: 16,
    color: '#BF360C',
    lineHeight: 24,
  },
  demoButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  helpButtonText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 10,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
  },
  homeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default QRCodeScreen;
