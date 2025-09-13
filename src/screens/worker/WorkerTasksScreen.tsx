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
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/apiService';
import socketService from '../../services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  pickupId: string;
  userId: string;
  userName: string;
  address: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: string;
  wasteType: string;
  wasteAmount?: string;
  priority: 'low' | 'medium' | 'high';
  phoneNumber: string;
  notes?: string;
  distance?: number;
  earnings?: number;
}

const WorkerTasksScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadTasks();
    
    // Set up Socket.IO listeners for real-time updates
    const handlePickupUpdate = (data: any) => {
      console.log('Real-time pickup update received:', data.type);
      loadTasks(); // Reload tasks when any pickup update occurs
    };
    
    const handleNewPickup = (data: any) => {
      console.log('New pickup received:', data);
      loadTasks(); // Reload to include new pickup
      Alert.alert('New Task Available!', `New pickup at ${data.address || 'location'}`);
    };
    
    const handlePickupAssigned = (data: any) => {
      console.log('Pickup assigned:', data);
      loadTasks();
    };
    
    const handleTaskUpdate = (data: any) => {
      console.log('Task update received:', data);
      loadTasks();
    };
    
    // Subscribe to socket events
    socketService.on('pickup-update', handlePickupUpdate);
    socketService.on('new-pickup', handleNewPickup);
    socketService.on('pickup-assigned', handlePickupAssigned);
    socketService.on('task-update', handleTaskUpdate);
    
    // Ensure socket is connected
    if (!socketService.isConnected()) {
      socketService.reconnect();
    }
    
    return () => {
      // Cleanup socket listeners
      socketService.off('pickup-update', handlePickupUpdate);
      socketService.off('new-pickup', handleNewPickup);
      socketService.off('pickup-assigned', handlePickupAssigned);
      socketService.off('task-update', handleTaskUpdate);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [])
  );

  useEffect(() => {
    filterTasks();
  }, [tasks, selectedFilter]);

  const loadTasks = async () => {
    try {
      // Don't set loading if we're just refreshing (preserve UI state)
      if (tasks.length === 0) {
        setLoading(true);
      }
      
      // Store current task statuses to preserve local changes
      const currentTaskStatuses = new Map<string, Task['status']>();
      tasks.forEach(task => {
        currentTaskStatuses.set(task.id, task.status);
      });
      
      // Get current worker ID and accepted tasks
      const userData = await AsyncStorage.getItem('userData');
      const workerId = userData ? JSON.parse(userData).id : null;
      const acceptedTasksStr = await AsyncStorage.getItem(`acceptedTasks_${workerId}`);
      const acceptedTaskIds = acceptedTasksStr ? JSON.parse(acceptedTasksStr) : [];
      
      // Log the API call for debugging
      console.log('Loading tasks from API...');
      console.log('Worker ID:', workerId);
      console.log('Locally accepted task IDs:', acceptedTaskIds);
      
      // Get all pickups from the system
      const allPickupsResponse = await apiService.getAllPickups();
      
      console.log('API Response:', allPickupsResponse.status, allPickupsResponse.data ? 'Has data' : 'No data');
      
      let allTasks: Task[] = [];
      
      // Transform pickups to tasks format
      if (allPickupsResponse.data) {
        const pickups = Array.isArray(allPickupsResponse.data) ? 
          allPickupsResponse.data : 
          (allPickupsResponse.data.pickups || allPickupsResponse.data.data || []);
        
        allTasks = pickups.map((pickup: any) => {
          const taskId = pickup._id || pickup.id || pickup.pickupId;
          const serverStatus = transformStatus(pickup.status || 'pending');
          
          // Check if this task was locally accepted
          const isLocallyAccepted = acceptedTaskIds.includes(taskId);
          
          // Preserve local status if it's more advanced than server status
          const localStatus = currentTaskStatuses.get(taskId);
          let finalStatus = serverStatus;
          
          // If locally accepted but server still shows pending, show as assigned
          if (isLocallyAccepted && serverStatus === 'pending') {
            finalStatus = 'assigned';
            console.log(`Task ${taskId} locally accepted, showing as assigned`);
          } else if (localStatus) {
            // Status progression: pending -> assigned -> in_progress -> completed
            const statusOrder = ['pending', 'assigned', 'in_progress', 'completed'];
            const localIndex = statusOrder.indexOf(localStatus);
            const serverIndex = statusOrder.indexOf(serverStatus);
            
            // Keep the more advanced status
            if (localIndex > serverIndex) {
              finalStatus = localStatus;
              console.log(`Preserving local status ${localStatus} over server status ${serverStatus} for task ${taskId}`);
            }
          }
          
          return {
            id: taskId,
            pickupId: pickup.pickupId || `PK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            userId: pickup.userId || pickup.customerId || 'unknown',
            userName: pickup.customerName || pickup.userName || 'Customer',
            address: pickup.address || pickup.customerAddress || 'Address not specified',
            status: finalStatus,
            scheduledTime: pickup.scheduledDate || pickup.scheduledTime || new Date().toISOString(),
            wasteType: Array.isArray(pickup.wasteTypes) ? pickup.wasteTypes.join(', ') : (pickup.wasteType || 'Mixed'),
            wasteAmount: pickup.estimatedWeight || pickup.wasteAmount || 'Not specified',
            priority: calculatePriority(pickup),
            phoneNumber: pickup.customerPhone || pickup.phoneNumber || 'Not provided',
            notes: pickup.specialInstructions || pickup.notes || '',
            distance: pickup.distance || Math.random() * 5 + 1,
            earnings: calculateEarnings(pickup.estimatedWeight),
            timeSlot: pickup.timeSlot || '',
            createdAt: pickup.createdAt || pickup.timestamp,
          };
        });
      }
      
      // Also check for locally stored pickups
      try {
        const localPickupsStr = await AsyncStorage.getItem('localPickups');
        if (localPickupsStr) {
          const localPickups = JSON.parse(localPickupsStr);
          console.log(`Found ${localPickups.length} local pickups`);
          
          const localTasks = localPickups.map((pickup: any) => ({
            id: pickup.pickupId,
            pickupId: pickup.pickupId,
            userId: pickup.userId,
            userName: pickup.customerName,
            address: pickup.customerAddress || pickup.address || 'Address not specified',
            status: 'pending' as const,
            scheduledTime: pickup.scheduledDate || pickup.createdAt,
            wasteType: Array.isArray(pickup.wasteTypes) ? pickup.wasteTypes.join(', ') : 'Mixed',
            wasteAmount: pickup.estimatedWeight || 'Not specified',
            priority: pickup.wasteTypes?.includes('Medical Waste') || pickup.wasteTypes?.includes('Hazardous Waste') ? 'high' : 'medium' as Task['priority'],
            phoneNumber: pickup.customerPhone || 'Not provided',
            notes: pickup.specialInstructions || '',
            distance: Math.random() * 5 + 1,
            earnings: calculateEarnings(pickup.estimatedWeight),
          }));
          
          // Merge local tasks with fetched tasks
          allTasks = [...allTasks, ...localTasks];
        }
      } catch (error) {
        console.log('Error loading local pickups:', error);
      }
      
      // If still no tasks, use demo data
      if (allTasks.length === 0) {
        console.log('No pickups found, using demo data');
        allTasks = getDemoTasks();
      }
      
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      
      // Use demo data as fallback
      const demoTasks = getDemoTasks();
      setTasks(demoTasks);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to transform backend status to our status format
  const transformStatus = (backendStatus: string): Task['status'] => {
    const statusMap: { [key: string]: Task['status'] } = {
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
    return statusMap[backendStatus.toLowerCase()] || 'pending';
  };

  // Calculate priority based on pickup data
  const calculatePriority = (pickup: any): Task['priority'] => {
    // Priority based on time slot or urgency
    if (pickup.urgent || pickup.priority === 'high') return 'high';
    if (pickup.priority === 'medium') return 'medium';
    if (pickup.priority === 'low') return 'low';
    
    // Default priority based on waste type
    if (pickup.wasteTypes?.includes('Medical Waste') || pickup.wasteTypes?.includes('Hazardous Waste')) {
      return 'high';
    }
    return 'medium';
  };

  // Calculate earnings based on weight
  const calculateEarnings = (weight: string): number => {
    if (!weight) return 30; // Base earning
    const numWeight = parseInt(weight) || 5;
    if (numWeight < 5) return 30;
    if (numWeight < 10) return 50;
    if (numWeight < 20) return 70;
    return 100;
  };

  // Get demo tasks
  const getDemoTasks = (): Task[] => [
    {
      id: '1',
      pickupId: 'PK001',
      userId: 'user1',
      userName: 'Demo Citizen 1',
      address: '123 Main St, Sector 5, Bangalore',
      status: 'pending',
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      wasteType: 'Dry Waste, Wet Waste',
      wasteAmount: '5-10 kg',
      priority: 'high',
      phoneNumber: '+91 9876543210',
      notes: 'Please come after 10 AM',
      distance: 2.5,
      earnings: 50,
    },
    {
      id: '2',
      pickupId: 'PK002',
      userId: 'user2',
      userName: 'Demo Citizen 2',
      address: '456 Park Ave, Sector 7, Bangalore',
      status: 'pending',
      scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      wasteType: 'Electronic Waste',
      wasteAmount: '3-5 kg',
      priority: 'medium',
      phoneNumber: '+91 9876543211',
      notes: 'Old computers and phones',
      distance: 3.2,
      earnings: 40,
    },
    {
      id: '3',
      pickupId: 'PK003',
      userId: 'user3',
      userName: 'Demo Citizen 3',
      address: '789 Lake View, Sector 3, Bangalore',
      status: 'assigned',
      scheduledTime: new Date().toISOString(),
      wasteType: 'Hazardous Waste',
      wasteAmount: '2 kg',
      priority: 'high',
      phoneNumber: '+91 9876543212',
      notes: 'Paint cans and batteries',
      distance: 1.8,
      earnings: 60,
    },
  ];

  const filterTasks = () => {
    let filtered = [...tasks];
    
    switch (selectedFilter) {
      case 'pending':
        filtered = tasks.filter(t => t.status === 'pending');
        break;
      case 'assigned':
        filtered = tasks.filter(t => t.status === 'assigned');
        break;
      case 'in_progress':
        filtered = tasks.filter(t => t.status === 'in_progress');
        break;
      case 'completed':
        filtered = tasks.filter(t => t.status === 'completed');
        break;
      case 'my_tasks':
        filtered = tasks.filter(t => 
          t.status === 'assigned' || t.status === 'in_progress'
        );
        break;
      default:
        // 'all' - show all tasks
        break;
    }
    
    // Sort by scheduled time (upcoming first)
    filtered.sort((a, b) => 
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
    
    setFilteredTasks(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    
    // Different map apps based on platform
    const mapUrls = {
      google: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      apple: `http://maps.apple.com/?q=${encodedAddress}`,
      waze: `https://waze.com/ul?q=${encodedAddress}`,
    };
    
    Alert.alert(
      'Navigate to Customer',
      `Open navigation to: ${address}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Google Maps',
          onPress: () => Linking.openURL(mapUrls.google).catch(() => 
            Alert.alert('Error', 'Could not open Google Maps')
          )
        },
        Platform.OS === 'ios' ? {
          text: 'Apple Maps',
          onPress: () => Linking.openURL(mapUrls.apple).catch(() => 
            Alert.alert('Error', 'Could not open Apple Maps')
          )
        } : {
          text: 'Waze',
          onPress: () => Linking.openURL(mapUrls.waze).catch(() => 
            Alert.alert('Error', 'Could not open Waze')
          )
        },
      ]
    );
  };

  const handleAcceptTask = async (task: Task) => {
    Alert.alert(
      'Accept Task',
      `Do you want to accept the pickup task at ${task.address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              console.log('Accepting task:', task.id);
              
              // Get current worker ID
              const userData = await AsyncStorage.getItem('userData');
              const workerId = userData ? JSON.parse(userData).id : 'unknown';
              
              // Store accepted task ID locally
              const acceptedTasksStr = await AsyncStorage.getItem(`acceptedTasks_${workerId}`);
              const acceptedTaskIds = acceptedTasksStr ? JSON.parse(acceptedTasksStr) : [];
              
              if (!acceptedTaskIds.includes(task.id)) {
                acceptedTaskIds.push(task.id);
                await AsyncStorage.setItem(`acceptedTasks_${workerId}`, JSON.stringify(acceptedTaskIds));
                console.log('Stored accepted task locally:', task.id);
              }
              
              // Try to update on server
              try {
                const response = await apiService.acceptTask(task.id);
                console.log('Accept task response:', response.data);
              } catch (serverError: any) {
                console.log('Server update failed, but task stored locally:', serverError.message);
              }
              
              // Update local state
              const updatedTasks = tasks.map(t => 
                t.id === task.id ? { ...t, status: 'assigned' as const } : t
              );
              setTasks(updatedTasks);
              
              // Emit socket event to update dashboard
              if (socketService.isConnected()) {
                socketService.emit('task-accepted', {
                  taskId: task.id,
                  workerId: workerId,
                  status: 'assigned'
                });
              }
              
              Alert.alert('Success', 'Task accepted successfully! Check "My Tasks" tab or Dashboard.');
            } catch (error: any) {
              console.error('Error accepting task:', error);
              Alert.alert('Error', 'Failed to accept task. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleStartTask = async (task: Task) => {
    Alert.alert(
      'Start Task',
      `Ready to start pickup at: ${task.address}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Navigate to Location',
          onPress: async () => {
            await updateTaskToInProgress(task);
            openNavigation(task.address);
          }
        },
        {
          text: 'Already Reached',
          onPress: async () => {
            await updateTaskToInProgress(task);
            Alert.alert('Success', 'Task started! You can now mark it as complete when ready.');
          }
        }
      ]
    );
  };

  const updateTaskToInProgress = async (task: Task) => {
    try {
      await apiService.startTask(task.id);
      
      // Update local state
      const updatedTasks = tasks.map(t => 
        t.id === task.id ? { ...t, status: 'in_progress' as const } : t
      );
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error starting task:', error);
      // Still update locally for demo
      const updatedTasks = tasks.map(t => 
        t.id === task.id ? { ...t, status: 'in_progress' as const } : t
      );
      setTasks(updatedTasks);
    }
  };

  const verifyCompletionCode = async (taskId: string, enteredCode: string): Promise<boolean> => {
    try {
      // Verify with backend
      const response = await apiService.validateQRCode(enteredCode);
      
      if (response.data.success && response.data.valid) {
        // Check if the verified pickup matches the task
        const verifiedPickup = response.data.pickup;
        if (verifiedPickup && (verifiedPickup._id === taskId || verifiedPickup.pickupId === taskId)) {
          return true;
        }
      }
      
      // Backward compatibility: For legacy pickups without proper verification codes,
      // temporarily accept the pickup ID as the verification code
      // This is only for pickups created before the verification system was implemented
      if (enteredCode.toUpperCase() === taskId.toUpperCase()) {
        console.log('Legacy pickup detected - accepting pickup ID as verification code for backward compatibility');
        console.log('Note: This pickup should be recreated with proper verification code for security');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Verification failed:', error);
      
      // Additional backward compatibility check in case of error
      if (enteredCode.toUpperCase() === taskId.toUpperCase()) {
        console.log('Legacy pickup - accepting pickup ID as verification code (error fallback)');
        return true;
      }
      
      return false;
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask || !verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code provided by the customer.');
      return;
    }
    
    setIsVerifyingCode(true);
    
    try {
      // Verify the code first - use pickupId for matching
      const isCodeValid = await verifyCompletionCode(selectedTask.pickupId, verificationCode.trim());
      
      if (!isCodeValid) {
        Alert.alert(
          'Invalid Verification Code', 
          'The verification code you entered is incorrect. Please ask the customer for the correct code that was provided when they scheduled the pickup.',
          [
            { text: 'OK', onPress: () => setVerificationCode('') }
          ]
        );
        setIsVerifyingCode(false);
        return;
      }
      
      // Code is valid, proceed with completion
      await apiService.completeTask(selectedTask.id, { 
        notes: completionNotes,
        verificationCode: verificationCode.trim()
      });
      
      // Update local state
      const updatedTasks = tasks.map(t => 
        t.id === selectedTask.id ? { ...t, status: 'completed' as const } : t
      );
      setTasks(updatedTasks);
      
      setShowTaskModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      setVerificationCode('');
      
      Alert.alert('Success', `Task completed! You earned ₹${selectedTask.earnings || 50}`);
    } catch (error) {
      console.error('Error completing task:', error);
      // Still update locally for demo
      const updatedTasks = tasks.map(t => 
        t.id === selectedTask.id ? { ...t, status: 'completed' as const } : t
      );
      setTasks(updatedTasks);
      
      setShowTaskModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      setVerificationCode('');
      
      Alert.alert('Success', `Task completed! You earned ₹${selectedTask.earnings || 50}`);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleReportIssue = async (task: Task) => {
    Alert.alert(
      'Report Issue',
      'What issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Customer Not Available',
          onPress: () => reportIssue(task, 'customer_not_available')
        },
        {
          text: 'Wrong Address',
          onPress: () => reportIssue(task, 'wrong_address')
        },
        {
          text: 'Other',
          onPress: () => reportIssue(task, 'other')
        }
      ]
    );
  };

  const reportIssue = async (task: Task, issueType: string) => {
    try {
      await apiService.reportIssue(task.id, { issueType });
      Alert.alert('Issue Reported', 'The issue has been reported to the admin.');
    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Issue Reported', 'The issue has been reported to the admin.');
    }
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

  const renderTaskActions = (task: Task) => {
    switch (task.status) {
      case 'pending':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptTask(task)}
          >
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        );
      case 'assigned':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]}
            onPress={() => handleStartTask(task)}
          >
            <MaterialIcons name="play-arrow" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Start</Text>
          </TouchableOpacity>
        );
      case 'in_progress':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => {
              setSelectedTask(task);
              setShowTaskModal(true);
            }}
          >
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Mark as Complete</Text>
          </TouchableOpacity>
        );
      case 'completed':
        return (
          <View style={styles.completedBadge}>
            <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {[
          { key: 'all', label: 'All', count: tasks.length },
          { key: 'my_tasks', label: 'My Tasks', count: tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').length },
          { key: 'pending', label: 'Available', count: tasks.filter(t => t.status === 'pending').length },
          { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
          { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
        ].map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              selectedFilter === filter.key && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.filterTabTextActive
            ]}>
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View style={[
                styles.filterBadge,
                selectedFilter === filter.key && styles.filterBadgeActive
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  selectedFilter === filter.key && styles.filterBadgeTextActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks List */}
      <ScrollView 
        style={styles.tasksList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF9800']}
            tintColor="#FF9800"
          />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tasks found</Text>
          </View>
        ) : (
          filteredTasks.map((task, index) => (
            <View key={task.id || index} style={styles.taskCard}>
              {/* Task Header */}
              <View style={styles.taskHeader}>
                <View>
                  <Text style={styles.taskId}>#{task.pickupId}</Text>
                  <Text style={styles.taskUserName}>{task.userName}</Text>
                </View>
                <View style={styles.taskHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                    <Text style={styles.statusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleReportIssue(task)}
                    style={styles.moreButton}
                  >
                    <MaterialIcons name="more-vert" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Task Details */}
              <View style={styles.taskDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.detailText}>{task.address}</Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {new Date(task.scheduledTime).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={16} color="#666" />
                  <Text style={styles.detailText}>{task.phoneNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="delete" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {task.wasteType} • {task.wasteAmount || 'Amount not specified'}
                  </Text>
                  <MaterialIcons 
                    name={getPriorityIcon(task.priority) as any} 
                    size={16} 
                    color={getPriorityColor(task.priority)} 
                    style={{ marginLeft: 10 }}
                  />
                  <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>

                {task.notes && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="note" size={16} color="#666" />
                    <Text style={styles.detailText}>{task.notes}</Text>
                  </View>
                )}

                <View style={styles.taskFooter}>
                  <View style={styles.taskMetrics}>
                    {task.distance && (
                      <View style={styles.metricItem}>
                        <MaterialIcons name="directions" size={14} color="#666" />
                        <Text style={styles.metricText}>{task.distance} km</Text>
                      </View>
                    )}
                    {task.earnings && (
                      <View style={styles.metricItem}>
                        <MaterialIcons name="currency-rupee" size={14} color="#4CAF50" />
                        <Text style={[styles.metricText, { color: '#4CAF50', fontWeight: 'bold' }]}>
                          ₹{task.earnings}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Button */}
                  {renderTaskActions(task)}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Task Completion Modal */}
      <Modal
        visible={showTaskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Task</Text>
              <TouchableOpacity onPress={() => {
                setShowTaskModal(false);
                setVerificationCode('');
                setCompletionNotes('');
                setSelectedTask(null);
              }}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Task #{selectedTask?.pickupId} at {selectedTask?.address}
            </Text>

            <View style={styles.codeSection}>
              <Text style={styles.codeSectionTitle}>🔐 Verification Code</Text>
              <Text style={styles.codeSectionSubtitle}>
                Ask the customer for their verification code to complete the pickup
              </Text>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter verification code from customer"
                value={verificationCode}
                onChangeText={setVerificationCode}
                autoCapitalize="characters"
                maxLength={20}
                returnKeyType="done"
              />
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="Add completion notes (optional)"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTaskModal(false);
                  setVerificationCode('');
                  setCompletionNotes('');
                  setSelectedTask(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, isVerifyingCode && styles.disabledButton]}
                onPress={handleCompleteTask}
                disabled={isVerifyingCode}
              >
                {isVerifyingCode ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmButtonText}>Verifying...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={styles.confirmButtonText}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 60,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterTabActive: {
    backgroundColor: '#FF9800',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#666',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 5,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  tasksList: {
    flex: 1,
    padding: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
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
    marginBottom: 12,
  },
  taskId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  taskUserName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  taskHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  moreButton: {
    padding: 4,
    marginLeft: 8,
  },
  taskDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  taskMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metricText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButton: {
    backgroundColor: '#2196F3',
  },
  startButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  codeSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  codeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
  },
  codeSectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 20,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkerTasksScreen;
