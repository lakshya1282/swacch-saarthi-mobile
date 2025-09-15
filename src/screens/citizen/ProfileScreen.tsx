import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api.service';
import { storage } from '../../utils';
import { STORAGE_KEYS } from '../../constants';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  address: string;
  pincode: string;
  totalPickups: number;
  totalWasteCollected: number;
  rating?: {
    average: number;
    count: number;
  };
  createdAt: string;
}

interface ProfileStats {
  totalPickups: number;
  completedPickups: number;
  pendingPickups: number;
  totalWasteCollected: number;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { userData, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalPickups: 0,
    completedPickups: 0,
    pendingPickups: 0,
    totalWasteCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    console.log('Auth status:', { isLoggedIn, userData });
    
    // Check stored token
    const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    console.log('Stored token exists:', !!token);
    
    try {
      const response = await apiService.getUserProfile();
      console.log('Profile response:', response);
      
      // Ensure all required fields have defaults
      const profileData = {
        _id: (response as any)._id || (response as any).id,
        firstName: (response as any).firstName || '',
        lastName: (response as any).lastName || '',
        email: (response as any).email || '',
        phone: (response as any).phone || '',
        alternativePhone: (response as any).alternativePhone || '',
        address: (response as any).address || '',
        pincode: (response as any).pincode || '',
        totalPickups: (response as any).totalPickups || 0,
        totalWasteCollected: (response as any).totalWasteCollected || 0,
        rating: (response as any).rating || { average: 0, count: 0 },
        createdAt: (response as any).createdAt || new Date().toISOString(),
      };
      
      setProfile(profileData);
      
      // Fetch pickup history for stats
      try {
        const pickupHistory = await apiService.getPickupHistory();
        console.log('Pickup history response:', pickupHistory);
        
        if (pickupHistory && pickupHistory.stats) {
          setStats({
            totalPickups: pickupHistory.stats.total || 0,
            completedPickups: pickupHistory.stats.completed || 0,
            pendingPickups: pickupHistory.stats.pending || 0,
            totalWasteCollected: profileData.totalWasteCollected || 0,
          });
        } else {
          // Set default stats if pickup history is not available
          setStats({
            totalPickups: 0,
            completedPickups: 0,
            pendingPickups: 0,
            totalWasteCollected: profileData.totalWasteCollected || 0,
          });
        }
      } catch (historyError) {
        console.error('Error fetching pickup history:', historyError);
        // Continue with default stats
        setStats({
          totalPickups: 0,
          completedPickups: 0,
          pendingPickups: 0,
          totalWasteCollected: profileData.totalWasteCollected || 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', error.message, error.code, error.details);
      Alert.alert(
        'Error', 
        error.message || 'Failed to load profile',
        [{ text: 'OK' }, { text: 'Retry', onPress: fetchProfile }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings', { profile });
  };

  const navigateToPickupHistory = () => {
    navigation.navigate('PickupHistory');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>
          {profile?.firstName} {profile?.lastName}
        </Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
        
        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={navigateToSettings}>
          <MaterialIcons name="edit" size={20} color="white" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPickups}</Text>
          <Text style={styles.statLabel}>Total Pickups</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completedPickups}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingPickups}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalWasteCollected} kg</Text>
          <Text style={styles.statLabel}>Waste Collected</Text>
        </View>
      </View>

      {/* Profile Information */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="phone" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile?.phone}</Text>
          </View>
        </View>

        {profile?.alternativePhone && (
          <View style={styles.infoRow}>
            <MaterialIcons name="phone-android" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Alternative Phone</Text>
              <Text style={styles.infoValue}>{profile.alternativePhone}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>
              {profile?.address}\n{profile?.pincode}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="calendar-today" size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={navigateToPickupHistory}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="history" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>Your Pickups</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={navigateToSettings}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="settings" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>Settings</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Help & Support', 'Coming soon!')}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="help-outline" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('About', 'Waste Management App v1.0')}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="info-outline" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: 'white',
    marginTop: -20,
    marginHorizontal: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCard: {
    width: '50%',
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  menuSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
});

export default ProfileScreen;
