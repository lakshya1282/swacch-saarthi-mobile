import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import apiService from '../../services/apiService';

interface WorkerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  // Additional worker-specific fields
  employeeId?: string;
  department?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  serviceAreas?: string[];
  emergencyContact?: string;
  bloodGroup?: string;
  joinedDate?: string;
  availability?: string;
  workingHours?: string;
  // Office enrollment fields
  enrollmentStatus?: string;
  officeId?: string;
  officeCode?: string;
  officeName?: string;
  enrolledAt?: string;
}

interface WorkerStats {
  todayEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  rating: number;
  totalReviews: number;
  tasksCompleted: number;
  tasksToday: number;
  tasksPending: number;
}

const WorkerProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<WorkerStats | null>(null);
  
  // Office enrollment states
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [officeCode, setOfficeCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  
  // Attendance states
  const [attendanceData, setAttendanceData] = useState({
    todayStatus: 'not-checked-in' as 'checked-in' | 'checked-out' | 'not-checked-in',
    todayCheckIn: null as string | null,
    todayCheckOut: null as string | null,
    thisWeekDays: 0,
    thisMonthDays: 0,
    totalDays: 0,
  });
  
  // Profile data states
  const [profileData, setProfileData] = useState<WorkerData>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    employeeId: '',
    department: 'Waste Management',
    vehicleType: '',
    vehicleNumber: '',
    serviceAreas: [],
    emergencyContact: '',
    bloodGroup: '',
    joinedDate: '',
    availability: 'Available',
    workingHours: '8:00 AM - 6:00 PM',
  });

  // Edit form data
  const [editData, setEditData] = useState<WorkerData>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    employeeId: '',
    department: 'Waste Management',
    vehicleType: '',
    vehicleNumber: '',
    serviceAreas: [],
    emergencyContact: '',
    bloodGroup: '',
    joinedDate: '',
    availability: 'Available',
    workingHours: '8:00 AM - 6:00 PM',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('Loading worker profile data...');
      
      // First try to load from API
      try {
        const [profileResponse, statsResponse, attendanceResponse] = await Promise.all([
          apiService.getWorkerProfile(),
          apiService.getWorkerStats(),
          apiService.getTodayAttendance().catch(() => null) // Don't fail if attendance API is not available
        ]);

        console.log('Profile API Response:', profileResponse.data);
        console.log('Stats API Response:', statsResponse.data);

        if (profileResponse.data) {
          // Check if data is nested in a data property
          const apiData = profileResponse.data.data || profileResponse.data;
          console.log('Extracted API data:', apiData);
          
          const workerData: WorkerData = {
            id: apiData._id || apiData.id || '',
            firstName: apiData.firstName || 'Worker',
            lastName: apiData.lastName || 'Name',
            email: apiData.email || 'worker@example.com',
            phone: apiData.phone || apiData.mobile || '+91 9999999999',
            address: apiData.address || 'Not provided',
            city: apiData.city || 'Not provided',
            pincode: apiData.pincode || apiData.zipCode || '000000',
            employeeId: apiData.employeeId || apiData.workerId || apiData.officeCode || `WRK${(apiData._id || '000000').slice(-6)}`,
            department: apiData.department || 'Waste Management',
            vehicleType: apiData.vehicleType || 'Two Wheeler',
            vehicleNumber: apiData.vehicleNumber || '',
            serviceAreas: apiData.serviceAreas || [],
            emergencyContact: apiData.emergencyContact || '',
            bloodGroup: apiData.bloodGroup || '',
            joinedDate: apiData.joinedDate || apiData.createdAt || new Date().toISOString(),
            availability: apiData.isAvailable === true || apiData.availability === 'Available' ? 'Available' : 'Not Available',
            workingHours: apiData.workingHours || '8:00 AM - 6:00 PM',
            // Office enrollment data
            enrollmentStatus: apiData.enrollmentStatus || 'not_enrolled',
            officeId: apiData.officeId || '',
            officeCode: apiData.officeCode || '',
            officeName: apiData.officeName || '',
            enrolledAt: apiData.enrolledAt || '',
          };

          console.log('Processed worker data:', workerData);
          setProfileData(workerData);
          setEditData(workerData);

          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem('workerProfile', JSON.stringify(workerData));
        }

        if (statsResponse.data) {
          console.log('Setting stats:', statsResponse.data);
          setStats(statsResponse.data);
          await AsyncStorage.setItem('workerStats', JSON.stringify(statsResponse.data));
        }

        // Process attendance data
        if (attendanceResponse && attendanceResponse.data) {
          const attendance = attendanceResponse.data;
          setAttendanceData({
            todayStatus: attendance.status || 'not-checked-in',
            todayCheckIn: attendance.checkInTime || null,
            todayCheckOut: attendance.checkOutTime || null,
            thisWeekDays: attendance.thisWeekDays || 0,
            thisMonthDays: attendance.thisMonthDays || 0,
            totalDays: attendance.totalDays || 0,
          });
          await AsyncStorage.setItem('workerAttendance', JSON.stringify(attendance));
        } else {
          // Load from local storage or calculate from stored records
          try {
            const storedRecords = await AsyncStorage.getItem('attendanceRecords');
            if (storedRecords) {
              const records = JSON.parse(storedRecords);
              const today = new Date().toISOString().split('T')[0];
              const todayRecord = records.find((r: any) => r.date === today);
              
              if (todayRecord) {
                setAttendanceData(prev => ({
                  ...prev,
                  todayStatus: todayRecord.status,
                  todayCheckIn: todayRecord.checkInTime,
                  todayCheckOut: todayRecord.checkOutTime,
                }));
              }
              
              // Calculate attendance stats
              const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              const thisMonth = new Date();
              thisMonth.setDate(1);
              
              const thisWeekDays = records.filter((r: any) => 
                new Date(r.date) >= thisWeek && r.status === 'checked-out'
              ).length;
              
              const thisMonthDays = records.filter((r: any) => 
                new Date(r.date) >= thisMonth && r.status === 'checked-out'
              ).length;
              
              setAttendanceData(prev => ({
                ...prev,
                thisWeekDays,
                thisMonthDays,
                totalDays: records.filter((r: any) => r.status === 'checked-out').length,
              }));
            }
          } catch (localError) {
            console.log('No local attendance data available:', localError);
          }
        }
      } catch (apiError) {
        console.log('API call failed, loading from AsyncStorage:', apiError);
        
        // Fallback to AsyncStorage
        const storedProfile = await AsyncStorage.getItem('workerProfile');
        const storedStats = await AsyncStorage.getItem('workerStats');
        
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          setProfileData(parsedProfile);
          setEditData(parsedProfile);
        } else {
          // Load basic data from individual AsyncStorage items
          const userId = await AsyncStorage.getItem('userId');
          const firstName = await AsyncStorage.getItem('firstName');
          const lastName = await AsyncStorage.getItem('lastName');
          const email = await AsyncStorage.getItem('email');
          const phone = await AsyncStorage.getItem('phone');
          const address = await AsyncStorage.getItem('address');
          const city = await AsyncStorage.getItem('city');
          const pincode = await AsyncStorage.getItem('pincode');

          const data: WorkerData = {
            id: userId || '',
            firstName: firstName || 'Worker',
            lastName: lastName || 'Name',
            email: email || 'worker@example.com',
            phone: phone || '+91 9999999999',
            address: address || 'Not provided',
            city: city || 'Not provided',
            pincode: pincode || '000000',
            employeeId: `WRK${(userId || '000000').slice(-6)}`,
            department: 'Waste Management',
            vehicleType: 'Two Wheeler',
            vehicleNumber: '',
            serviceAreas: [],
            emergencyContact: '',
            bloodGroup: '',
            joinedDate: new Date().toISOString(),
            availability: 'Available',
            workingHours: '8:00 AM - 6:00 PM',
          };

          setProfileData(data);
          setEditData(data);
        }

        if (storedStats) {
          setStats(JSON.parse(storedStats));
        } else {
          // Set minimal stats - no mock data
          setStats({
            todayEarnings: 0,
            monthlyEarnings: 0,
            totalEarnings: 0,
            rating: 0,
            totalReviews: 0,
            tasksCompleted: 0,
            tasksToday: 0,
            tasksPending: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
  };

  const handleEnrollToOffice = async () => {
    if (!officeCode.trim()) {
      Alert.alert('Error', 'Please enter an office code');
      return;
    }

    setEnrolling(true);
    try {
      // First validate the office code
      setValidatingCode(true);
      const checkResponse = await apiService.checkOfficeCode(officeCode.toUpperCase());
      setValidatingCode(false);

      if (!checkResponse.data || !checkResponse.data.exists) {
        Alert.alert('Invalid Code', 'The office code you entered does not exist. Please check and try again.');
        setEnrolling(false);
        return;
      }

      // Send enrollment request
      const enrollResponse = await apiService.enrollToOffice(officeCode.toUpperCase());
      
      if (enrollResponse.data && enrollResponse.data.success) {
        Alert.alert(
          'Success',
          'Your enrollment request has been sent to the office. You will be notified once it is approved.',
          [{ text: 'OK', onPress: () => {
            setShowEnrollmentForm(false);
            setOfficeCode('');
            loadProfileData(); // Refresh profile data
          }}]
        );
      } else {
        Alert.alert('Error', enrollResponse.data?.message || 'Failed to send enrollment request');
      }
    } catch (error: any) {
      console.error('Enrollment error:', error);
      if (error.response?.status === 409) {
        Alert.alert('Already Enrolled', 'You are already enrolled or have a pending request with an office.');
      } else if (error.response?.status === 404) {
        Alert.alert('Invalid Code', 'The office code you entered does not exist.');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to enroll. Please try again.');
      }
    } finally {
      setEnrolling(false);
      setValidatingCode(false);
    }
  };

  const handleCancelEnrollment = async () => {
    Alert.alert(
      'Cancel Enrollment',
      'Are you sure you want to cancel your enrollment request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.cancelEnrollment();
              if (response.data && response.data.success) {
                Alert.alert('Success', 'Enrollment request cancelled');
                await loadProfileData();
              }
            } catch (error) {
              console.error('Cancel enrollment error:', error);
              Alert.alert('Error', 'Failed to cancel enrollment');
            }
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(profileData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(profileData);
  };

  const handleSave = async () => {
    // Validate data
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!editData.email.trim() || !editData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!editData.phone.trim() || editData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setSaving(true);

      // Try to save to API first
      try {
        const response = await apiService.updateWorkerProfile(editData);
        
        if (response.data) {
          // Update local state with response data
          setProfileData(editData);
          
          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem('workerProfile', JSON.stringify(editData));
          await AsyncStorage.setItem('firstName', editData.firstName);
          await AsyncStorage.setItem('lastName', editData.lastName);
          await AsyncStorage.setItem('email', editData.email);
          await AsyncStorage.setItem('phone', editData.phone);
          await AsyncStorage.setItem('address', editData.address);
          await AsyncStorage.setItem('city', editData.city);
          await AsyncStorage.setItem('pincode', editData.pincode);
          
          setIsEditing(false);
          Alert.alert('Success', 'Profile updated successfully');
        }
      } catch (apiError) {
        console.log('API update failed, saving locally:', apiError);
        
        // Fallback to local storage only
        await AsyncStorage.setItem('workerProfile', JSON.stringify(editData));
        await AsyncStorage.setItem('firstName', editData.firstName);
        await AsyncStorage.setItem('lastName', editData.lastName);
        await AsyncStorage.setItem('email', editData.email);
        await AsyncStorage.setItem('phone', editData.phone);
        await AsyncStorage.setItem('address', editData.address);
        await AsyncStorage.setItem('city', editData.city);
        await AsyncStorage.setItem('pincode', editData.pincode);

        setProfileData(editData);
        setIsEditing(false);
        
        Alert.alert('Success', 'Profile updated locally (will sync when online)');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
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
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              // Navigate to login screen - this would need to be handled by your main navigation
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF9800']}
            tintColor="#FF9800"
          />
        }
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <MaterialIcons name="edit" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profileData.firstName || 'W').charAt(0)}{(profileData.lastName || 'N').charAt(0)}
            </Text>
          </View>
          <Text style={styles.workerName}>
            {profileData.firstName || 'Worker'} {profileData.lastName || 'Name'}
          </Text>
          {!isEditing && (
            <>
              <View style={styles.workerBadge}>
                <MaterialIcons name="engineering" size={16} color="#fff" />
                <Text style={styles.workerBadgeText}>Waste Collection Worker</Text>
              </View>
              {profileData.employeeId && (
                <Text style={styles.employeeId}>Employee ID: {profileData.employeeId}</Text>
              )}
            </>
          )}
        </View>

        {/* Performance Stats Section - Only show when not editing */}
        {!isEditing && stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            
            {/* Rating and Reviews */}
            <View style={styles.ratingCard}>
              <View style={styles.ratingContent}>
                <Text style={styles.ratingValue}>{stats.rating.toFixed(1)}</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                      key={star}
                      name={star <= Math.round(stats.rating) ? 'star' : 'star-outline'}
                      size={20}
                      color="#FFD700"
                    />
                  ))}
                </View>
                <Text style={styles.reviewsText}>({stats.totalReviews} reviews)</Text>
              </View>
            </View>

            {/* Earnings Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="today" size={24} color="#4CAF50" />
                <Text style={styles.statValue}>₹{stats.todayEarnings}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="date-range" size={24} color="#2196F3" />
                <Text style={styles.statValue}>₹{stats.monthlyEarnings}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#FF9800" />
                <Text style={styles.statValue}>₹{stats.totalEarnings}</Text>
                <Text style={styles.statLabel}>Total Earnings</Text>
              </View>
            </View>

            {/* Tasks Summary */}
            <View style={styles.tasksGrid}>
              <View style={[styles.taskCard, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.taskValue}>{stats.tasksCompleted}</Text>
                <Text style={styles.taskLabel}>Tasks Completed</Text>
              </View>
              <View style={[styles.taskCard, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.taskValue}>{stats.tasksToday}</Text>
                <Text style={styles.taskLabel}>Today's Tasks</Text>
              </View>
              <View style={[styles.taskCard, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.taskValue}>{stats.tasksPending}</Text>
                <Text style={styles.taskLabel}>Pending</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Attendance */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <MaterialIcons 
                name={attendanceData.todayStatus === 'checked-in' ? 'login' : attendanceData.todayStatus === 'checked-out' ? 'logout' : 'schedule'} 
                size={24} 
                color={attendanceData.todayStatus === 'checked-in' ? '#4CAF50' : attendanceData.todayStatus === 'checked-out' ? '#2196F3' : '#999'}
              />
              <Text style={[
                styles.attendanceStatus,
                { color: attendanceData.todayStatus === 'checked-in' ? '#4CAF50' : attendanceData.todayStatus === 'checked-out' ? '#2196F3' : '#999' }
              ]}>
                {attendanceData.todayStatus === 'checked-in' ? 'Checked In' : 
                 attendanceData.todayStatus === 'checked-out' ? 'Completed' : 'Not Checked In'}
              </Text>
            </View>
            
            {attendanceData.todayCheckIn && (
              <View style={styles.attendanceTimes}>
                <View style={styles.attendanceTime}>
                  <Text style={styles.attendanceTimeLabel}>Check-in:</Text>
                  <Text style={styles.attendanceTimeValue}>{attendanceData.todayCheckIn}</Text>
                </View>
                {attendanceData.todayCheckOut && (
                  <View style={styles.attendanceTime}>
                    <Text style={styles.attendanceTimeLabel}>Check-out:</Text>
                    <Text style={styles.attendanceTimeValue}>{attendanceData.todayCheckOut}</Text>
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <Text style={styles.attendanceStatValue}>{attendanceData.thisWeekDays}</Text>
                <Text style={styles.attendanceStatLabel}>This Week</Text>
              </View>
              <View style={styles.attendanceStat}>
                <Text style={styles.attendanceStatValue}>{attendanceData.thisMonthDays}</Text>
                <Text style={styles.attendanceStatLabel}>This Month</Text>
              </View>
              <View style={styles.attendanceStat}>
                <Text style={styles.attendanceStatValue}>{attendanceData.totalDays}</Text>
                <Text style={styles.attendanceStatLabel}>Total Days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.formSection}>
          {/* Personal Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.firstName}
                    onChangeText={(text) =>
                      setEditData({ ...editData, firstName: text })
                    }
                    placeholder="Enter first name"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.firstName || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.lastName}
                    onChangeText={(text) =>
                      setEditData({ ...editData, lastName: text })
                    }
                    placeholder="Enter last name"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.lastName || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.email}
                  onChangeText={(text) =>
                    setEditData({ ...editData, email: text })
                  }
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.value}>{profileData.email || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.phone}
                  onChangeText={(text) =>
                    setEditData({ ...editData, phone: text })
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{profileData.phone || 'Not set'}</Text>
              )}
            </View>
          </View>

          {/* Office Enrollment Section - Only show when not editing */}
          {!isEditing && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Office Enrollment</Text>
              
              {/* Show enrollment status */}
              {profileData.enrollmentStatus === 'enrolled' ? (
                <View style={styles.enrolledCard}>
                  <View style={styles.enrolledHeader}>
                    <MaterialIcons name="business" size={24} color="#4CAF50" />
                    <Text style={styles.enrolledTitle}>Enrolled to Office</Text>
                  </View>
                  <View style={styles.enrolledDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Office Code:</Text>
                      <Text style={styles.detailValue}>{profileData.officeCode || 'N/A'}</Text>
                    </View>
                    {profileData.officeName && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Office Name:</Text>
                        <Text style={styles.detailValue}>{profileData.officeName}</Text>
                      </View>
                    )}
                    {profileData.enrolledAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Enrolled Since:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(profileData.enrolledAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : profileData.enrollmentStatus === 'pending' ? (
                <View style={styles.pendingCard}>
                  <MaterialIcons name="hourglass-empty" size={24} color="#FF9800" />
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>Enrollment Pending</Text>
                    <Text style={styles.pendingText}>
                      Your enrollment request has been sent to office {profileData.officeCode}.
                      Waiting for approval.
                    </Text>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelEnrollment}
                    >
                      <Text style={styles.cancelButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  {!showEnrollmentForm ? (
                    <View style={styles.notEnrolledCard}>
                      <MaterialIcons name="info" size={24} color="#2196F3" />
                      <View style={styles.notEnrolledContent}>
                        <Text style={styles.notEnrolledTitle}>Not Enrolled</Text>
                        <Text style={styles.notEnrolledText}>
                          You are not currently enrolled to any office. Enroll using your office code to start receiving tasks.
                        </Text>
                        <TouchableOpacity
                          style={styles.enrollButton}
                          onPress={() => setShowEnrollmentForm(true)}
                        >
                          <MaterialIcons name="add-business" size={20} color="#fff" />
                          <Text style={styles.enrollButtonText}>Enroll to Office</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.enrollmentForm}>
                      <Text style={styles.formTitle}>Enter Office Code</Text>
                      <Text style={styles.formSubtitle}>
                        Enter the unique code provided by your office to send an enrollment request.
                      </Text>
                      <TextInput
                        style={styles.codeInput}
                        placeholder="Enter office code (e.g., OFF123456)"
                        value={officeCode}
                        onChangeText={setOfficeCode}
                        autoCapitalize="characters"
                        maxLength={10}
                        editable={!enrolling}
                      />
                      <View style={styles.formButtons}>
                        <TouchableOpacity
                          style={[styles.formButton, styles.cancelFormButton]}
                          onPress={() => {
                            setShowEnrollmentForm(false);
                            setOfficeCode('');
                          }}
                          disabled={enrolling}
                        >
                          <Text style={styles.cancelFormButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.formButton, styles.submitButton, enrolling && styles.buttonDisabled]}
                          onPress={handleEnrollToOffice}
                          disabled={enrolling || !officeCode.trim()}
                        >
                          {enrolling ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <MaterialIcons name="send" size={18} color="#fff" />
                              <Text style={styles.submitButtonText}>Send Request</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Work Information - Only show when not editing */}
          {!isEditing && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Work Information</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Department</Text>
                  <Text style={styles.value}>{profileData.department}</Text>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Availability</Text>
                  <View style={styles.availabilityBadge}>
                    <View style={[styles.availabilityDot, { backgroundColor: profileData.availability === 'Available' ? '#4CAF50' : '#F44336' }]} />
                    <Text style={styles.value}>{profileData.availability}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Vehicle Type</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editData.vehicleType}
                      onChangeText={(text) =>
                        setEditData({ ...editData, vehicleType: text })
                      }
                      placeholder="Enter vehicle type"
                    />
                  ) : (
                    <Text style={styles.value}>{profileData.vehicleType || 'Not specified'}</Text>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Vehicle Number</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editData.vehicleNumber}
                      onChangeText={(text) =>
                        setEditData({ ...editData, vehicleNumber: text })
                      }
                      placeholder="Enter vehicle number"
                    />
                  ) : (
                    <Text style={styles.value}>{profileData.vehicleNumber || 'Not specified'}</Text>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Working Hours</Text>
                <Text style={styles.value}>{profileData.workingHours}</Text>
              </View>

              {profileData.serviceAreas && profileData.serviceAreas.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Service Areas</Text>
                  <View style={styles.serviceAreasContainer}>
                    {profileData.serviceAreas.map((area, index) => (
                      <View key={index} style={styles.serviceAreaChip}>
                        <Text style={styles.serviceAreaText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profileData.joinedDate && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Joined Date</Text>
                  <Text style={styles.value}>
                    {new Date(profileData.joinedDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Address Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Address Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editData.address}
                  onChangeText={(text) =>
                    setEditData({ ...editData, address: text })
                  }
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.value}>{profileData.address || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>City</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.city}
                    onChangeText={(text) =>
                      setEditData({ ...editData, city: text })
                    }
                    placeholder="Enter city"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.city || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Pincode</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.pincode}
                    onChangeText={(text) =>
                      setEditData({ ...editData, pincode: text })
                    }
                    placeholder="Enter pincode"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                ) : (
                  <Text style={styles.value}>{profileData.pincode || 'Not set'}</Text>
                )}
              </View>
            </View>

            {/* Additional Information */}
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Emergency Contact</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.emergencyContact}
                    onChangeText={(text) =>
                      setEditData({ ...editData, emergencyContact: text })
                    }
                    placeholder="Emergency contact"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.emergencyContact || 'Not provided'}</Text>
                )}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Group</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={editData.bloodGroup}
                    onChangeText={(text) =>
                      setEditData({ ...editData, bloodGroup: text })
                    }
                    placeholder="Blood group"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.bloodGroup || 'Not provided'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.otherActions}>
              <TouchableOpacity style={styles.actionItem}>
                <MaterialIcons name="notifications" size={20} color="#666" />
                <Text style={styles.actionText}>Notification Settings</Text>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <MaterialIcons name="lock" size={20} color="#666" />
                <Text style={styles.actionText}>Change Password</Text>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <MaterialIcons name="help" size={20} color="#666" />
                <Text style={styles.actionText}>Help & Support</Text>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <MaterialIcons name="exit-to-app" size={20} color="#f44336" />
                <Text style={[styles.actionText, styles.logoutText]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FF9800',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  workerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  workerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  workerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  formSection: {
    flex: 1,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF9800',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otherActions: {
    backgroundColor: '#fff',
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#f44336',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  ratingCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingContent: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  tasksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  taskValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  taskLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  serviceAreasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  serviceAreaChip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceAreaText: {
    fontSize: 12,
    color: '#2196F3',
  },
  // Office enrollment styles
  enrolledCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  enrolledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  enrolledTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  enrolledDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pendingCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pendingContent: {
    flex: 1,
    marginLeft: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  notEnrolledCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notEnrolledContent: {
    flex: 1,
    marginLeft: 12,
  },
  notEnrolledTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  notEnrolledText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  enrollButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  enrollmentForm: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelFormButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelFormButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Attendance styles
  attendanceCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  attendanceTimes: {
    marginBottom: 12,
  },
  attendanceTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attendanceTimeLabel: {
    fontSize: 14,
    color: '#666',
  },
  attendanceTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
  },
  attendanceStat: {
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default WorkerProfileScreen;
