import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  BackHandler,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface AttendanceScreenProps {
  onAttendanceMarked: () => void;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ onAttendanceMarked }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const { userData } = useAuth();

  useEffect(() => {
    getCameraPermissions();
    
    // Prevent back button on this screen
    const backAction = () => {
      Alert.alert('Attendance Required', 'You must mark your attendance to continue.', [
        { text: 'OK', onPress: () => {} },
      ]);
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);

    try {
      console.log('QR Data received:', data);

      // Expected format: ATT-OFFICE_CODE (e.g., ATT-WM001)
      if (!data.startsWith('ATT-')) {
        Alert.alert(
          'Invalid QR Code', 
          'Please scan the attendance QR code provided by your office.',
          [{ text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } }]
        );
        return;
      }

      const attendanceCode = data;
      const officeCode = data.replace('ATT-', ''); // Extract office code

      // Mark attendance
      const response = await apiService.markAttendance({
        workerId: userData?.id || userData?._id,
        workerName: `${userData?.firstName || userData?.personalInfo?.firstName || 'Worker'} ${userData?.lastName || userData?.personalInfo?.lastName || ''}`,
        officeCode: officeCode,
        attendanceCode: attendanceCode,
        action: 'check_in',
        method: 'qr_scan'
      });

      if (response.success) {
        Alert.alert(
          'Attendance Marked!', 
          `${response.message}\n\nCheck-in time: ${new Date().toLocaleTimeString()}`,
          [
            { 
              text: 'Continue', 
              onPress: () => {
                onAttendanceMarked();
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to mark attendance');
      }

    } catch (error: any) {
      console.error('Attendance marking error:', error);
      
      let message = 'Failed to mark attendance. Please try again.';
      if (error.response?.status === 400 && error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert(
        'Error', 
        message,
        [
          { 
            text: 'Try Again', 
            onPress: () => { 
              setScanned(false); 
              setLoading(false); 
            } 
          }
        ]
      );
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanned(false);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="camera-alt" size={64} color="#FF9800" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>
          Please enable camera permission in your device settings to mark attendance.
        </Text>
        <TouchableOpacity style={styles.button} onPress={getCameraPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="access-time" size={32} color="#FF9800" />
        <Text style={styles.title}>Mark Attendance</Text>
        <Text style={styles.subtitle}>
          Scan the QR code to mark your attendance for today
        </Text>
      </View>

      {!isScanning ? (
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionCard}>
            <MaterialIcons name="qr-code-scanner" size={48} color="#FF9800" />
            <Text style={styles.instructionTitle}>Scan Attendance QR Code</Text>
            <Text style={styles.instructionText}>
              • Ask your supervisor for the daily attendance QR code{'\n'}
              • Position the QR code within the scanner frame{'\n'}
              • Keep your device steady for automatic scanning{'\n'}
              • Ensure good lighting for better detection
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={startScanning}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Start Scanning</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              You must mark attendance before accessing work tasks.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerText}>
              Position the QR code within the frame
            </Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={stopScanning}>
              <MaterialIcons name="close" size={24} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FF9800" />
              <Text style={styles.loadingText}>Marking attendance...</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
    marginTop: 20,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 40,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
});

export default AttendanceScreen;