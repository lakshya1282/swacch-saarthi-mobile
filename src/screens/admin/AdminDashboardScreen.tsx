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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  inProgressComplaints: number;
}

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    inProgressComplaints: 0,
  });
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get admin info
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setAdminName(`${user.firstName} ${user.lastName}`);
      }

      // Load all complaints
      const response = await apiService.getComplaints();
      
      if (response.data.success) {
        const complaints = response.data.complaints || response.data.data || [];
        
        // Calculate stats
        const pending = complaints.filter((c: any) => c.status === 'Pending').length;
        const inProgress = complaints.filter((c: any) => c.status === 'In Progress').length;
        const resolved = complaints.filter((c: any) => c.status === 'Resolved' || c.status === 'Closed').length;
        
        setStats({
          totalComplaints: complaints.length,
          pendingComplaints: pending,
          inProgressComplaints: inProgress,
          resolvedComplaints: resolved,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('✅ Admin logged out successfully');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ title, value, color, icon }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const MenuButton = ({ title, icon, onPress, color = '#4CAF50' }: any) => (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.menuButtonText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.adminName}>{adminName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <StatCard
          title="Total Complaints"
          value={stats.totalComplaints}
          color="#2196F3"
          icon="assignment"
        />
        
        <StatCard
          title="Pending"
          value={stats.pendingComplaints}
          color="#FF9800"
          icon="schedule"
        />
        
        <StatCard
          title="In Progress"
          value={stats.inProgressComplaints}
          color="#9C27B0"
          icon="pending-actions"
        />
        
        <StatCard
          title="Resolved"
          value={stats.resolvedComplaints}
          color="#4CAF50"
          icon="check-circle"
        />
      </View>

      {/* Menu Section */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Management</Text>
        
        <MenuButton
          title="All Complaints"
          icon="list"
          color="#2196F3"
          onPress={() => navigation.navigate('AdminComplaints' as never)}
        />
        
        <MenuButton
          title="Pending Complaints"
          icon="schedule"
          color="#FF9800"
          onPress={() => navigation.navigate('AdminComplaints' as never, { filter: 'Pending' } as never)}
        />
        
        <MenuButton
          title="In Progress"
          icon="pending-actions"
          color="#9C27B0"
          onPress={() => navigation.navigate('AdminComplaints' as never, { filter: 'In Progress' } as never)}
        />
        
        <MenuButton
          title="Resolved Complaints"
          icon="check-circle"
          color="#4CAF50"
          onPress={() => navigation.navigate('AdminComplaints' as never, { filter: 'Resolved' } as never)}
        />
        
        <MenuButton
          title="Statistics"
          icon="bar-chart"
          color="#FF5722"
          onPress={() => Alert.alert('Coming Soon', 'Statistics view will be available soon')}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <MaterialIcons name="refresh" size={32} color="#4CAF50" />
            <Text style={styles.quickActionText}>Refresh Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <MaterialIcons name="notifications" size={32} color="#FF9800" />
            <Text style={styles.quickActionText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomPadding} />
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#E8F5E9',
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    padding: 20,
    paddingTop: 0,
  },
  menuButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  quickActionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});

export default AdminDashboardScreen;
