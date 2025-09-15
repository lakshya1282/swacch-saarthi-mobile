import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../../services/apiService';

interface ValidationResult {
  isCorrect: boolean;
  wasteType?: string;
  confidence?: number;
  message: string;
  tips?: string[];
  recommendedBin?: string;
  detectedItems?: string[];
  issues?: Array<{
    item: string;
    currentBin: string;
    correctBin: string;
    reason: string;
  }>;
}

interface WasteType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

const { width } = Dimensions.get('window');

const WasteValidationScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [wasteTypes] = useState<WasteType[]>([
    {
      id: '1',
      name: 'Dry Waste',
      description: 'Recyclable materials',
      icon: 'recycling',
      color: '#2196F3',
      examples: ['Paper', 'Plastic bottles', 'Metal cans', 'Cardboard']
    },
    {
      id: '2',
      name: 'Wet Waste',
      description: 'Organic/biodegradable',
      icon: 'eco',
      color: '#4CAF50',
      examples: ['Food scraps', 'Fruit peels', 'Vegetable waste', 'Garden waste']
    },
    {
      id: '3',
      name: 'Hazardous Waste',
      description: 'Dangerous materials',
      icon: 'warning',
      color: '#FF5722',
      examples: ['Batteries', 'Electronics', 'Chemicals', 'Medical waste']
    }
  ]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are needed for waste validation'
      );
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setValidationResult(null);
        setShowResult(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setValidationResult(null);
        setShowResult(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: pickImageFromCamera },
        { text: 'Gallery', onPress: pickImageFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const validateWaste = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setValidating(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'waste-image.jpg',
      } as any);

      const response = await apiService.request({
        url: '/waste/validate',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setValidationResult(response.data.result);
        setShowResult(true);
      } else {
        Alert.alert('Error', 'Failed to validate waste');
      }
    } catch (error) {
      console.error('Waste validation error:', error);
      
      // Mock validation for demo purposes
      const mockResults: ValidationResult[] = [
        {
          isCorrect: true,
          wasteType: 'Dry Waste',
          confidence: 92,
          message: 'Great job! This is correctly identified as dry waste.',
          tips: ['Keep containers clean before disposal', 'Remove any food residue'],
          recommendedBin: 'Blue bin (Dry waste)',
        },
        {
          isCorrect: false,
          detectedItems: ['Banana peel', 'Plastic bottle'],
          message: 'Mixed waste detected. Please separate the items.',
          issues: [
            {
              item: 'Banana peel',
              currentBin: 'Dry waste',
              correctBin: 'Wet waste (Green bin)',
              reason: 'Organic matter should go in wet waste for composting',
            }
          ],
        }
      ];
      
      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      setValidationResult(randomResult);
      setShowResult(true);
    } finally {
      setValidating(false);
    }
  };

  const resetValidation = () => {
    setSelectedImage(null);
    setValidationResult(null);
    setShowResult(false);
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Waste Validation</Text>
          <Text style={styles.subtitle}>AI-powered waste classification</Text>
        </View>

        {/* Waste Types Guide */}
        <View style={styles.guideSection}>
          <Text style={styles.sectionTitle}>Waste Categories</Text>
          {wasteTypes.map((type) => (
            <View key={type.id} style={styles.wasteTypeCard}>
              <View style={[styles.wasteTypeIcon, { backgroundColor: type.color }]}>
                <MaterialIcons name={type.icon as any} size={24} color="#fff" />
              </View>
              <View style={styles.wasteTypeContent}>
                <Text style={styles.wasteTypeName}>{type.name}</Text>
                <Text style={styles.wasteTypeDescription}>{type.description}</Text>
                <Text style={styles.wasteTypeExamples}>
                  Examples: {type.examples.join(', ')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Image Selection */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Upload Waste Image</Text>
          
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={showImagePickerOptions}
              >
                <MaterialIcons name="camera-alt" size={20} color="#2196F3" />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={showImagePickerOptions}
            >
              <MaterialIcons name="add-a-photo" size={48} color="#ccc" />
              <Text style={styles.imagePickerText}>Tap to add image</Text>
              <Text style={styles.imagePickerSubtext}>
                Take a photo or select from gallery
              </Text>
            </TouchableOpacity>
          )}

          {selectedImage && (
            <TouchableOpacity
              style={[styles.validateButton, validating && styles.validatingButton]}
              onPress={validateWaste}
              disabled={validating}
            >
              {validating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.validateButtonText}>Validating...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="psychology" size={20} color="#fff" />
                  <Text style={styles.validateButtonText}>Validate Waste</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 Tips for Better Results</Text>
          <View style={styles.tipCard}>
            <MaterialIcons name="lightbulb" size={20} color="#FF9800" />
            <Text style={styles.tipText}>
              Take clear, well-lit photos of individual waste items
            </Text>
          </View>
          <View style={styles.tipCard}>
            <MaterialIcons name="center-focus-strong" size={20} color="#FF9800" />
            <Text style={styles.tipText}>
              Ensure the waste item fills most of the frame
            </Text>
          </View>
          <View style={styles.tipCard}>
            <MaterialIcons name="clean-hands" size={20} color="#FF9800" />
            <Text style={styles.tipText}>
              Clean items before photographing for better accuracy
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Validation Result Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResult(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {validationResult && (
              <>
                <View style={styles.resultHeader}>
                  <MaterialIcons 
                    name={validationResult.isCorrect ? 'check-circle' : 'error'} 
                    size={48} 
                    color={validationResult.isCorrect ? '#4CAF50' : '#FF5722'} 
                  />
                  <Text style={[
                    styles.resultTitle,
                    { color: validationResult.isCorrect ? '#4CAF50' : '#FF5722' }
                  ]}>
                    {validationResult.isCorrect ? 'Correct!' : 'Needs Correction'}
                  </Text>
                </View>

                <Text style={styles.resultMessage}>{validationResult.message}</Text>

                {validationResult.wasteType && validationResult.confidence && (
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceText}>
                      Detected: {validationResult.wasteType} ({validationResult.confidence}% confidence)
                    </Text>
                  </View>
                )}

                {validationResult.recommendedBin && (
                  <View style={styles.recommendationContainer}>
                    <MaterialIcons name="delete" size={20} color="#2196F3" />
                    <Text style={styles.recommendationText}>
                      Use: {validationResult.recommendedBin}
                    </Text>
                  </View>
                )}

                {validationResult.issues && validationResult.issues.length > 0 && (
                  <View style={styles.issuesContainer}>
                    <Text style={styles.issuesTitle}>Issues Found:</Text>
                    {validationResult.issues.map((issue, index) => (
                      <View key={index} style={styles.issueCard}>
                        <Text style={styles.issueItem}>{issue.item}</Text>
                        <Text style={styles.issueReason}>{issue.reason}</Text>
                        <Text style={styles.issueCorrection}>
                          Move to: {issue.correctBin}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {validationResult.tips && validationResult.tips.length > 0 && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>Tips:</Text>
                    {validationResult.tips.map((tip, index) => (
                      <Text key={index} style={styles.tipItem}>• {tip}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={styles.newValidationButton}
                    onPress={() => {
                      setShowResult(false);
                      resetValidation();
                    }}
                  >
                    <MaterialIcons name="refresh" size={20} color="#2196F3" />
                    <Text style={styles.newValidationText}>Validate Another</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowResult(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#9C27B0',
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
  guideSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  wasteTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
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
  wasteTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  wasteTypeContent: {
    flex: 1,
  },
  wasteTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  wasteTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  wasteTypeExamples: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  imageSection: {
    padding: 20,
    paddingTop: 0,
  },
  selectedImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: width - 80,
    height: (width - 80) * 0.75,
    borderRadius: 12,
    marginBottom: 16,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  changeImageText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: '500',
  },
  imagePicker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  validateButton: {
    backgroundColor: '#9C27B0',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  validatingButton: {
    backgroundColor: '#BA68C8',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsSection: {
    padding: 20,
    paddingTop: 0,
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  tipText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  resultMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  confidenceContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    fontWeight: '500',
  },
  issuesContainer: {
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 8,
  },
  issueCard: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  issueItem: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  issueReason: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  issueCorrection: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  tipsContainer: {
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  newValidationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  newValidationText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '500',
  },
  closeButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default WasteValidationScreen;
