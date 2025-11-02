import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SchedulePickupScreen = () => {
  const [selectedWasteTypes, setSelectedWasteTypes] = useState([]);
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [pickupHistory, setPickupHistory] = useState([]);
  const [activePickups, setActivePickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const wasteTypes = [
    {
      id: 'dry',
      name: 'Dry Waste',
      icon: 'delete',
      color: '#2196F3',
      description: 'Paper, plastic, metal, glass',
      examples: ['Newspapers', 'Plastic bottles', 'Cardboard boxes', 'Glass containers'],
    },
    {
      id: 'wet',
      name: 'Wet Waste',
      icon: 'eco',
      color: '#4CAF50',
      description: 'Kitchen scraps, organic waste',
      examples: ['Vegetable peels', 'Food leftovers', 'Garden waste', 'Tea bags'],
    },
    {
      id: 'hazardous',
      name: 'Hazardous Waste',
      icon: 'warning',
      color: '#f44336',
      description: 'Electronics, batteries, chemicals',
      examples: ['Old phones', 'Batteries', 'Paint containers', 'CFL bulbs'],
    },
  ];

  const timeSlots = [
    { id: 'morning', label: '6:00 AM - 10:00 AM', available: true },
    { id: 'midday', label: '10:00 AM - 2:00 PM', available: true },
    { id: 'afternoon', label: '2:00 PM - 6:00 PM', available: false },
    { id: 'evening', label: '6:00 PM - 8:00 PM', available: true },
  ];

  useEffect(() => {
    loadPickupHistory();
    loadActivePickups();
  }, []);

  const loadPickupHistory = async () => {
    try {
      // Mock data - replace with actual API call
      const mockHistory = [
        {
          id: '1',
          date: '2024-01-15',
          wasteTypes: ['dry', 'wet'],
          weight: '2.5 kg',
          status: 'completed',
          worker: 'Ravi Kumar',
          rating: 5,
        },
        {
          id: '2',
          date: '2024-01-10',
          wasteTypes: ['dry'],
          weight: '1.2 kg',
          status: 'completed',
          worker: 'Priya Singh',
          rating: 4,
        },
      ];
      setPickupHistory(mockHistory);
    } catch (error) {
      console.error('Error loading pickup history:', error);
    }
  };

  const loadActivePickups = async () => {
    try {
      // Mock data - replace with actual API call
      const mockActive = [
        {
          id: 'active1',
          scheduledTime: 'Today 10:00 AM - 2:00 PM',
          wasteTypes: ['dry', 'wet'],
          status: 'confirmed',
          worker: {
            name: 'Amit Sharma',
            phone: '+91 9876543210',
            rating: 4.8,
          },
          estimatedArrival: '45 minutes',
        },
      ];
      setActivePickups(mockActive);
    } catch (error) {
      console.error('Error loading active pickups:', error);
    }
  };

  const toggleWasteType = (wasteTypeId) => {
    if (selectedWasteTypes.includes(wasteTypeId)) {
      setSelectedWasteTypes(selectedWasteTypes.filter(id => id !== wasteTypeId));
    } else {
      setSelectedWasteTypes([...selectedWasteTypes, wasteTypeId]);
    }
  };

  const schedulePickup = async () => {
    if (selectedWasteTypes.length === 0) {
      Alert.alert('Select Waste Types', 'Please select at least one type of waste.');
      return;
    }
    
    if (!selectedTimeSlot) {
      Alert.alert('Select Time Slot', 'Please select a preferred time slot.');
      return;
    }

    if (!estimatedWeight) {
      Alert.alert('Enter Weight', 'Please estimate the weight of your waste.');
      return;
    }

    setLoading(true);

    try {
      const pickupData = {
        wasteTypes: selectedWasteTypes,
        estimatedWeight,
        timeSlot: selectedTimeSlot,
        specialInstructions,
        scheduledDate: new Date().toISOString().split('T')[0],
      };

      // Mock API call - replace with actual API
      // const response = await axios.post('/api/pickups/schedule', pickupData);
      
      // Mock success response
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Pickup Scheduled!', 
          'Your waste pickup has been scheduled successfully. A worker will be assigned shortly.',
          [{ text: 'OK', onPress: () => {
            setScheduleModalVisible(false);
            resetForm();
            loadActivePickups();
          }}]
        );
      }, 2000);

    } catch (error) {
      setLoading(false);
      console.error('Error scheduling pickup:', error);
      Alert.alert('Error', 'Failed to schedule pickup. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedWasteTypes([]);
    setEstimatedWeight('');
    setSelectedTimeSlot('');
    setSpecialInstructions('');
  };

  const getWasteTypeInfo = (id) => {
    return wasteTypes.find(type => type.id === id);
  };

  const renderWasteTypeCard = (wasteType) => {
    const isSelected = selectedWasteTypes.includes(wasteType.id);
    
    return (
      <TouchableOpacity
        key={wasteType.id}
        style={[
          styles.wasteTypeCard,
          isSelected && { ...styles.selectedWasteType, borderColor: wasteType.color }
        ]}
        onPress={() => toggleWasteType(wasteType.id)}>
        
        <View style={[styles.wasteTypeIcon, { backgroundColor: wasteType.color }]}>
          <Icon name={wasteType.icon} size={30} color="#fff" />
        </View>
        
        <View style={styles.wasteTypeInfo}>
          <Text style={styles.wasteTypeName}>{wasteType.name}</Text>
          <Text style={styles.wasteTypeDesc}>{wasteType.description}</Text>
          <Text style={styles.wasteTypeExamples}>
            Examples: {wasteType.examples.join(', ')}
          </Text>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Icon name="check-circle" size={24} color={wasteType.color} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTimeSlotCard = (slot) => {
    const isSelected = selectedTimeSlot === slot.id;
    
    return (
      <TouchableOpacity
        key={slot.id}
        style={[
          styles.timeSlotCard,
          !slot.available && styles.unavailableSlot,
          isSelected && styles.selectedTimeSlot,
        ]}
        disabled={!slot.available}
        onPress={() => setSelectedTimeSlot(slot.id)}>
        
        <Text style={[
          styles.timeSlotText,
          !slot.available && styles.unavailableText,
          isSelected && styles.selectedTimeSlotText,
        ]}>
          {slot.label}
        </Text>
        
        <Text style={[
          styles.availabilityText,
          !slot.available && styles.unavailableText,
        ]}>
          {slot.available ? 'Available' : 'Full'}
        </Text>
        
        {isSelected && (
          <Icon name="check-circle" size={20} color="#4CAF50" style={styles.timeSlotCheck} />
        )}
      </TouchableOpacity>
    );
  };

  const renderActivePickup = (pickup) => {
    return (
      <View key={pickup.id} style={styles.activePickupCard}>
        <View style={styles.pickupHeader}>
          <Text style={styles.pickupStatus}>
            Status: <Text style={styles.confirmedStatus}>{pickup.status.toUpperCase()}</Text>
          </Text>
          <Text style={styles.pickupTime}>{pickup.scheduledTime}</Text>
        </View>
        
        <View style={styles.wasteTypesDisplay}>
          {pickup.wasteTypes.map(typeId => {
            const wasteType = getWasteTypeInfo(typeId);
            return (
              <View key={typeId} style={[styles.wasteTypeBadge, { backgroundColor: wasteType.color }]}>
                <Text style={styles.wasteTypeBadgeText}>{wasteType.name}</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.workerInfo}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.workerName}>{pickup.worker.name}</Text>
          <Text style={styles.workerRating}>★ {pickup.worker.rating}</Text>
        </View>
        
        <View style={styles.pickupActions}>
          <TouchableOpacity style={styles.callButton}>
            <Icon name="phone" size={18} color="#fff" />
            <Text style={styles.callButtonText}>Call Worker</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.trackButton}>
            <Icon name="location-on" size={18} color="#fff" />
            <Text style={styles.trackButtonText}>Track</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.estimatedArrival}>
          Estimated arrival: {pickup.estimatedArrival}
        </Text>
      </View>
    );
  };

  const renderScheduleModal = () => {
    return (
      <Modal
        visible={scheduleModalVisible}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule Waste Pickup</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setScheduleModalVisible(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Waste Type Selection */}
              <Text style={styles.sectionTitle}>Select Waste Types:</Text>
              {wasteTypes.map(renderWasteTypeCard)}

              {/* Weight Estimation */}
              <Text style={styles.sectionTitle}>Estimated Weight:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter estimated weight (e.g., 2 kg)"
                value={estimatedWeight}
                onChangeText={setEstimatedWeight}
                keyboardType="default"
              />

              {/* Time Slot Selection */}
              <Text style={styles.sectionTitle}>Preferred Time Slot:</Text>
              {timeSlots.map(renderTimeSlotCard)}

              {/* Special Instructions */}
              <Text style={styles.sectionTitle}>Special Instructions (Optional):</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions for the pickup..."
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={3}
              />

              {/* Schedule Button */}
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={schedulePickup}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="schedule" size={20} color="#fff" />
                    <Text style={styles.scheduleButtonText}>Schedule Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Waste Pickup</Text>
          <TouchableOpacity
            style={styles.scheduleNewButton}
            onPress={() => setScheduleModalVisible(true)}>
            <Icon name="add" size={24} color="#fff" />
            <Text style={styles.scheduleNewButtonText}>Schedule New</Text>
          </TouchableOpacity>
        </View>

        {/* Active Pickups */}
        {activePickups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Active Pickups</Text>
            {activePickups.map(renderActivePickup)}
          </View>
        )}

        {/* Quick Schedule Options */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Quick Schedule</Text>
          <View style={styles.quickOptions}>
            {wasteTypes.map(wasteType => (
              <TouchableOpacity
                key={wasteType.id}
                style={[styles.quickOptionCard, { borderColor: wasteType.color }]}
                onPress={() => {
                  setSelectedWasteTypes([wasteType.id]);
                  setScheduleModalVisible(true);
                }}>
                <View style={[styles.quickOptionIcon, { backgroundColor: wasteType.color }]}>
                  <Icon name={wasteType.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.quickOptionText}>{wasteType.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pickup History */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Recent Pickups</Text>
          {pickupHistory.map(pickup => (
            <View key={pickup.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{pickup.date}</Text>
                <Text style={[styles.historyStatus, styles.completedStatus]}>
                  {pickup.status.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.historyDetails}>
                <Text style={styles.historyWeight}>Weight: {pickup.weight}</Text>
                <Text style={styles.historyWorker}>Worker: {pickup.worker}</Text>
              </View>
              
              <View style={styles.historyWasteTypes}>
                {pickup.wasteTypes.map(typeId => {
                  const wasteType = getWasteTypeInfo(typeId);
                  return (
                    <View key={typeId} style={[styles.historyBadge, { backgroundColor: wasteType.color }]}>
                      <Text style={styles.historyBadgeText}>{wasteType.name}</Text>
                    </View>
                  );
                })}
              </View>
              
              <View style={styles.historyRating}>
                <Text style={styles.ratingText}>Rating: </Text>
                {[...Array(5)].map((_, i) => (
                  <Icon 
                    key={i} 
                    name="star" 
                    size={16} 
                    color={i < pickup.rating ? "#FFD700" : "#ddd"} 
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {renderScheduleModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scheduleNewButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scheduleNewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  section: {
    margin: 15,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  activePickupCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 10,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickupStatus: {
    fontSize: 14,
    color: '#666',
  },
  confirmedStatus: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  pickupTime: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  wasteTypesDisplay: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  wasteTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
  },
  wasteTypeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  workerRating: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  pickupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  callButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  trackButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  estimatedArrival: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickOptionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 0.3,
    borderWidth: 2,
    elevation: 2,
  },
  quickOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  completedStatus: {
    color: '#4CAF50',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyWeight: {
    fontSize: 14,
    color: '#666',
  },
  historyWorker: {
    fontSize: 14,
    color: '#666',
  },
  historyWasteTypes: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  historyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  wasteTypeCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedWasteType: {
    backgroundColor: '#f0f8ff',
  },
  wasteTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  wasteTypeInfo: {
    flex: 1,
  },
  wasteTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  wasteTypeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  wasteTypeExamples: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedIndicator: {
    padding: 5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeSlotCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeSlot: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  unavailableSlot: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#4CAF50',
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
  },
  unavailableText: {
    color: '#999',
  },
  timeSlotCheck: {
    marginLeft: 10,
  },
  scheduleButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default SchedulePickupScreen;
