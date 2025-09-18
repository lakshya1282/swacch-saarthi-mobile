import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import QRScanner from '../../components/QRScanner';
import apiService from '../../services/apiService';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'checked-in' | 'checked-out' | 'absent';
  officeCode: string;
  officeName: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface AttendanceQRData {
  type: 'attendance';
  officeCode: string;
  attendanceCode: string;
  officeName: string;
  timestamp: number;
}

const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);

  useEffect(() => {
    loadWorkerProfile();
    loadAttendanceHistory();
  }, []);

  const loadWorkerProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('workerProfile');
      if (profile) {
        setWorkerProfile(JSON.parse(profile));
      }
    } catch (error) {
      console.error('Error loading worker profile:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      
      // Load from AsyncStorage first
      const storedRecords = await AsyncStorage.getItem('attendanceRecords');
      let records: AttendanceRecord[] = [];
      
      if (storedRecords) {
        records = JSON.parse(storedRecords);
      }

      // Try to sync with API
      try {
        const response = await apiService.getAttendanceHistory();
        if (response.data && response.data.success) {
          records = response.data.records || records;
          await AsyncStorage.setItem('attendanceRecords', JSON.stringify(records));
        }
      } catch (apiError) {
        console.log('API sync failed, using local records:', apiError);
      }

      // Sort by date (newest first)
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAttendanceRecords(records);

      // Find today's record
      const today = new Date().toISOString().split('T')[0];
      const todaysRecord = records.find(record => record.date === today);
      setTodayRecord(todaysRecord || null);

    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceHistory();
  };

  const handleQRScan = async (data: string) => {
    if (processing) return;

    setProcessing(true);
    setShowQRScanner(false);

    try {
      // Parse QR data
      let qrData: AttendanceQRData;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type !== 'attendance') {
          throw new Error('Not an attendance QR code');
        }
        qrData = parsed;
      } catch (parseError) {
        Alert.alert(
          'Invalid QR Code',
          'This is not a valid attendance QR code. Please scan the QR code from your office dashboard.',
          [{ text: 'OK' }]
        );
        setProcessing(false);
        return;
      }

      // Verify worker is enrolled with this office
      if (workerProfile?.officeCode && workerProfile.officeCode !== qrData.officeCode) {
        Alert.alert(
          'Wrong Office',
          `You are enrolled with a different office. This QR code is for ${qrData.officeName}.`,
          [{ text: 'OK' }]
        );
        setProcessing(false);
        return;
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString();
      
      if (todayRecord) {
        if (todayRecord.status === 'checked-in' && !todayRecord.checkOutTime) {
          // Check out
          await handleCheckOut(qrData, todayRecord, currentTime);
        } else {
          Alert.alert(
            'Already Completed',
            'You have already completed your attendance for today.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Check in
        await handleCheckIn(qrData, today, currentTime);
      }

    } catch (error) {
      console.error('Error processing attendance QR:', error);
      Alert.alert('Error', 'Failed to process attendance. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckIn = async (qrData: AttendanceQRData, date: string, time: string) => {
    try {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        date,
        checkInTime: time,
        status: 'checked-in',
        officeCode: qrData.officeCode,
        officeName: qrData.officeName,
      };

      // Try to sync with API
      try {
        await apiService.markAttendance({
          action: 'check-in',
          officeCode: qrData.officeCode,
          timestamp: Date.now(),
          attendanceCode: qrData.attendanceCode,
        });
      } catch (apiError) {
        console.log('API sync failed for check-in:', apiError);
        // Continue with local storage even if API fails
      }

      // Update local state
      const updatedRecords = [newRecord, ...attendanceRecords];
      setAttendanceRecords(updatedRecords);
      setTodayRecord(newRecord);

      // Save to AsyncStorage
      await AsyncStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));

      Alert.alert(
        'Checked In Successfully! ✅',
        `Welcome to ${qrData.officeName}!\nTime: ${time}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error during check-in:', error);
      Alert.alert('Error', 'Failed to record check-in. Please try again.');
    }
  };

  const handleCheckOut = async (qrData: AttendanceQRData, record: AttendanceRecord, time: string) => {
    try {
      const updatedRecord: AttendanceRecord = {
        ...record,
        checkOutTime: time,
        status: 'checked-out',
      };

      // Try to sync with API
      try {
        await apiService.markAttendance({
          action: 'check-out',
          officeCode: qrData.officeCode,
          timestamp: Date.now(),
          attendanceCode: qrData.attendanceCode,
        });
      } catch (apiError) {
        console.log('API sync failed for check-out:', apiError);
        // Continue with local storage even if API fails
      }

      // Update local state
      const updatedRecords = attendanceRecords.map(r => 
        r.id === record.id ? updatedRecord : r
      );
      setAttendanceRecords(updatedRecords);
      setTodayRecord(updatedRecord);

      // Save to AsyncStorage
      await AsyncStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));

      // Calculate work duration
      const checkInTime = new Date(`1970-01-01T${record.checkInTime}`);
      const checkOutTime = new Date(`1970-01-01T${time}`);
      const duration = Math.abs(checkOutTime.getTime() - checkInTime.getTime()) / 3600000; // in hours

      Alert.alert(
        'Checked Out Successfully! 🏁',
        `Thank you for your service today!\nWork Duration: ${duration.toFixed(1)} hours\nCheck-out Time: ${time}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error during check-out:', error);
      Alert.alert('Error', 'Failed to record check-out. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked-in': return 'login';
      case 'checked-out': return 'logout';
      case 'absent': return 'event-busy';
      default: return 'schedule';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in': return '#4CAF50';
      case 'checked-out': return '#2196F3';
      case 'absent': return '#F44336';
      default: return '#757575';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="access-time" size={60} color="#fff" />
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Scan office QR to mark attendance</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Status */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Status</Text>
          
          {todayRecord ? (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <MaterialIcons 
                  name={getStatusIcon(todayRecord.status)} 
                  size={24} 
                  color={getStatusColor(todayRecord.status)} 
                />
                <Text style={[styles.todayStatus, { color: getStatusColor(todayRecord.status) }]}>
                  {todayRecord.status === 'checked-in' ? 'Checked In' : 'Completed'}
                </Text>
              </View>
              
              <View style={styles.todayDetails}>
                <View style={styles.timeRow}>
                  <MaterialIcons name="login" size={18} color="#4CAF50" />
                  <Text style={styles.timeLabel}>Check-in:</Text>
                  <Text style={styles.timeValue}>{todayRecord.checkInTime}</Text>
                </View>
                
                {todayRecord.checkOutTime && (
                  <View style={styles.timeRow}>
                    <MaterialIcons name="logout" size={18} color="#2196F3" />
                    <Text style={styles.timeLabel}>Check-out:</Text>
                    <Text style={styles.timeValue}>{todayRecord.checkOutTime}</Text>
                  </View>
                )}
                
                <View style={styles.timeRow}>
                  <MaterialIcons name="business" size={18} color="#666" />
                  <Text style={styles.timeLabel}>Office:</Text>
                  <Text style={styles.timeValue}>{todayRecord.officeName}</Text>
                </View>
              </View>
              
              {todayRecord.status === 'checked-in' && (
                <Text style={styles.checkOutHint}>
                  Scan the office QR code again to check out
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.notCheckedInCard}>
              <MaterialIcons name="schedule" size={48} color="#ccc" />
              <Text style={styles.notCheckedInTitle}>Not Checked In</Text>
              <Text style={styles.notCheckedInText}>
                Scan your office QR code to mark attendance for today
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.primaryButton, processing && styles.disabledButton]}
            onPress={() => setShowQRScanner(true)}
            disabled={processing}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {todayRecord?.status === 'checked-in' ? 'Scan QR to Check Out' : 'Scan QR to Check In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attendance History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          
          {attendanceRecords.length === 0 ? (
            <View style={styles.emptyHistory}>
              <MaterialIcons name="history" size={48} color="#ccc" />
              <Text style={styles.emptyHistoryText}>No attendance records yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Your attendance history will appear here after marking attendance
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {attendanceRecords.slice(0, 7).map((record) => (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyDate}>
                    <MaterialIcons 
                      name={getStatusIcon(record.status)} 
                      size={20} 
                      color={getStatusColor(record.status)} 
                    />
                    <Text style={styles.historyDateText}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                  
                  <View style={styles.historyTimes}>
                    <View style={styles.historyTimeItem}>
                      <Text style={styles.historyTimeLabel}>In:</Text>
                      <Text style={styles.historyTimeValue}>{record.checkInTime}</Text>
                    </View>
                    
                    {record.checkOutTime && (
                      <View style={styles.historyTimeItem}>
                        <Text style={styles.historyTimeLabel}>Out:</Text>
                        <Text style={styles.historyTimeValue}>{record.checkOutTime}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={[
                    styles.historyStatusBadge, 
                    { backgroundColor: getStatusColor(record.status) }
                  ]}>
                    <Text style={styles.historyStatusText}>
                      {record.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Office Info */}
        {workerProfile && workerProfile.enrollmentStatus === 'enrolled' && (
          <View style={styles.officeSection}>
            <Text style={styles.sectionTitle}>Office Information</Text>
            <View style={styles.officeCard}>
              <View style={styles.officeHeader}>
                <MaterialIcons name="business" size={24} color="#FF9800" />
                <Text style={styles.officeName}>{workerProfile.officeName}</Text>
              </View>
              <Text style={styles.officeCode}>Code: {workerProfile.officeCode}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          scanType="attendance"
        />
        
        {processing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#FF9800" />
              <Text style={styles.processingText}>Processing attendance...</Text>
            </View>
          </View>
        )}
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
  header: {
    backgroundColor: '#FF9800',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  todaySection: {
    padding: 20,
    paddingBottom: 10,
  },
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  todayStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  todayDetails: {
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 80,
  },
  timeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checkOutHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  notCheckedInCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notCheckedInTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 8,
  },
  notCheckedInText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsSection: {
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  historySection: {
    padding: 20,
    paddingTop: 0,
  },
  emptyHistory: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  historyDateText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  historyTimes: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historyTimeItem: {
    alignItems: 'center',
  },
  historyTimeLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  historyTimeValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  historyStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  officeSection: {
    padding: 20,
    paddingTop: 0,
  },
  officeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  officeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  officeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  officeCode: {
    fontSize: 14,
    color: '#666',
    marginLeft: 34,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
});

export default AttendanceScreen;