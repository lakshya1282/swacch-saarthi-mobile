import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';
import OfficeProfile from './OfficeProfile';
import WorkerAttendanceModal from './WorkerAttendanceModal';
import socketService from '../services/socketService';

const Dashboard = ({ authToken, officeData, operatorData, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overviewData, setOverviewData] = useState({
    totalPickupsToday: 0,
    pendingRequests: 0,
    activeWorkers: 0,
    completedPickups: 0,
    totalWasteCollected: 0,
    totalIncentivesEarned: 0
  });
  const [workersData, setWorkersData] = useState([]);
  const [citizenRequests, setCitizenRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalWorkers: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    earlyArrivals: 0,
    lateArrivals: 0
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [selectedWorkerForAttendance, setSelectedWorkerForAttendance] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load overview data
      const overviewResponse = await fetch(
        `http://localhost:3000/api/dashboard/overview/${officeData._id}?range=today`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (overviewResponse.ok) {
        const overview = await overviewResponse.json();
        setOverviewData({
          totalPickupsToday: overview.totalPickups || 0,
          pendingRequests: overview.pendingPickups || 0,
          activeWorkers: overview.activeWorkers || 0,
          completedPickups: overview.completedPickups || 0,
          totalWasteCollected: overview.totalWasteCollected || 0,
          totalIncentivesEarned: overview.totalIncentivesEarned || 0
        });
      }

      // Load workers data - try multiple endpoints
      let workersLoaded = false;
      
      // First try the office-specific enrolled workers endpoint
      if (officeData.officeCode) {
        try {
          const enrolledWorkersResponse = await fetch(
            `http://localhost:3000/api/dashboard/enrolled-workers/${officeData.officeCode}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            }
          );
          
          if (enrolledWorkersResponse.ok) {
            const enrolledData = await enrolledWorkersResponse.json();
            if (enrolledData.success && enrolledData.workers) {
              setWorkersData(enrolledData.workers);
              workersLoaded = true;
              console.log(`✅ Loaded ${enrolledData.workers.length} enrolled workers`);
            }
          }
        } catch (error) {
          console.warn('Enrolled workers endpoint failed:', error.message);
        }
      }
      
      // Fallback to original endpoint if enrolled workers didn't work
      if (!workersLoaded) {
        try {
          const workersResponse = await fetch(
            `http://localhost:3000/api/dashboard/workers/${officeData._id}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            }
          );

          if (workersResponse.ok) {
            const workers = await workersResponse.json();
            setWorkersData(Array.isArray(workers) ? workers : []);
            console.log(`✅ Loaded ${Array.isArray(workers) ? workers.length : 0} workers from fallback endpoint`);
          }
        } catch (error) {
          console.warn('Fallback workers endpoint failed:', error.message);
        }
      }
      
      // Load attendance data if we're on attendance tab or need it for dashboard
      if (activeTab === 'attendance' || activeTab === 'dashboard') {
        try {
          const attendanceResponse = await fetch(
            `http://localhost:3000/api/dashboard/attendance/${officeData.officeCode}?date=${selectedDate}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            }
          );
          
          if (attendanceResponse.ok) {
            const attendanceResult = await attendanceResponse.json();
            if (attendanceResult.success) {
              setAttendanceData(attendanceResult.data.attendance || []);
              setAttendanceStats(attendanceResult.data.stats || {
                totalWorkers: 0,
                presentToday: 0,
                absentToday: 0,
                attendanceRate: 0,
                earlyArrivals: 0,
                lateArrivals: 0
              });
              console.log(`✅ Loaded attendance data for ${selectedDate}`);
            }
          }
        } catch (error) {
          console.warn('Attendance data loading failed:', error.message);
        }
      }
      
      // Load citizen requests (mock data for now)
      setCitizenRequests([
        { id: 1, name: 'John Doe', location: 'Sector 1, Block A', scheduledTime: '10:30 AM', status: 'pending', assignedWorker: 'Not Assigned' },
        { id: 2, name: 'Jane Smith', location: 'Sector 2, Block B', scheduledTime: '11:00 AM', status: 'in-progress', assignedWorker: 'Worker #123' },
        { id: 3, name: 'Mike Johnson', location: 'Sector 1, Block C', scheduledTime: '2:30 PM', status: 'completed', assignedWorker: 'Worker #456' },
      ]);

      // Load notifications (mock data for now)
      setNotifications([
        { id: 1, type: 'new-request', message: 'New pickup request from John Doe', time: '2 minutes ago', read: false },
        { id: 2, type: 'alert', message: 'Worker #123 is running late', time: '15 minutes ago', read: false },
        { id: 3, type: 'completed', message: 'Pickup completed at Sector 2', time: '1 hour ago', read: true },
      ]);

    } catch (error) {
      console.error('Dashboard data loading error:', error);
      setError('Failed to load dashboard data. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  }, [authToken, officeData._id, officeData.officeCode, activeTab, selectedDate]);

  useEffect(() => {
    loadDashboardData();
    
    // Initialize socket connection
    if (officeData?.officeCode && authToken) {
      socketService.initialize(officeData.officeCode, authToken, operatorData?._id);
      
      // Setup real-time event listeners
      socketService.on('worker-enrolled', (data) => {
        console.log('New worker enrolled:', data);
        // Reload workers data
        loadDashboardData();
      });
      
      socketService.on('attendance-update', (data) => {
        console.log('Attendance update:', data);
        // Reload attendance data if on attendance tab
        if (activeTab === 'attendance') {
          loadDashboardData();
        }
      });
      
      socketService.on('pickup-completed', (data) => {
        console.log('Pickup completed:', data);
        // Update overview stats
        setOverviewData(prev => ({
          ...prev,
          completedPickups: prev.completedPickups + 1,
          totalWasteCollected: prev.totalWasteCollected + (data.actualWeight || 0),
          totalIncentivesEarned: prev.totalIncentivesEarned + (data.incentiveEarned || 0)
        }));
      });
      
      socketService.on('worker-location', (data) => {
        console.log('Worker location update:', data);
        // Update worker location on map if implemented
      });
    }
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [loadDashboardData, officeData, authToken, operatorData, activeTab]);

  const handleRefresh = () => {
    loadDashboardData();
  };
  
  const openWorkerAttendance = (worker) => {
    setSelectedWorkerForAttendance(worker);
    setShowAttendanceModal(true);
  };
  
  const closeWorkerAttendance = () => {
    setShowAttendanceModal(false);
    setSelectedWorkerForAttendance(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-tab">
            <div className="page-header">
              <h1>Dashboard Overview</h1>
              <p>Real-time monitoring of waste management operations</p>
            </div>
            
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon pickup">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Total Pickups Today</h3>
                  <div className="stat-number">{overviewData.totalPickupsToday}</div>
                  <div className="stat-change positive">+12% from yesterday</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon pending">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <div className="stat-number">{overviewData.pendingRequests}</div>
                  <div className="stat-change negative">+3 new requests</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon workers">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Active Workers</h3>
                  <div className="stat-number">{overviewData.activeWorkers}</div>
                  <div className="stat-change neutral">85% availability</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon completed">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Completed Pickups</h3>
                  <div className="stat-number">{overviewData.completedPickups}</div>
                  <div className="stat-change positive">95% completion rate</div>
                </div>
              </div>
            </div>
            
            <div className="dashboard-grid">
              {/* Worker Tracking Panel */}
              <div className="tracking-panel">
                <div className="panel-header">
                  <h2>Real-time Worker Tracking</h2>
                  <div className="tracking-controls">
                    <button className="btn btn-outline">Refresh Map</button>
                  </div>
                </div>
                
                <div className="map-container">
                  <div className="map-placeholder">
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    <p>Interactive Map</p>
                    <small>Worker locations will appear here</small>
                  </div>
                </div>
                
                <div className="worker-status-list">
                  <div className="status-header">
                    <h4>Worker Status</h4>
                  </div>
                  
                  {workersData.length > 0 ? workersData.slice(0, 3).map(worker => (
                    <div key={worker._id} className="worker-status-item">
                      <div className="worker-avatar">
                        {worker.personalInfo?.firstName?.[0] || 'W'}
                      </div>
                      <div className="worker-details">
                        <span className="worker-name">
                          {worker.personalInfo?.firstName || 'Worker'} {worker.personalInfo?.lastName || ''}
                        </span>
                        <div className="worker-status-info">
                          <span className={`status-badge ${worker.status === 'active' ? 'available' : 'offline'}`}>
                            {worker.status === 'active' ? 'Available' : 'Offline'}
                          </span>
                          <span className="worker-location">Zone A</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-workers">
                      <p>No active workers found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Weekly Pickups Chart */}
              <div className="chart-panel">
                <div className="panel-header">
                  <h2>Weekly Pickups</h2>
                </div>
                
                <div className="chart-container">
                  <canvas id="weeklyChart" width="400" height="200"></canvas>
                </div>
              </div>
            </div>
            
            {/* Citizen Requests Table */}
            <div className="requests-section">
              <div className="section-header">
                <h2>Recent Citizen Requests</h2>
                <button className="btn btn-primary">View All</button>
              </div>
              
              <div className="table-container">
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Scheduled Time</th>
                      <th>Status</th>
                      <th>Assigned Worker</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citizenRequests.map(request => (
                      <tr key={request.id}>
                        <td>
                          <div className="citizen-info">
                            <div className="citizen-avatar">{request.name[0]}</div>
                            <span>{request.name}</span>
                          </div>
                        </td>
                        <td>{request.location}</td>
                        <td>{request.scheduledTime}</td>
                        <td>
                          <span className={`status-badge ${request.status}`}>
                            {request.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td>{request.assignedWorker}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-outline">View</button>
                            <button className="btn btn-sm btn-primary">Assign</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      case 'workers':
        return (
          <div className="workers-tab">
            <div className="page-header">
              <h1>Worker Management</h1>
              <p>Manage and monitor your waste collection workforce</p>
              <button className="btn btn-primary" onClick={handleRefresh}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh Data
              </button>
            </div>
            
            {/* Workers Statistics */}
            <div className="workers-stats-grid">
              <div className="stat-card">
                <div className="stat-icon workers">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Total Workers</h3>
                  <div className="stat-number">{workersData.length}</div>
                  <div className="stat-change neutral">Enrolled workers</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon available">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Available</h3>
                  <div className="stat-number">{workersData.filter(w => w.status === 'AVAILABLE').length}</div>
                  <div className="stat-change positive">Ready for assignments</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon busy">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Busy/On Route</h3>
                  <div className="stat-number">{workersData.filter(w => w.status === 'BUSY' || w.status === 'ON_ROUTE').length}</div>
                  <div className="stat-change warning">Currently working</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon offline">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Off Duty</h3>
                  <div className="stat-number">{workersData.filter(w => w.status === 'OFF_DUTY').length}</div>
                  <div className="stat-change neutral">Not available</div>
                </div>
              </div>
            </div>
            
            {/* Workers List */}
            <div className="workers-section">
              <div className="section-header">
                <h2>Enrolled Workers ({workersData.length})</h2>
                <div className="search-filter">
                  <div className="search-box">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input type="text" placeholder="Search workers..." />
                  </div>
                </div>
              </div>
              
              {workersData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <h3>No Workers Found</h3>
                  <p>No workers are currently enrolled in this office.</p>
                  <p>Workers can enroll using office code: <strong>{officeData.officeCode}</strong></p>
                </div>
              ) : (
                <div className="workers-grid">
                  {workersData.map(worker => (
                    <div key={worker._id} className="worker-card">
                      <div className="worker-card-header">
                        <div className="worker-avatar-large">
                          {worker.name ? worker.name[0] : (worker.firstName ? worker.firstName[0] : 'W')}
                        </div>
                        <div className="worker-basic-info">
                          <h3 className="worker-name">
                            {worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || 'Unknown Worker'}
                          </h3>
                          <div className="worker-id">
                            {worker.workerId || worker.employeeId || `ID: ${worker._id.substring(0, 8)}`}
                          </div>
                          <span className={`status-badge ${worker.status?.toLowerCase() || 'off-duty'}`}>
                            {worker.status?.replace('_', ' ') || 'OFF DUTY'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="worker-card-details">
                        <div className="detail-row">
                          <span className="detail-label">Email:</span>
                          <span className="detail-value">{worker.email || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Phone:</span>
                          <span className="detail-value">{worker.phone || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Enrolled:</span>
                          <span className="detail-value">
                            {worker.enrolledAt ? new Date(worker.enrolledAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Last Active:</span>
                          <span className="detail-value">
                            {worker.lastActiveAt ? new Date(worker.lastActiveAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="worker-performance">
                        <div className="performance-header">
                          <h4>Performance</h4>
                        </div>
                        <div className="performance-metrics">
                          <div className="metric">
                            <span className="metric-label">Total Pickups:</span>
                            <span className="metric-value">{worker.performance?.totalPickups || 0}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Waste Collected:</span>
                            <span className="metric-value">{worker.performance?.totalWasteCollected || 0} kg</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Rating:</span>
                            <span className="metric-value">
                              {worker.performance?.rating?.average ? 
                                `${worker.performance.rating.average.toFixed(1)} (${worker.performance.rating.count})` : 
                                'No ratings'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="worker-card-actions">
                        <button className="btn btn-sm btn-outline">View Details</button>
                        <button className="btn btn-sm btn-primary">Assign Task</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'citizens':
        return (
          <div className="citizens-tab">
            <div className="page-header">
              <h1>Citizen Management</h1>
              <p>Manage citizen requests and communications</p>
            </div>
            
            <div className="citizens-content">
              <p>Citizens management features coming soon...</p>
            </div>
          </div>
        );
        
      case 'pickups':
        return (
          <div className="pickups-tab">
            <div className="page-header">
              <h1>Pickup Management</h1>
              <p>Schedule and track waste collection pickups</p>
            </div>
            
            <div className="pickups-content">
              <p>Pickup management features coming soon...</p>
            </div>
          </div>
        );
        
      case 'reports':
        return (
          <div className="reports-tab">
            <div className="page-header">
              <h1>Reports & Analytics</h1>
              <p>Detailed insights and performance reports</p>
            </div>
            
            <div className="reports-content">
              <p>Reports and analytics features coming soon...</p>
            </div>
          </div>
        );
        
      case 'attendance':
        return (
          <div className="attendance-tab">
            <div className="page-header">
              <h1>Attendance Management</h1>
              <p>View and track individual worker attendance history</p>
              <button className="btn btn-primary" onClick={handleRefresh}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh Data
              </button>
            </div>
            
            {/* Attendance Overview Statistics */}
            <div className="attendance-overview-stats">
              <div className="stat-card present">
                <div className="stat-icon present">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Total Workers</h3>
                  <div className="stat-number">{workersData.length}</div>
                  <div className="stat-change neutral">Enrolled workers</div>
                </div>
              </div>
              
              <div className="stat-card rate">
                <div className="stat-icon rate">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Today's Present</h3>
                  <div className="stat-number">{attendanceStats.presentToday}</div>
                  <div className="stat-change positive">
                    {attendanceStats.totalWorkers > 0 ? 
                      Math.round((attendanceStats.presentToday / attendanceStats.totalWorkers) * 100) : 0}% attendance
                  </div>
                </div>
              </div>
              
              <div className="stat-card late">
                <div className="stat-icon late">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>Late Arrivals</h3>
                  <div className="stat-number">{attendanceStats.lateArrivals}</div>
                  <div className="stat-change warning">Today</div>
                </div>
              </div>
            </div>
            
            {/* Workers List with Attendance Buttons */}
            <div className="workers-attendance-section">
              <div className="section-header">
                <h2>Worker Attendance Records</h2>
                <p>Click "Attendance" to view individual worker attendance history</p>
              </div>
              
              {workersData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <h3>No Workers Found</h3>
                  <p>No workers are currently enrolled in this office.</p>
                  <p>Workers can enroll using office code: <strong>{officeData.officeCode}</strong></p>
                </div>
              ) : (
                <div className="workers-attendance-grid">
                  {workersData.map(worker => (
                    <div key={worker._id} className="worker-attendance-card">
                      <div className="worker-card-header">
                        <div className="worker-avatar-large">
                          {worker.name ? worker.name[0] : (worker.firstName ? worker.firstName[0] : 'W')}
                        </div>
                        <div className="worker-basic-info">
                          <h3 className="worker-name">
                            {worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || 'Unknown Worker'}
                          </h3>
                          <div className="worker-id">
                            {worker.workerId || worker.employeeId || `ID: ${worker._id.substring(0, 8)}`}
                          </div>
                          <span className={`status-badge ${worker.status?.toLowerCase() || 'off-duty'}`}>
                            {worker.status?.replace('_', ' ') || 'OFF DUTY'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="worker-card-details">
                        <div className="detail-row">
                          <span className="detail-label">Email:</span>
                          <span className="detail-value">{worker.email || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Phone:</span>
                          <span className="detail-value">{worker.phone || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Enrolled:</span>
                          <span className="detail-value">
                            {worker.enrolledAt ? new Date(worker.enrolledAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="worker-attendance-actions">
                        <button 
                          className="btn btn-primary btn-attendance"
                          onClick={() => openWorkerAttendance(worker)}
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                          </svg>
                          View Attendance
                        </button>
                        <button className="btn btn-sm btn-outline">
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <OfficeProfile
            authToken={authToken}
            officeData={officeData}
            operatorData={operatorData}
          />
        );
        
      case 'settings':
        return (
          <div className="settings-tab">
            <div className="page-header">
              <h1>Settings</h1>
              <p>Configure system preferences and options</p>
            </div>
            
            <div className="settings-content">
              <p>Settings features coming soon...</p>
            </div>
          </div>
        );
        
      default:
        return <div>Select a tab</div>;
    }
  };
  
  // Initialize chart when dashboard loads
  useEffect(() => {
    if (activeTab === 'dashboard' && !loading) {
      initializeChart();
    }
  }, [activeTab, loading]);
  
  const initializeChart = () => {
    const canvas = document.getElementById('weeklyChart');
    if (canvas && window.Chart) {
      const ctx = canvas.getContext('2d');
      
      new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Pickups',
            data: [12, 19, 13, 15, 22, 18, 24],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#E5E7EB'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="nav-left">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#10B981"/>
              <path d="M12 10l8 6-8 6V10z" fill="white"/>
            </svg>
            <span className="logo-text">Sahayak Sarthi</span>
          </div>
        </div>
        
        <div className="nav-right">
          <div className="notifications-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
            )}
          </div>
          
          <div className="admin-profile">
            <div className="profile-avatar">
              {operatorData.personalInfo.firstName[0]}{operatorData.personalInfo.lastName[0]}
            </div>
            <div className="profile-info">
              <span className="profile-name">{operatorData.personalInfo.firstName} {operatorData.personalInfo.lastName}</span>
              <span className="profile-role">Admin</span>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <div className="sidebar">
          <nav className="sidebar-nav">
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => setActiveTab('dashboard')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              Dashboard
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'workers' ? 'active' : ''}`} 
              onClick={() => setActiveTab('workers')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              Workers
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'citizens' ? 'active' : ''}`} 
              onClick={() => setActiveTab('citizens')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              Citizens
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'pickups' ? 'active' : ''}`} 
              onClick={() => setActiveTab('pickups')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Pickups
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} 
              onClick={() => setActiveTab('reports')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
              Reports
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} 
              onClick={() => setActiveTab('attendance')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              Attendance
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
              onClick={() => setActiveTab('profile')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm0 6h6v2H7v-2z" clipRule="evenodd"/>
              </svg>
              Office Profile
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} 
              onClick={() => setActiveTab('settings')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              Settings
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {error && (
            <div className="error-alert">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
              <button onClick={handleRefresh} className="retry-btn">Retry</button>
            </div>
          )}
          
          {renderTabContent()}
        </div>
        
        {/* Notifications Panel */}
        <div className="notifications-panel">
          <div className="panel-header">
            <h3>Notifications</h3>
            <span className="notification-count">{notifications.filter(n => !n.read).length}</span>
          </div>
          
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                <div className={`notification-icon ${notification.type}`}>
                  {notification.type === 'new-request' && <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/></svg>}
                  {notification.type === 'alert' && <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>}
                  {notification.type === 'completed' && <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
                </div>
                <div className="notification-content">
                  <p>{notification.message}</p>
                  <span className="notification-time">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Worker Attendance Modal */}
      <WorkerAttendanceModal
        isOpen={showAttendanceModal}
        onClose={closeWorkerAttendance}
        worker={selectedWorkerForAttendance}
        authToken={authToken}
        officeCode={officeData.officeCode}
      />
    </div>
  );
};

export default Dashboard;
