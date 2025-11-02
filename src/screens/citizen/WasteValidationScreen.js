import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const WasteValidationScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Mock AI validation responses - In real implementation, this would call an AI service
  const mockValidationResults = {
    correct: {
      isCorrect: true,
      wasteType: 'Dry Waste',
      confidence: 92,
      message: 'Great job! This is correctly segregated dry waste.',
      tips: ['Keep containers clean before disposal', 'Remove any food residue'],
      recommendedBin: 'Blue bin (Dry waste)',
    },
    incorrect: {
      isCorrect: false,
      detectedItems: ['Banana peel', 'Plastic bottle'],
      issues: [
        {
          item: 'Banana peel',
          currentBin: 'Dry waste',
          correctBin: 'Wet waste (Green bin)',
          reason: 'Organic matter should go in wet waste for composting',
        }
      ],
      message: 'This waste is not properly segregated. Please see suggestions below.',
      overallScore: 45,
    },
    hazardous: {
      isCorrect: true,
      wasteType: 'Hazardous Waste',
      confidence: 88,
      detectedItems: ['Battery', 'Old mobile phone'],
      message: 'Correctly identified hazardous waste!',
      warning: 'Please ensure these items go to designated e-waste collection centers.',
      tips: ['Never dispose in regular bins', 'Contact municipal authorities for pickup'],
      recommendedBin: 'Red bin (Hazardous waste)',
    }
  };

  const selectImageSource = () => {
    Alert.alert(
      'Select Image Source',
      'Choose how you want to capture the waste image',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        setValidationResult(null);
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        setValidationResult(null);
      }
    });
  };

  const validateWaste = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    setLoading(true);

    try {
      // Import AI service dynamically
      const aiService = await import('../../services/aiWasteValidation');
      
      // Use AI validation service
      const aiResult = await aiService.default.validateWaste(selectedImage.uri);
      
      // Save validation result to backend if needed
      // await saveValidationResult(aiResult);
      
      setValidationResult(aiResult);
      setLoading(false);

    } catch (error) {
      setLoading(false);
      console.error('AI Validation error:', error);
      
      // Fallback to mock results if AI fails
      console.log('Falling back to mock validation');
      const results = Object.values(mockValidationResults);
      const randomResult = results[Math.floor(Math.random() * results.length)];
      randomResult.message += ' (AI service unavailable)';
      randomResult.aiSource = 'fallback';
      setValidationResult(randomResult);
    }
  };

  const retakePhoto = () => {
    setSelectedImage(null);
    setValidationResult(null);
    selectImageSource();
  };

  const renderValidationResult = () => {
    if (!validationResult) return null;

    return (
      <ScrollView style={styles.resultContainer}>
        {validationResult.isCorrect ? (
          <View style={styles.successResult}>
            <Icon name="check-circle" size={60} color="#4CAF50" />
            <Text style={styles.successTitle}>Correctly Segregated! ✅</Text>
            <Text style={styles.resultMessage}>{validationResult.message}</Text>
            
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Waste Type: {validationResult.wasteType}</Text>
              <Text style={styles.confidence}>Confidence: {validationResult.confidence}%</Text>
              <Text style={styles.recommendedBin}>{validationResult.recommendedBin}</Text>
            </View>

            {validationResult.warning && (
              <View style={styles.warningCard}>
                <Icon name="warning" size={24} color="#FF9800" />
                <Text style={styles.warningText}>{validationResult.warning}</Text>
              </View>
            )}

            {validationResult.tips && (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Tips:</Text>
                {validationResult.tips.map((tip, index) => (
                  <Text key={index} style={styles.tipItem}>• {tip}</Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.errorResult}>
            <Icon name="cancel" size={60} color="#f44336" />
            <Text style={styles.errorTitle}>Needs Correction ❌</Text>
            <Text style={styles.resultMessage}>{validationResult.message}</Text>
            
            <View style={styles.scoreCard}>
              <Text style={styles.scoreText}>Segregation Score: {validationResult.overallScore}%</Text>
              <View style={styles.scoreBar}>
                <View 
                  style={[
                    styles.scoreFill, 
                    { 
                      width: `${validationResult.overallScore}%`,
                      backgroundColor: validationResult.overallScore > 70 ? '#4CAF50' : 
                                     validationResult.overallScore > 40 ? '#FF9800' : '#f44336'
                    }
                  ]} 
                />
              </View>
            </View>

            {validationResult.issues && (
              <View style={styles.issuesContainer}>
                <Text style={styles.issuesTitle}>Issues Found:</Text>
                {validationResult.issues.map((issue, index) => (
                  <View key={index} style={styles.issueCard}>
                    <View style={styles.issueHeader}>
                      <Icon name="error" size={20} color="#f44336" />
                      <Text style={styles.issueItem}>{issue.item}</Text>
                    </View>
                    <Text style={styles.issueDescription}>
                      Currently in: <Text style={styles.currentBin}>{issue.currentBin}</Text>
                    </Text>
                    <Text style={styles.issueDescription}>
                      Should go to: <Text style={styles.correctBin}>{issue.correctBin}</Text>
                    </Text>
                    <Text style={styles.issueReason}>Reason: {issue.reason}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Icon name="camera-alt" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Take Another Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => navigation.goBack()}>
            <Icon name="check" size={20} color="#fff" />
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderImageModal = () => {
    return (
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setImageModalVisible(false)}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage.uri }} 
                style={styles.fullImage} 
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Waste Validation</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.instruction}>
            Take a photo of your segregated waste to validate if it's properly sorted
          </Text>

          {!selectedImage ? (
            <View style={styles.cameraContainer}>
              <Icon name="camera-alt" size={80} color="#ccc" />
              <Text style={styles.cameraText}>No image selected</Text>
              <TouchableOpacity style={styles.selectImageButton} onPress={selectImageSource}>
                <Icon name="add-a-photo" size={24} color="#fff" />
                <Text style={styles.selectImageButtonText}>Select Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <View style={styles.imageOverlay}>
                  <Icon name="zoom-in" size={30} color="#fff" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.changeImageButton} onPress={retakePhoto}>
                  <Icon name="camera-alt" size={20} color="#666" />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.validateButton} 
                  onPress={validateWaste}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="search" size={20} color="#fff" />
                      <Text style={styles.validateButtonText}>Validate Waste</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Analyzing waste...</Text>
              <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
            </View>
          )}

          {renderValidationResult()}
        </View>
      </ScrollView>

      {renderImageModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
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
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  cameraContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  cameraText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 20,
  },
  selectImageButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 0.4,
    justifyContent: 'center',
  },
  changeImageText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.55,
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  resultContainer: {
    flex: 1,
  },
  successResult: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  errorResult: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#f44336',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 15,
    marginBottom: 10,
  },
  resultMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  detailCard: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  confidence: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 5,
  },
  recommendedBin: {
    fontSize: 14,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 5,
    lineHeight: 20,
  },
  scoreCard: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  issuesContainer: {
    width: '100%',
  },
  issuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'left',
  },
  issueCard: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginLeft: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  currentBin: {
    fontWeight: 'bold',
    color: '#f44336',
  },
  correctBin: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  issueReason: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
  },
  retakeButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  fullImage: {
    width: '90%',
    height: '70%',
  },
});

export default WasteValidationScreen;
