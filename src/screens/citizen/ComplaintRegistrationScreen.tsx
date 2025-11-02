import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';

interface Pickup {
  _id: string;
  pickupId: string;
  scheduledDate: string;
  timeSlot: string;
  status: string;
  wasteTypes: string[];
}

interface Complaint {
  _id: string;
  complaintId: string;
  pickupId: string;
  reason: string;
  customReason?: string;
  status: 'pending' | 'resolved';
  description?: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

const COMPLAINT_REASONS = [
  { id: 'late', label: 'Late Pickup', icon: 'schedule' },
  { id: 'did_not_come', label: 'Did Not Come', icon: 'event-busy' },
  { id: 'others', label: 'Others', icon: 'more-horiz' },
];

const ComplaintRegistrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  
  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showComplaintsList, setShowComplaintsList] = useState(false);
  
  // Modal state
  const [pickupModalVisible, setPickupModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadPickups(), loadComplaints()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPickups = async () => {
    try {
      const response = await apiService.getPickups();
      if (response.data.success) {
        const pickupsData = response.data.data || response.data.pickups || [];
        // Filter to show only scheduled, assigned, or recent pickups
        const eligiblePickups = pickupsData.filter((pickup: Pickup) => 
          ['scheduled', 'assigned', 'in_progress', 'completed'].includes(pickup.status.toLowerCase())
        );
        setPickups(eligiblePickups);
      }
    } catch (error) {
      console.error('Error loading pickups:', error);
      Alert.alert('Error', 'Failed to load your pickups');
    }
  };

  const loadComplaints = async () => {
    try {
      const response = await apiService.getComplaints();
      if (response.data.success) {
        setComplaints(response.data.complaints || []);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
      // Set empty array if API fails
      setComplaints([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const validateForm = (): boolean => {
    if (!selectedPickup) {
      Alert.alert('Error', 'Please select a pickup ID');
      return false;
    }
    
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for the complaint');
      return false;
    }
    
    if (selectedReason === 'others' && !customReason.trim()) {
      Alert.alert('Error', 'Please specify the reason for your complaint');
      return false;
    }
    
    return true;
  };

  const handleSubmitComplaint = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Submit Complaint',
      'Are you sure you want to submit this complaint?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              
              // Get user data from AsyncStorage
              const userData = await AsyncStorage.getItem('userData');
              if (!userData) {
                Alert.alert('Error', 'User data not found. Please login again.');
                return;
              }
              
              const user = JSON.parse(userData);
              
              const complaintData = {
                citizenId: user.id || user._id,
                pickupId: selectedPickup,
                reason: selectedReason,
                customReason: selectedReason === 'others' ? customReason : undefined,
                description: additionalDetails || undefined,
              };

              // API call to submit complaint to database
              const response = await apiService.submitComplaint(complaintData);
              
              if (response.data.success) {
                // Reload complaints from database
                await loadComplaints();
                
                Alert.alert(
                  'Success',
                  'Your complaint has been registered successfully. You can track its status in the complaints list.',
                  [
                    {
                      text: 'View Complaints',
                      onPress: () => setShowComplaintsList(true),
                    },
                    {
                      text: 'OK',
                      onPress: () => resetForm(),
                    },
                  ]
                );
                
                resetForm();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to submit complaint');
              }
            } catch (error: any) {
              console.error('Error submitting complaint:', error);
              Alert.alert(
                'Error', 
                error.response?.data?.message || 'Failed to submit complaint. Please try again.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedPickup('');
    setSelectedReason('');
    setCustomReason('');
    setAdditionalDetails('');
  };

  const getSelectedPickupDetails = (): Pickup | undefined => {
    return pickups.find(p => p.pickupId === selectedPickup);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeSlot = (timeSlot: string) => {
    const slots: Record<string, string> = {
      morning: '6:00 AM - 10:00 AM',
      midday: '10:00 AM - 2:00 PM',
      afternoon: '2:00 PM - 6:00 PM',
      evening: '6:00 PM - 8:00 PM',
    };
    return slots[timeSlot] || timeSlot;
  };

  const getStatusColor = (status: string) => {
    return status === 'resolved' ? '#4CAF50' : '#FF9800';
  };

  const renderPickupModal = () => (
    <Modal
      visible={pickupModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPickupModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Pickup</Text>
            <TouchableOpacity onPress={() => setPickupModalVisible(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pickupList}>
            {pickups.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No pickups available</Text>
                <Text style={styles.emptyStateSubtext}>
                  Schedule a pickup to register a complaint
                </Text>
              </View>
            ) : (
              pickups.map((pickup) => (
                <TouchableOpacity
                  key={pickup._id}
                  style={[
                    styles.pickupItem,
                    selectedPickup === pickup.pickupId && styles.pickupItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedPickup(pickup.pickupId);
                    setPickupModalVisible(false);
                  }}
                >
                  <View style={styles.pickupItemHeader}>
                    <Text style={styles.pickupId}>#{pickup.pickupId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pickup.status) }]}>
                      <Text style={styles.statusText}>{pickup.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.pickupDate}>
                    📅 {formatDate(pickup.scheduledDate)}
                  </Text>
                  <Text style={styles.pickupTime}>
                    🕐 {formatTimeSlot(pickup.timeSlot)}
                  </Text>
                  <Text style={styles.pickupWaste}>
                    🗑️ {pickup.wasteTypes.join(', ')}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderComplaintsList = () => (
    <View style={styles.complaintsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Complaints</Text>
        <TouchableOpacity onPress={() => setShowComplaintsList(!showComplaintsList)}>
          <MaterialIcons 
            name={showComplaintsList ? 'expand-less' : 'expand-more'} 
            size={24} 
            color="#4CAF50" 
          />
        </TouchableOpacity>
      </View>
      
      {showComplaintsList && (
        <View style={styles.complaintsListContainer}>
          {complaints.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="fact-check" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No complaints yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your registered complaints will appear here
              </Text>
            </View>
          ) : (
            complaints.map((complaint) => (
              <View key={complaint._id} style={styles.complaintCard}>
                <View style={styles.complaintHeader}>
                  <View>
                    <Text style={styles.complaintId}>#{complaint.complaintId}</Text>
                    <Text style={styles.complaintDate}>
                      {formatDate(complaint.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.complaintStatusBadge,
                      { backgroundColor: getStatusColor(complaint.status) },
                    ]}
                  >
                    <MaterialIcons
                      name={complaint.status === 'resolved' ? 'check-circle' : 'schedule'}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.complaintStatusText}>
                      {complaint.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.complaintDetails}>
                  <View style={styles.complaintRow}>
                    <Text style={styles.complaintLabel}>Pickup ID:</Text>
                    <Text style={styles.complaintValue}>#{complaint.pickupId}</Text>
                  </View>
                  <View style={styles.complaintRow}>
                    <Text style={styles.complaintLabel}>Reason:</Text>
                    <Text style={styles.complaintValue}>{complaint.reason}</Text>
                  </View>
                  {complaint.description && (
                    <View style={styles.complaintRow}>
                      <Text style={styles.complaintLabel}>Details:</Text>
                      <Text style={styles.complaintValue}>{complaint.description}</Text>
                    </View>
                  )}
                  {complaint.status === 'resolved' && complaint.resolution && (
                    <View style={[styles.complaintRow, styles.resolutionRow]}>
                      <Text style={styles.complaintLabel}>Resolution:</Text>
                      <Text style={[styles.complaintValue, styles.resolutionText]}>
                        {complaint.resolution}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Complaint</Text>
      </View>

      <View style={styles.content}>
        {/* Pickup Selection */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            Pickup ID <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setPickupModalVisible(true)}
          >
            <View style={styles.selectButtonContent}>
              <MaterialIcons name="event" size={20} color="#666" />
              <Text style={selectedPickup ? styles.selectedText : styles.placeholderText}>
                {selectedPickup
                  ? `#${selectedPickup}`
                  : 'Select a pickup'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
          
          {selectedPickup && (
            <View style={styles.selectedPickupInfo}>
              {(() => {
                const pickup = getSelectedPickupDetails();
                return pickup ? (
                  <>
                    <Text style={styles.selectedPickupDetail}>
                      📅 {formatDate(pickup.scheduledDate)}
                    </Text>
                    <Text style={styles.selectedPickupDetail}>
                      🕐 {formatTimeSlot(pickup.timeSlot)}
                    </Text>
                  </>
                ) : null;
              })()}
            </View>
          )}
        </View>

        {/* Reason Selection */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            Reason <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.reasonGrid}>
            {COMPLAINT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonCard,
                  selectedReason === reason.id && styles.reasonCardSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <MaterialIcons
                  name={reason.icon as any}
                  size={32}
                  color={selectedReason === reason.id ? '#4CAF50' : '#666'}
                />
                <Text
                  style={[
                    styles.reasonLabel,
                    selectedReason === reason.id && styles.reasonLabelSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Reason Input (shown only when "Others" is selected) */}
        {selectedReason === 'others' && (
          <View style={styles.formSection}>
            <Text style={styles.label}>
              Specify Reason <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Please describe your issue"
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {customReason.length}/200
            </Text>
          </View>
        )}

        {/* Additional Details */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Additional Details (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Any additional information..."
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {additionalDetails.length}/500
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitComplaint}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Complaint</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Complaints List */}
        {renderComplaintsList()}
      </View>

      {/* Pickup Modal */}
      {renderPickupModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  formSection: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  required: {
    color: '#f44336',
  },
  selectButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#999',
  },
  selectedText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  selectedPickupInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  selectedPickupDetail: {
    fontSize: 14,
    color: '#2E7D32',
    marginVertical: 2,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reasonCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 100,
  },
  reasonCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  reasonLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  reasonLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
  },
  characterCount: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  complaintsSection: {
    marginTop: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  complaintsListContainer: {
    marginTop: 16,
  },
  complaintCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  complaintId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  complaintDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  complaintStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  complaintStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  complaintDetails: {
    gap: 8,
  },
  complaintRow: {
    flexDirection: 'row',
  },
  complaintLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 100,
  },
  complaintValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  resolutionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resolutionText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickupList: {
    padding: 20,
  },
  pickupItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  pickupItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  pickupItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pickupDate: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  pickupTime: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  pickupWaste: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
});

export default ComplaintRegistrationScreen;
