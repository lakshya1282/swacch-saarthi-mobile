import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';
import { useAuth } from './AuthContext';

interface AttendanceContextType {
  hasMarkedAttendance: boolean;
  isCheckingAttendance: boolean;
  attendanceData: any;
  checkAttendanceStatus: () => Promise<void>;
  markAttendanceComplete: () => void;
  resetAttendanceStatus: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

interface AttendanceProviderProps {
  children: ReactNode;
}

export const AttendanceProvider: React.FC<AttendanceProviderProps> = ({ children }) => {
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const { userData, userType } = useAuth();

  useEffect(() => {
    // Only check attendance for workers
    if (userType === 'worker' && userData) {
      checkAttendanceStatus();
    } else {
      setIsCheckingAttendance(false);
      setHasMarkedAttendance(true); // Citizens don't need to mark attendance
    }
  }, [userData, userType]);

  const checkAttendanceStatus = async () => {
    try {
      setIsCheckingAttendance(true);
      
      const workerId = userData?.id || userData?._id;
      if (!workerId) {
        console.log('No worker ID found, skipping attendance check');
        setHasMarkedAttendance(false);
        return;
      }

      // Check if attendance was already marked today (cached)
      const today = new Date().toISOString().split('T')[0];
      const cachedAttendance = await AsyncStorage.getItem(`attendance_${workerId}_${today}`);
      
      if (cachedAttendance) {
        const cached = JSON.parse(cachedAttendance);
        console.log('Found cached attendance for today:', cached);
        setHasMarkedAttendance(true);
        setAttendanceData(cached);
        return;
      }

      // Check with server
      console.log('Checking attendance status for worker:', workerId);
      const hasAttendance = await apiService.checkAttendanceForToday(workerId);
      
      console.log('Attendance check result:', hasAttendance);
      setHasMarkedAttendance(hasAttendance);

      if (hasAttendance) {
        // Cache the attendance status for today
        await AsyncStorage.setItem(`attendance_${workerId}_${today}`, JSON.stringify({
          marked: true,
          date: today,
          timestamp: new Date().toISOString()
        }));
      }

    } catch (error) {
      console.error('Error checking attendance status:', error);
      
      // In case of error, check cached data
      const workerId = userData?.id || userData?._id;
      const today = new Date().toISOString().split('T')[0];
      const cachedAttendance = await AsyncStorage.getItem(`attendance_${workerId}_${today}`);
      
      if (cachedAttendance) {
        console.log('Using cached attendance due to error');
        setHasMarkedAttendance(true);
      } else {
        // Default to false for safety - require attendance marking
        setHasMarkedAttendance(false);
      }
    } finally {
      setIsCheckingAttendance(false);
    }
  };

  const markAttendanceComplete = async () => {
    try {
      setHasMarkedAttendance(true);
      
      // Cache attendance status
      const workerId = userData?.id || userData?._id;
      const today = new Date().toISOString().split('T')[0];
      
      const attendanceRecord = {
        marked: true,
        date: today,
        timestamp: new Date().toISOString(),
        workerId: workerId
      };

      await AsyncStorage.setItem(`attendance_${workerId}_${today}`, JSON.stringify(attendanceRecord));
      setAttendanceData(attendanceRecord);
      
      console.log('Attendance marked complete and cached');
    } catch (error) {
      console.error('Error caching attendance status:', error);
      // Still mark as complete even if caching fails
      setHasMarkedAttendance(true);
    }
  };

  const resetAttendanceStatus = async () => {
    try {
      setHasMarkedAttendance(false);
      setAttendanceData(null);
      
      // Clear cached attendance
      const workerId = userData?.id || userData?._id;
      if (workerId) {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.removeItem(`attendance_${workerId}_${today}`);
      }
      
      console.log('Attendance status reset');
    } catch (error) {
      console.error('Error resetting attendance status:', error);
    }
  };

  return (
    <AttendanceContext.Provider value={{
      hasMarkedAttendance,
      isCheckingAttendance,
      attendanceData,
      checkAttendanceStatus,
      markAttendanceComplete,
      resetAttendanceStatus
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};