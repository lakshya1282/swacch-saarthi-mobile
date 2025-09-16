import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  scanType?: 'pickup' | 'attendance' | 'all'; // New prop to specify scan type
}

const { width, height } = Dimensions.get('window');

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, scanType = 'all' }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsScanning(false);
    
    console.log(`QR Code scanned! Type: ${type}, Data:`, data);
    
    // Validate scan type if specified
    if (scanType !== 'all') {
      try {
        const qrData = JSON.parse(data);
        if (scanType === 'attendance' && qrData.type !== 'attendance') {
          Alert.alert(
            'Wrong QR Code',
            'Please scan an attendance QR code from your office dashboard.',
            [{ text: 'OK', onPress: resetScanner }]
          );
          return;
        } else if (scanType === 'pickup' && qrData.type === 'attendance') {
          Alert.alert(
            'Wrong QR Code',
            'Please scan a pickup verification QR code from the customer.',
            [{ text: 'OK', onPress: resetScanner }]
          );
          return;
        }
      } catch (parseError) {
        // If not JSON, continue with normal processing for pickup IDs
        if (scanType === 'attendance') {
          Alert.alert(
            'Invalid QR Code',
            'Please scan an attendance QR code from your office dashboard.',
            [{ text: 'OK', onPress: resetScanner }]
          );
          return;
        }
      }
    }
    
    // Vibrate to indicate successful scan
    // Vibration.vibrate(100);
    
    // Call the onScan callback with the scanned data
    onScan(data);
  };

  const resetScanner = () => {
    setScanned(false);
    setIsScanning(true);
  };

  const toggleFlash = () => {
    setEnableTorch(!enableTorch);
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera" size={80} color="#666" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-off" size={80} color="#666" />
        <Text style={styles.permissionText}>Camera access denied</Text>
        <Text style={styles.permissionSubtext}>
          Please grant camera permission to scan QR codes
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isScanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={enableTorch}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'pdf417',
                'datamatrix',
              ],
            }}
          />
          
          {/* Overlay with scanning frame - positioned absolutely */}
          <View style={styles.overlay}>
            <View style={styles.topOverlay} />
            <View style={styles.middleOverlay}>
              <View style={styles.leftOverlay} />
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <Text style={styles.scanText}>Position QR code within the frame</Text>
              </View>
              <View style={styles.rightOverlay} />
            </View>
            <View style={styles.bottomOverlay}>
              <Text style={styles.instructionText}>
                {scanType === 'attendance' ? (
                  '🕐 Scan the office attendance QR code\n💼 Available on your office dashboard'
                ) : scanType === 'pickup' ? (
                  '🔍 Scan the QR code from customer\'s phone\n💡 Make sure the code is clearly visible'
                ) : (
                  '📱 Position QR code within the frame\n💡 Make sure the code is clearly visible'
                )}
              </Text>
            </View>
          </View>
          
          {/* Control buttons - positioned absolutely */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleFlash}
            >
              <MaterialIcons 
                name={enableTorch ? "flash-on" : "flash-off"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeControlButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
          <Text style={styles.successText}>QR Code Scanned Successfully!</Text>
          <Text style={styles.successSubtext}>
            Processing verification code...
          </Text>
          
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity style={styles.resultButton} onPress={resetScanner}>
              <MaterialIcons name="qr-code-scanner" size={20} color="#FF9800" />
              <Text style={styles.resultButtonText}>Scan Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.resultButton, styles.closeResultButton]} onPress={onClose}>
              <MaterialIcons name="close" size={20} color="#666" />
              <Text style={[styles.resultButtonText, styles.closeResultButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleOverlay: {
    flexDirection: 'row',
    height: 250,
  },
  leftOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  rightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 30,
  },
  closeControlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  successText: {
    fontSize: 22,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  successSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
  },
  resultButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeResultButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  closeResultButtonText: {
    color: '#666',
  },
});

export default QRScanner;
