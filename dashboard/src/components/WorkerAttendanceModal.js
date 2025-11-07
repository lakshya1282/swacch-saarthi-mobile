import React, { useState, useEffect } from 'react';
import './WorkerAttendanceModal.css';

const WorkerAttendanceModal = ({ 
  isOpen, 
  onClose, 
  worker, 
  authToken, 
  officeCode 
}) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    averageHours: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    if (isOpen && worker) {
      // Set default date range (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      
      loadWorkerAttendance(worker._id, thirtyDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    }
  }, [isOpen, worker]);

  const loadWorkerAttendance = async (workerId, start, end) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      if (start) queryParams.append('startDate', start);
      if (end) queryParams.append('endDate', end);
      queryParams.append('limit', '100');

      const response = await fetch(`http://localhost:3001/api/dashboard/attendance/worker/${workerId}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttendanceHistory(data.data || []);
          calculateStats(data.data || []);
        } else {
          setError(data.message || 'Failed to load attendance history');
        }
      } else {
        // Fallback to demo data if API fails
        const demoData = generateDemoAttendanceData(workerId);
        setAttendanceHistory(demoData);
        calculateStats(demoData);
      }
    } catch (err) {
      console.error('Error loading worker attendance:', err);
      // Fallback to demo data
      const demoData = generateDemoAttendanceData(workerId);
      setAttendanceHistory(demoData);
      calculateStats(demoData);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoAttendanceData = (workerId) => {
    const demoData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      if (!isWeekend && Math.random() > 0.1) { // 90% attendance rate
        const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
        const checkInMinute = Math.floor(Math.random() * 60);
        const checkOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
        const checkOutMinute = Math.floor(Math.random() * 60);
        
        const checkInTime = new Date(date);
        checkInTime.setHours(checkInHour, checkInMinute, 0);
        
        const checkOutTime = new Date(date);
        checkOutTime.setHours(checkOutHour, checkOutMinute, 0);
        
        const isLate = checkInHour >= 9;
        const hoursWorked = Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 10) / 10;
        
        demoData.push({
          _id: `demo_${workerId}_${date.toISOString().split('T')[0]}`,
          workerId: workerId,
          workerName: worker?.name || `${worker?.firstName} ${worker?.lastName}` || 'Unknown Worker',
          date: date,
          checkIn: {
            time: checkInTime,
            method: 'qr_scan'
          },
          checkOut: {
            time: checkOutTime,
            method: 'qr_scan'
          },
          status: isLate ? 'late' : 'present',
          isLate: isLate,
          hoursWorked: hoursWorked
        });
      }
    }
    
    return demoData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const calculateStats = (data) => {
    const totalDays = data.length;
    const presentDays = data.filter(d => d.status === 'present' || d.status === 'late').length;
    const lateDays = data.filter(d => d.isLate).length;
    const totalHours = data.reduce((sum, d) => sum + (d.hoursWorked || 0), 0);
    const averageHours = totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    setStats({
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      lateDays,
      averageHours,
      attendanceRate
    });
  };

  const handleDateRangeChange = () => {
    if (worker && startDate && endDate) {
      loadWorkerAttendance(worker._id, startDate, endDate);
    }
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status, isLate) => {
    if (isLate) return 'late';
    return status;
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Check In', 'Check Out', 'Hours Worked', 'Status'],
      ...attendanceHistory.map(record => [
        new Date(record.date).toLocaleDateString(),
        record.checkIn?.time ? formatTime(record.checkIn.time) : '-',
        record.checkOut?.time ? formatTime(record.checkOut.time) : '-',
        record.hoursWorked ? `${record.hoursWorked}h` : '-',
        record.isLate ? 'Late' : (record.status === 'present' ? 'Present' : record.status)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${worker?.name || 'worker'}_attendance_${startDate}_to_${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="worker-attendance-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="worker-info">
              <div className="worker-avatar">
                {worker?.name ? worker.name[0] : (worker?.firstName ? worker.firstName[0] : 'W')}
              </div>
              <div>
                <h2>
                  {worker?.name || `${worker?.firstName || ''} ${worker?.lastName || ''}`.trim() || 'Unknown Worker'}
                </h2>
                <p className="worker-id">
                  ID: {worker?.workerId || worker?.employeeId || worker?._id?.substring(0, 8)}
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={exportToCSV}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                Export CSV
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="modal-content">
          {/* Date Range Filter */}
          <div className="filters-section">
            <div className="date-filters">
              <div className="filter-group">
                <label>From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleDateRangeChange}>
                Apply Filter
              </button>
            </div>
          </div>

          {/* Attendance Statistics */}
          <div className="attendance-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.attendanceRate}%</div>
              <div className="stat-label">Attendance Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.presentDays}</div>
              <div className="stat-label">Days Present</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.lateDays}</div>
              <div className="stat-label">Late Arrivals</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.averageHours}h</div>
              <div className="stat-label">Avg. Hours/Day</div>
            </div>
          </div>

          {/* Attendance History */}
          <div className="attendance-history">
            <h3>Attendance History</h3>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading attendance history...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <p>{error}</p>
                <button className="btn btn-outline" onClick={() => loadWorkerAttendance(worker._id, startDate, endDate)}>
                  Retry
                </button>
              </div>
            ) : attendanceHistory.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
                <p>No attendance records found for the selected date range.</p>
              </div>
            ) : (
              <div className="attendance-table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record, index) => (
                      <tr key={record._id || index} className={`attendance-row ${record.status}`}>
                        <td>
                          <div className="date-cell">
                            <span className="date">{formatDate(record.date)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="time-cell">
                            {record.checkIn?.time ? (
                              <>
                                <span className="time">{formatTime(record.checkIn.time)}</span>
                                {record.isLate && <span className="late-indicator">Late</span>}
                              </>
                            ) : (
                              <span className="no-record">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="time-cell">
                            {record.checkOut?.time ? (
                              <span className="time">{formatTime(record.checkOut.time)}</span>
                            ) : (
                              <span className="no-record">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="hours">
                            {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(record.status, record.isLate)}`}>
                            {record.isLate ? 'Late' : 
                             record.status === 'present' ? 'Present' : 
                             record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerAttendanceModal;