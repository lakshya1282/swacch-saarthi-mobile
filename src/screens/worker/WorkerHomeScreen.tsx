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
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/apiService';
import socketService from '../../services/socketService';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardStats {
  totalTasks: number;
  completedToday: number;
  pendingTasks: number;
  availableTasks: number;
  todayEarnings: number;
  monthlyEarnings: number;
  rating: number;
  activePickups: number;
}

interface Assignment {
  id: string;
  _id: string;
  pickupId: string;
  address: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerPincode: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: string;
  scheduledDate: string;
  wasteTypes: string[];
  estimatedWeight: string;
  timeSlot: string;
  specialInstructions: string;
  priority: 'low' | 'medium' | 'high';
  location?: {
    latitude: number;
    longitude: number;
  };
  earnings?: number;
  distance?: number;
  createdAt: string;
}

const WorkerHomeScreen: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedToday: 0,
    pendingTasks: 0,
    availableTasks: 0,
    todayEarnings: 0,
    monthlyEarnings: 0,
    rating: 4.8,
    activePickups: 0,
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const navigation = useNavigation();
  const { userData, logout } = useAuth();
  
  // Mask pickup ID for workers - show only last 5 digits
  const maskPickupId = (pickupId: string) => {
    if (!pickupId) return '';
    const idString = String(pickupId);
    if (idString.length <= 5) return idString;
    return `****${idString.slice(-5)}`;
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up Socket.IO listeners for real-time updates
    const handlePickupUpdate = (data: any) => {
      console.log('Dashboard: Real-time pickup update received:', data.type);
      loadDashboardData(); // Reload dashboard when any pickup update occurs
    };
    
    const handleNewPickup = (data: any) => {
      console.log('Dashboard: New pickup received:', data);
      loadDashboardData();
      // Update stats immediately for better UX
      setStats(prev => ({
        ...prev,
        availableTasks: prev.availableTasks + 1,
        totalTasks: prev.totalTasks + 1
      }));
    };
    
    // Subscribe to socket events
    socketService.on('pickup-update', handlePickupUpdate);
    socketService.on('new-pickup', handleNewPickup);
    socketService.on('pickup-assigned', handlePickupUpdate);
    socketService.on('task-update', handlePickupUpdate);
    
    // Ensure socket is connected
    if (!socketService.isConnected()) {
      socketService.reconnect();
    }
    
    return () => {
      // Cleanup socket listeners
      socketService.off('pickup-update', handlePickupUpdate);
      socketService.off('new-pickup', handleNewPickup);
      socketService.off('pickup-assigned', handlePickupUpdate);
      socketService.off('task-update', handlePickupUpdate);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      if (assignments.length === 0) {
        setLoading(true);
      }
      
      // Get worker's assigned pickups
      const workerId = userData?.id || userData?._id;
      let workerAssignments: Assignment[] = [];
      
      try {
        // Get all pickups and filter for this worker's assignments
        const response = await apiService.getAllPickups();
        const allTasks = response.data?.data || response.data || [];
        
        // Also check for locally stored accepted tasks
        const acceptedTasksStr = await AsyncStorage.getItem(`acceptedTasks_${workerId}`);
        const acceptedTaskIds = acceptedTasksStr ? JSON.parse(acceptedTasksStr) : [];
        
        console.log('Worker ID:', workerId);
        console.log('All tasks count:', allTasks.length);
        console.log('Locally accepted task IDs:', acceptedTaskIds);
        
        // Filter for this worker's assignments
        workerAssignments = allTasks
          .filter((task: any) => {
            const taskId = task._id || task.id || task.pickupId;
            const isAssignedStatus = task.status === 'assigned' || task.status === 'in_progress';
            const isAssignedToWorker = task.assignedWorkerId === workerId;
            const isLocallyAccepted = acceptedTaskIds.includes(taskId);
            
            return isAssignedStatus || isAssignedToWorker || isLocallyAccepted;
          })
          .map((task: any) => {
            const taskId = task._id || task.id || task.pickupId;
            const isLocallyAccepted = acceptedTaskIds.includes(taskId);
            
            // If locally accepted but still pending on server, show as assigned
            let taskStatus = transformPickupStatus(task.status || 'pending');
            if (isLocallyAccepted && taskStatus === 'pending') {
              taskStatus = 'assigned';
            }
            
            return {
              id: taskId,
              _id: taskId,
              pickupId: task.pickupId || `PK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              address: task.address || task.customerAddress || 'Address not specified',
              customerName: task.customerName || 'Customer',
              customerPhone: task.customerPhone || '+91 98765 43210',
              customerAddress: task.customerAddress || task.address || 'Address not specified',
              customerPincode: task.customerPincode || '560001',
              status: taskStatus,
              scheduledTime: task.scheduledDate || task.scheduledTime || task.createdAt,
              scheduledDate: task.scheduledDate || new Date().toISOString(),
              wasteTypes: Array.isArray(task.wasteTypes) ? task.wasteTypes : [task.wasteType || 'Mixed'],
              estimatedWeight: task.estimatedWeight || '5 kg',
              timeSlot: task.timeSlot || '9:00 AM - 11:00 AM',
              specialInstructions: task.specialInstructions || 'Ring the doorbell',
              priority: calculateTaskPriority(task),
              location: task.location,
              earnings: 50,
              distance: task.distance || Math.random() * 5 + 1,
              createdAt: task.createdAt || new Date().toISOString(),
            };
          });
          
        console.log('Worker assignments found:', workerAssignments.length);
        console.log('Assigned/In Progress tasks:', workerAssignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length);
      } catch (error) {
        console.log('Error fetching worker assignments:', error);
      }
      
      // Get all pickups for stats
      try {
        const pickupsResponse = await apiService.getAllPickups();
        const allPickups = pickupsResponse.data?.data || pickupsResponse.data || [];
        
        // Calculate comprehensive stats
        const today = new Date().toDateString();
        const todayPickups = allPickups.filter((p: any) => 
          new Date(p.scheduledDate || p.createdAt).toDateString() === today
        );
        
        const completedToday = todayPickups.filter((p: any) => 
          p.status === 'completed' || p.status === 'collected'
        ).length;
        
        const activePickups = workerAssignments.filter(a => 
          a.status === 'assigned' || a.status === 'in_progress'
        ).length;
        
        const monthlyCompleted = allPickups.filter((p: any) => {
          const pickupDate = new Date(p.completedAt || p.createdAt);
          const now = new Date();
          return p.status === 'completed' && 
                 pickupDate.getMonth() === now.getMonth() &&
                 pickupDate.getFullYear() === now.getFullYear();
        }).length;
        
        setStats({
          totalTasks: workerAssignments.length,
          completedToday: completedToday,
          pendingTasks: workerAssignments.filter(a => a.status === 'assigned').length,
          availableTasks: allPickups.filter((p: any) => p.status === 'pending').length,
          todayEarnings: completedToday * 50,
          monthlyEarnings: monthlyCompleted * 50,
          rating: 4.5 + (Math.random() * 0.5),
          activePickups: activePickups,
        });
      } catch (error) {
        console.log('Error calculating stats:', error);
      }
      
      setAssignments(workerAssignments);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use demo data as fallback
      setStats({
        totalTasks: 8,
        completedToday: 3,
        pendingTasks: 2,
        availableTasks: 3,
        todayEarnings: 150,
        monthlyEarnings: 2500,
        rating: 4.8,
        activePickups: 0,
      });
      
      // Set demo assignments data as fallback
      const demoAssignments: Assignment[] = [
        {
          id: '1',
          _id: '1',
          pickupId: 'PK001',
          address: '123 Main St, Sector 5',
          customerName: 'Demo Customer 1',
          customerPhone: '+91 98765 43210',
          customerAddress: '123 Main St, Sector 5',
          customerPincode: '560001',
          status: 'assigned',
          scheduledTime: new Date().toISOString(),
          scheduledDate: new Date().toISOString(),
          wasteTypes: ['Mixed'],
          estimatedWeight: '5 kg',
          timeSlot: '9:00 AM - 11:00 AM',
          specialInstructions: 'Ring the doorbell',
          priority: 'high',
          earnings: 50,
          distance: 2.5,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          _id: '2',
          pickupId: 'PK002',
          address: '456 Park Ave, Sector 7',
          customerName: 'Demo Customer 2',
          customerPhone: '+91 98765 43211',
          customerAddress: '456 Park Ave, Sector 7',
          customerPincode: '560002',
          status: 'pending',
          scheduledTime: new Date().toISOString(),
          scheduledDate: new Date().toISOString(),
          wasteTypes: ['Organic'],
          estimatedWeight: '3 kg',
          timeSlot: '2:00 PM - 4:00 PM',
          specialInstructions: 'Call before arriving',
          priority: 'medium',
          earnings: 40,
          distance: 3.2,
          createdAt: new Date().toISOString(),
        },
      ];
      setAssignments(demoAssignments);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Transform pickup status to task status
  const transformPickupStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'pending',
      'pending': 'pending',
      'accepted': 'assigned',
      'assigned': 'assigned',
      'in_progress': 'in_progress',
      'in-progress': 'in_progress',
      'collected': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  };

  // Calculate task priority
  const calculateTaskPriority = (pickup: any): string => {
    if (pickup.wasteTypes?.includes('Medical Waste') || pickup.wasteTypes?.includes('Hazardous Waste')) {
      return 'high';
    }
    if (pickup.wasteTypes?.includes('Electronic Waste')) {
      return 'medium';
    }
    return 'low';
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
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
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
          colors={['#FF9800']}
          tintColor="#FF9800"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {userData ? `${userData.firstName} ${userData.lastName}` : 'Worker'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Earnings Card with Rating */}
      <View style={styles.earningsCard}>
        <View style={styles.earningsRow}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Today's Earnings</Text>
            <Text style={styles.earningsAmount}>₹{stats.todayEarnings}</Text>
          </View>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>This Month</Text>
            <Text style={styles.earningsAmount}>₹{stats.monthlyEarnings}</Text>
          </View>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Your Rating</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.earningsAmount}>{stats.rating.toFixed(1)}</Text>
              <MaterialIcons name="star" size={20} color="#FFD700" />
            </View>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}
          onPress={() => navigation.navigate('Tasks' as never)}
        >
          <MaterialIcons name="assignment" size={30} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.totalTasks}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}
          onPress={() => navigation.navigate('Tasks' as never)}
        >
          <MaterialIcons name="check-circle" size={30} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.completedToday}</Text>
          <Text style={styles.statLabel}>Completed Today</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}
          onPress={() => navigation.navigate('Tasks' as never)}
        >
          <MaterialIcons name="pending" size={30} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}
          onPress={() => navigation.navigate('Tasks' as never)}
        >
          <MaterialIcons name="add-task" size={30} color="#9C27B0" />
          <Text style={styles.statNumber}>{stats.availableTasks}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </TouchableOpacity>
      </View>

      {/* My Works Section - Active Assignments */}
      <View style={styles.myWorksSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>📦 My Works</Text>
            <Text style={styles.sectionSubtitle}>Your accepted pickups</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              {assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length} Active
            </Text>
          </View>
        </View>
        
        {assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="work-off" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No active works!</Text>
            <Text style={styles.emptyStateText}>You haven't accepted any pickup requests yet.</Text>
            <TouchableOpacity 
              style={styles.findWorksButton}
              onPress={() => navigation.navigate('Tasks' as never)}
            >
              <Text style={styles.findWorksButtonText}>Find New Works</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Quick Stats for Active Works */}
            <View style={styles.quickStats}>
              <View style={[styles.quickStatCard, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.quickStatNumber, { color: '#F57C00' }]}>
                  {assignments.filter(a => a.status === 'in_progress').length}
                </Text>
                <Text style={styles.quickStatLabel}>🚛 In Progress</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.quickStatNumber, { color: '#1976D2' }]}>
                  {assignments.filter(a => a.status === 'assigned').length}
                </Text>
                <Text style={styles.quickStatLabel}>📋 Assigned</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: '#E8F5E8' }]}>
                <Text style={[styles.quickStatNumber, { color: '#4CAF50' }]}>
                  ₹{assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length * 50}
                </Text>
                <Text style={styles.quickStatLabel}>💰 Potential</Text>
              </View>
            </View>
            
            {/* Active Assignments List */}
            {assignments
              .filter(a => a.status === 'assigned' || a.status === 'in_progress')
              .slice(0, 3)
              .map((assignment, index) => (
                <TouchableOpacity
                  key={assignment._id || index}
                  style={[
                    styles.assignmentCard,
                    { borderLeftColor: assignment.status === 'in_progress' ? '#FF9800' : '#2196F3' }
                  ]}
                  onPress={() => navigation.navigate('Tasks' as never)}
                >
                  <View style={styles.assignmentHeader}>
                    <Text style={styles.assignmentId}>
                      📍 ID: {maskPickupId(assignment.pickupId)}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: assignment.status === 'in_progress' ? '#FFF3E0' : '#E3F2FD' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: assignment.status === 'in_progress' ? '#FF9800' : '#2196F3' }
                      ]}>
                        {assignment.status === 'in_progress' ? '🚛 IN PROGRESS' : '📋 ASSIGNED'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.assignmentDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="person" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {assignment.customerName}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={16} color="#666" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {assignment.address}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="phone" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {assignment.customerPhone}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="delete" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {assignment.wasteTypes.join(', ')} ({assignment.estimatedWeight})
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {assignment.timeSlot}
                      </Text>
                    </View>
                    {assignment.specialInstructions && (
                      <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>
                          📝 {assignment.specialInstructions}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.assignmentFooter}>
                    <View style={styles.earningsBox}>
                      <Text style={styles.earningsLabel}>Earnings</Text>
                      <Text style={styles.earningsValue}>₹{assignment.earnings || 50}</Text>
                    </View>
                    {assignment.distance && (
                      <View style={styles.distanceBox}>
                        <MaterialIcons name="directions" size={16} color="#666" />
                        <Text style={styles.distanceText}>
                          {assignment.distance.toFixed(1)} km
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            
            {/* View All Link */}
            {assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Tasks' as never)}
              >
                <Text style={styles.viewAllButtonText}>
                  View All {assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length} Active Works →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={() => navigation.navigate('Tasks' as never)}
          >
            <MaterialIcons name="list-alt" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Find Works</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => navigation.navigate('Scanner' as never)}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Scan QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => navigation.navigate('Tasks' as never)}
          >
            <MaterialIcons name="map" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>View Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => Alert.alert('Support', 'Contact support at support@wastemanagement.com')}
          >
            <MaterialIcons name="help" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Tasks */}
      {assignments.length > 0 && (
        <View style={styles.recentTasksContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks' as never)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {assignments.slice(0, 3).map((task, index) => (
            <TouchableOpacity 
              key={task.id || index} 
              style={styles.taskCard}
              onPress={() => navigation.navigate('Tasks' as never)}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskId}>#{maskPickupId(task.pickupId)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusText}>{task.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.taskBody}>
                <View style={styles.taskRow}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.taskAddress}>{task.customerAddress}</Text>
                </View>
                
                <View style={styles.taskRow}>
                  <MaterialIcons name="access-time" size={16} color="#666" />
                  <Text style={styles.taskTime}>
                    {new Date(task.scheduledTime).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.taskRow}>
                  <MaterialIcons name="delete" size={16} color="#666" />
                  <Text style={styles.taskWasteType}>{task.wasteTypes.join(', ')}</Text>
                  <MaterialIcons 
                    name={getPriorityIcon(task.priority) as any} 
                    size={16} 
                    color={getPriorityColor(task.priority)} 
                    style={{ marginLeft: 10 }}
                  />
                  <Text style={[styles.taskPriority, { color: getPriorityColor(task.priority) }]}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 40,
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
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  earningsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earningsItem: {
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    width: (screenWidth - 50) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myWorksSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  activeBadgeText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  findWorksButton: {
    marginTop: 15,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findWorksButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#666',
  },
  assignmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assignmentId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  assignmentDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  instructionsText: {
    fontSize: 11,
    color: '#F57C00',
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  earningsBox: {
    alignItems: 'center',
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  viewAllButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  recentTasksContainer: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskBody: {
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskAddress: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
    flex: 1,
  },
  taskTime: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  taskWasteType: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  taskPriority: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default WorkerHomeScreen;
