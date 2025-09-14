import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import apiService from '../../services/apiService';

interface HouseholdQRData {
  citizenId: string;
  householdId: string;
  householdAddress: string;
  citizenName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

interface QRCodeData {
  pickupId: string;
  userId: string;
  customerName: string;
  wasteTypes: string[];
  estimatedWeight: string;
  timeSlot: string;
  scheduledDate: string;
  location: {
    latitude: number;
    longitude: number;
  };
  verificationCode: string;
}

interface Pickup {
  pickupId: string;
  status: string;
  scheduledDate: string;
  timeSlot: string;
  wasteTypes: string[];
  estimatedWeight: string;
  qrCodeData: QRCodeData;
  createdAt: string;
}

const { width } = Dimensions.get('window');

const QRCodeScreen: React.FC = () => {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [showHouseholdQR, setShowHouseholdQR] = useState(true);

  useEffect(() => {
    loadUserData();
    loadPickups();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPickups = async () => {
    try {
      setLoading(true);
      
      // Load local pickup data first
      const localPickups: Pickup[] = [];
      
      try {
        const keys = await AsyncStorage.getAllKeys();
        const pickupKeys = keys.filter(key => key.startsWith('pickup_'));
        
        for (const key of pickupKeys) {
          const pickupData = await AsyncStorage.getItem(key);
          if (pickupData) {
            const pickup = JSON.parse(pickupData);
            if (pickup.qrCodeData && pickup.status !== 'cancelled') {
              localPickups.push({
                pickupId: pickup.pickupId,
                status: pickup.status || 'pending',
                scheduledDate: pickup.qrCodeData.scheduledDate,
                timeSlot: pickup.qrCodeData.timeSlot,
                wasteTypes: pickup.qrCodeData.wasteTypes,
                estimatedWeight: pickup.qrCodeData.estimatedWeight,
                qrCodeData: pickup.qrCodeData,
                createdAt: pickup.createdAt
              });
            }
          }
        }
      } catch (localError) {
        console.log('No local pickups found:', localError);
      }
      
      // Try to load from API as well
      try {
        const response = await apiService.getPickups();
        
        if (response.data && response.data.success) {
          const apiPickups = (response.data.pickups || response.data.data || []).filter(
            (pickup: any) => pickup.status !== 'cancelled'
          ).map((pickup: any) => ({
            pickupId: pickup.pickupId,
            status: pickup.status,
            scheduledDate: pickup.scheduledDate,
            timeSlot: pickup.timeSlot,
            wasteTypes: pickup.wasteTypes || [],
            estimatedWeight: pickup.estimatedWeight,
            qrCodeData: {
              pickupId: pickup.pickupId,
              userId: pickup.userId,
              customerName: pickup.customerName,
              wasteTypes: pickup.wasteTypes || [],
              estimatedWeight: pickup.estimatedWeight,
              timeSlot: pickup.timeSlot,
              scheduledDate: pickup.scheduledDate,
              location: pickup.location || { latitude: 12.9716, longitude: 77.5946 },
              verificationCode: pickup.verificationCode || 'DEMO123'
            },
            createdAt: pickup.createdAt
          }));
          
          // Merge local and API pickups (prefer local data)
          const allPickups = [...localPickups];
          apiPickups.forEach((apiPickup: Pickup) => {
            if (!allPickups.find(local => local.pickupId === apiPickup.pickupId)) {
              allPickups.push(apiPickup);
            }
          });
          
          setPickups(allPickups);
        } else {
          // Use only local pickups if API fails
          setPickups(localPickups);
        }
      } catch (apiError) {
        console.log('API call failed, using local pickups only:', apiError);
        setPickups(localPickups);
      }
      
      // Auto-select first pickup if available
      const finalPickups = localPickups.length > 0 ? localPickups : [];
      if (finalPickups.length > 0 && !selectedPickup) {
        setSelectedPickup(finalPickups[0]);
      }
    } catch (error) {
      console.error('Error loading pickups:', error);
      Alert.alert('Error', 'Failed to load pickup data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPickups();
    setRefreshing(false);
  };

  const generateQRCodeText = (pickup: Pickup): string => {
    const qrData = {
      pickupId: pickup.pickupId,
      userId: pickup.qrCodeData.userId,
      customerName: pickup.qrCodeData.customerName,
      wasteTypes: pickup.qrCodeData.wasteTypes,
      estimatedWeight: pickup.qrCodeData.estimatedWeight,
      timeSlot: pickup.qrCodeData.timeSlot,
      scheduledDate: pickup.qrCodeData.scheduledDate,
      location: pickup.qrCodeData.location,
      verificationCode: pickup.qrCodeData.verificationCode,
      timestamp: Date.now()
    };
    
    return JSON.stringify(qrData);
  };

  const generateHouseholdQRData = (): string => {
    // Generate QR data for household identification
    const householdData: HouseholdQRData = {
      citizenId: userData?.id || userData?.userId || 'CIT' + Date.now(),
      householdId: 'HH' + (userData?.id || Date.now()).toString().slice(-6),
      householdAddress: userData?.address || '123 Main St, Bangalore',
      citizenName: userData?.name || userData?.username || 'Citizen User',
      location: {
        latitude: userData?.location?.latitude || 12.9716,
        longitude: userData?.location?.longitude || 77.5946
      },
      timestamp: Date.now()
    };
    
    return JSON.stringify(householdData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'assigned': return '#2196F3';
      case 'in_progress': return '#9C27B0';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const renderQRCode = (data: string) => {
    const qrSize = Math.min(width - 80, 250);
    return (
      <View style={[styles.qrCodeContainer, { width: qrSize, height: qrSize }]}>
        <QRCode
          value={data}
          size={qrSize - 40}
          backgroundColor="white"
          color="black"
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading QR codes...</Text>
      </View>
    );
  }

  if (pickups.length === 0) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>QR Codes</Text>
          <Text style={styles.subtitle}>Show QR codes to waste collectors</Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <MaterialIcons name="qr-code-2" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No QR Codes Available</Text>
          <Text style={styles.emptyDescription}>
            Schedule a pickup to generate QR codes for waste collection
          </Text>
          <TouchableOpacity style={styles.scheduleButton} onPress={() => {}}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.scheduleButtonText}>Schedule Pickup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>QR Codes</Text>
        <Text style={styles.subtitle}>
          {showHouseholdQR ? 'Show household QR to workers when they arrive' : 'Show pickup QR for verification'}
        </Text>
      </View>

      {/* QR Type Selection */}
      <View style={styles.qrTypeSelector}>
        <TouchableOpacity
          style={[
            styles.qrTypeButton,
            showHouseholdQR && styles.activeQRTypeButton
          ]}
          onPress={() => setShowHouseholdQR(true)}
        >
          <MaterialIcons 
            name="home" 
            size={20} 
            color={showHouseholdQR ? '#fff' : '#666'} 
          />
          <Text style={[
            styles.qrTypeButtonText,
            showHouseholdQR && styles.activeQRTypeButtonText
          ]}>Household QR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.qrTypeButton,
            !showHouseholdQR && styles.activeQRTypeButton
          ]}
          onPress={() => setShowHouseholdQR(false)}
        >
          <MaterialIcons 
            name="local-shipping" 
            size={20} 
            color={!showHouseholdQR ? '#fff' : '#666'} 
          />
          <Text style={[
            styles.qrTypeButtonText,
            !showHouseholdQR && styles.activeQRTypeButtonText
          ]}>Pickup QR</Text>
        </TouchableOpacity>
      </View>

      {/* Pickup Selection */}
      {!showHouseholdQR && pickups.length > 1 && (
        <View style={styles.pickupSelector}>
          <Text style={styles.selectorTitle}>Select Pickup:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pickups.map((pickup, index) => (
              <TouchableOpacity
                key={pickup.pickupId}
                style={[
                  styles.pickupTab,
                  selectedPickup?.pickupId === pickup.pickupId && styles.selectedPickupTab
                ]}
                onPress={() => setSelectedPickup(pickup)}
              >
                <Text style={[
                  styles.pickupTabText,
                  selectedPickup?.pickupId === pickup.pickupId && styles.selectedPickupTabText
                ]}>#{pickup.pickupId.slice(-6)}</Text>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: getStatusColor(pickup.status) }
                ]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Household QR Code Display */}
      {showHouseholdQR && userData && (
        <View style={styles.qrCodeSection}>
          <View style={styles.qrCodeCard}>
            <Text style={styles.qrCodeTitle}>Household QR Code</Text>
            <Text style={styles.qrCodeSubtitle}>
              Citizen ID: {userData?.id || userData?.userId || 'CIT' + Date.now()}
            </Text>
            
            {renderQRCode(generateHouseholdQRData())}
            
            <View style={styles.householdInfo}>
              <MaterialIcons name="info-outline" size={16} color="#2196F3" />
              <Text style={styles.householdInfoText}>
                Workers will scan this to mark arrival at your household
              </Text>
            </View>
            
            <Text style={styles.instructionText}>
              Show this QR code when waste collector arrives at your door
            </Text>
            
            <View style={styles.qrCodeActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Share', 'Household QR code sharing functionality')}
              >
                <MaterialIcons name="share" size={20} color="#2196F3" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Save', 'Household QR code save functionality')}
              >
                <MaterialIcons name="download" size={20} color="#2196F3" />
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Pickup QR Code Display */}
      {!showHouseholdQR && selectedPickup && (
        <View style={styles.qrCodeSection}>
          <View style={styles.qrCodeCard}>
            <Text style={styles.qrCodeTitle}>Pickup QR Code</Text>
            <Text style={styles.qrCodeSubtitle}>#{selectedPickup.pickupId}</Text>
            
            {renderQRCode(generateQRCodeText(selectedPickup))}
            
            <Text style={styles.instructionText}>
              Show this QR code to complete the pickup verification
            </Text>
            
            <View style={styles.qrCodeActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Share', 'QR code sharing functionality')}
              >
                <MaterialIcons name="share" size={20} color="#2196F3" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Save', 'QR code save functionality')}
              >
                <MaterialIcons name="download" size={20} color="#2196F3" />
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Household Details */}
      {showHouseholdQR && userData && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Household Details</Text>
          
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Citizen Name</Text>
                <Text style={styles.detailValue}>
                  {userData?.name || userData?.username || 'Citizen User'}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="badge" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Citizen ID</Text>
                <Text style={styles.detailValue}>
                  {userData?.id || userData?.userId || 'CIT' + Date.now()}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="home" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Household ID</Text>
                <Text style={styles.detailValue}>
                  HH{(userData?.id || Date.now()).toString().slice(-6)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>
                  {userData?.address || '123 Main St, Bangalore'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Pickup Details */}
      {!showHouseholdQR && selectedPickup && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Pickup Details</Text>
          
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Schedule</Text>
                <Text style={styles.detailValue}>
                  {selectedPickup.scheduledDate} • {selectedPickup.timeSlot}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="delete" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Waste Types</Text>
                <Text style={styles.detailValue}>
                  {selectedPickup.wasteTypes.join(', ')}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="scale" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Estimated Weight</Text>
                <Text style={styles.detailValue}>{selectedPickup.estimatedWeight}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="info" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusColor(selectedPickup.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {selectedPickup.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {showHouseholdQR 
            ? '🏠 Workers scan this QR to notify arrival at your household'
            : '💡 Keep this QR code ready for pickup verification'
          }
        </Text>
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
    backgroundColor: '#FF9800',
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  scheduleButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pickupSelector: {
    padding: 20,
    paddingBottom: 10,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  pickupTab: {
    backgroundColor: '#fff',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPickupTab: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  pickupTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  selectedPickupTabText: {
    color: '#fff',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  qrCodeSection: {
    padding: 20,
  },
  qrCodeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  qrCodeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  qrCodeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTypeSelector: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  qrTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  activeQRTypeButton: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  qrTypeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeQRTypeButtonText: {
    color: '#fff',
  },
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    marginTop: 10,
  },
  householdInfoText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#1976D2',
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrCodeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '500',
  },
  detailsSection: {
    padding: 20,
    paddingTop: 0,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusContainer: {
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default QRCodeScreen;
