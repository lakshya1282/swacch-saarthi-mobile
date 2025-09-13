import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface UserData {
  firstName: string;
  lastName: string;
  userType: string;
}

const HomeScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pickupStats, setPickupStats] = useState({
    totalPickups: 0,
    completedPickups: 0,
    pendingPickups: 0,
    segregationRate: 0
  });
  const [recentPickups, setRecentPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user's pickups to calculate stats
      const pickupsResponse = await apiService.getPickups();
      if (pickupsResponse.data.success) {
        const pickups = pickupsResponse.data.data || pickupsResponse.data.pickups || [];
        const totalPickups = pickups.length;
        const completedPickups = pickups.filter((p: any) => p.status === 'completed').length;
        const pendingPickups = pickups.filter((p: any) => p.status === 'pending').length;
        const segregationRate = totalPickups > 0 ? Math.round((completedPickups / totalPickups) * 100) : 0;
        
        setPickupStats({
          totalPickups,
          completedPickups,
          pendingPickups,
          segregationRate
        });
        
        // Keep only recent pickups (last 3)
        setRecentPickups(pickups.slice(0, 3));
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      
      // If it's an authentication error, the interceptor will handle logout
      if (error.response?.status === 401) {
        console.log('Authentication error - user will be logged out automatically');
      }
      
      // Use default/demo data for now
      setPickupStats({
        totalPickups: 0,
        completedPickups: 0,
        pendingPickups: 0,
        segregationRate: 0
      });
      setRecentPickups([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by AuthContext
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Schedule Pickup',
      subtitle: 'Schedule waste collection',
      icon: 'schedule',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Schedule' as never),
    },
    {
      title: 'Training Videos',
      subtitle: 'Learn waste segregation',
      icon: 'school',
      color: '#2196F3',
      onPress: () => navigation.navigate('Training' as never),
    },
    {
      title: 'QR Code',
      subtitle: 'View your QR code',
      icon: 'qr-code',
      color: '#FF9800',
      onPress: () => navigation.navigate('QRCode' as never),
    },
    {
      title: 'Waste Validation',
      subtitle: 'Validate waste types',
      icon: 'verified',
      color: '#9C27B0',
      onPress: () => navigation.navigate('WasteValidation' as never),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {userData ? `${userData.firstName} ${userData.lastName}` : 'User'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="eco" size={30} color="#4CAF50" />
          <Text style={styles.statNumber}>{pickupStats.totalPickups}</Text>
          <Text style={styles.statLabel}>Total Pickups</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="recycling" size={30} color="#2196F3" />
          <Text style={styles.statNumber}>{pickupStats.segregationRate}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>
      </View>

      {/* Recent Pickups Section */}
      {recentPickups.length > 0 && (
        <View style={styles.recentPickupsContainer}>
          <Text style={styles.sectionTitle}>Recent Pickups</Text>
          {recentPickups.map((pickup, index) => (
            <View key={pickup.pickupId || index} style={styles.pickupCard}>
              <View style={styles.pickupHeader}>
                <Text style={styles.pickupId}>#{pickup.pickupId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pickup.status) }]}>
                  <Text style={styles.statusText}>{pickup.status?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.pickupDate}>
                {pickup.scheduledDate} • {pickup.timeSlot}
              </Text>
              <Text style={styles.pickupWaste}>
                {pickup.wasteTypes?.join(', ') || 'Mixed Waste'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <MaterialIcons name={item.icon as any} size={24} color="#fff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Proper Waste Segregation</Text>
          <Text style={styles.tipText}>
            Separate wet waste (organic) from dry waste (plastic, paper, metal) for better recycling.
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Schedule Regular Pickups</Text>
          <Text style={styles.tipText}>
            Schedule weekly pickups to maintain cleanliness and avoid waste accumulation.
          </Text>
        </View>
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
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  menuContainer: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tipsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  recentPickupsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  pickupCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  pickupDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pickupWaste: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default HomeScreen;
