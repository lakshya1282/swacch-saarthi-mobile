import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area 
} from 'recharts';
import { 
  Users, Truck, Weight, DollarSign, MapPin, Clock,
  TrendingUp, AlertTriangle, CheckCircle, Activity,
  Filter, Download, RefreshCw, Calendar, Search,
  Settings, Bell, LogOut, Home, BarChart3
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import './Dashboard.css';

const Dashboard = ({ officeInfo, operatorInfo, onLogout }) => {
  // State management
  const [socket, setSocket] = useState(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalWorkers: 0,
      activeWorkers: 0,
      totalWasteCollected: 0,
      totalIncentivesEarned: 0,
      totalPickups: 0,
      efficiency: 0
    },
    workers: [],
    performance: [],
    incentives: [],
    realtimeData: {}
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize socket connection and data fetching
  useEffect(() => {
    initializeSocket();
    fetchDashboardData();
    
    const interval = setInterval(() => {
      if (isAutoRefresh) {
        fetchDashboardData();
      }
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [dateRange, isAutoRefresh, refreshInterval]);

  const initializeSocket = () => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('dashboardAuthToken'),
        officeId: officeInfo._id,
        operatorId: operatorInfo._id
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join-office-dashboard', officeInfo._id);
    });

    newSocket.on('worker-performance-update', (data) => {
      handleRealtimeUpdate('performance', data);
    });

    newSocket.on('pickup-completed', (data) => {
      handleRealtimeUpdate('pickup', data);
    });

    newSocket.on('incentive-calculated', (data) => {
      handleRealtimeUpdate('incentive', data);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    setSocket(newSocket);
  };

  const handleRealtimeUpdate = useCallback((type, data) => {
    setDashboardData(prevData => {
      const newData = { ...prevData };
      
      switch (type) {
        case 'performance':
          // Update worker performance in real-time
          const workerIndex = newData.workers.findIndex(w => w._id === data.workerId);
          if (workerIndex !== -1) {
            newData.workers[workerIndex] = {
              ...newData.workers[workerIndex],
              todayPerformance: data.performance,
              lastUpdated: new Date().toISOString()
            };
          }
          break;
        
        case 'pickup':
          // Update overview statistics
          newData.overview.totalPickups += 1;
          newData.overview.totalWasteCollected += data.weight || 0;
          break;
        
        case 'incentive':
          // Update incentive data
          newData.overview.totalIncentivesEarned += data.amount || 0;
          break;
      }
      
      return newData;
    });

    toast.success(`Real-time update: ${type}`, { duration: 2000 });
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('dashboardAuthToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [overviewRes, workersRes, performanceRes, incentivesRes] = await Promise.all([
        axios.get(`/api/dashboard/overview/${officeInfo._id}?range=${dateRange}`, config),
        axios.get(`/api/dashboard/workers/${officeInfo._id}`, config),
        axios.get(`/api/dashboard/performance/${officeInfo._id}?range=${dateRange}`, config),
        axios.get(`/api/dashboard/incentives/${officeInfo._id}?range=${dateRange}`, config)
      ]);

      setDashboardData({
        overview: overviewRes.data,
        workers: workersRes.data,
        performance: performanceRes.data,
        incentives: incentivesRes.data,
        realtimeData: {}
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Component for displaying metrics cards
  const MetricsCard = ({ title, value, icon: Icon, color, change, unit = '' }) => (
    <div className={`metrics-card ${color}`}>
      <div className="metrics-icon">
        <Icon size={24} />
      </div>
      <div className="metrics-content">
        <h3>{title}</h3>
        <div className="metrics-value">
          {unit && <span className="unit">{unit}</span>}
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {change && (
          <div className={`metrics-change ${change > 0 ? 'positive' : 'negative'}`}>
            <TrendingUp size={16} />
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
    </div>
  );

  // Worker performance table component
  const WorkerPerformanceTable = () => (
    <div className="performance-table">
      <div className="table-header">
        <h3>Worker Performance Today</h3>
        <div className="table-actions">
          <button className="btn-filter">
            <Filter size={16} />
            Filter
          </button>
          <button className="btn-download">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
      
      <div className="table-content">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Weight Collected</th>
              <th>Pickups</th>
              <th>Incentive</th>
              <th>Status</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.workers.map((worker) => {
              const performance = worker.todayPerformance || {};
              const qualifiesForIncentive = performance.totalWeight > 15;
              const incentiveAmount = qualifiesForIncentive ? (performance.totalWeight - 15) * 10 : 0;
              
              return (
                <tr key={worker._id}>
                  <td>
                    <div className="worker-info">
                      <div className="worker-avatar">
                        {worker.personalInfo?.firstName?.charAt(0) || 'W'}
                      </div>
                      <div>
                        <div className="worker-name">
                          {worker.personalInfo?.firstName} {worker.personalInfo?.lastName}
                        </div>
                        <div className="worker-id">{worker.workerId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="weight-info">
                      <span className="weight-value">{performance.totalWeight || 0} kg</span>
                      {qualifiesForIncentive && (
                        <span className="incentive-qualifier">🎯</span>
                      )}
                    </div>
                  </td>
                  <td>{performance.pickupsCompleted || 0}</td>
                  <td>
                    <span className={`incentive-amount ${qualifiesForIncentive ? 'earned' : 'none'}`}>
                      ₹{incentiveAmount}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${worker.status || 'active'}`}>
                      {worker.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {worker.lastUpdated ? format(new Date(worker.lastUpdated), 'HH:mm') : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Performance charts component
  const PerformanceCharts = () => {
    const chartData = dashboardData.performance.map((item, index) => ({
      day: format(subDays(new Date(), 6 - index), 'EEE'),
      weight: item.totalWeight || 0,
      pickups: item.totalPickups || 0,
      incentives: item.totalIncentives || 0,
      workers: item.activeWorkers || 0
    }));

    const pieData = [
      { name: 'Dry Waste', value: 45, color: '#3b82f6' },
      { name: 'Wet Waste', value: 35, color: '#10b981' },
      { name: 'Hazardous', value: 20, color: '#ef4444' }
    ];

    return (
      <div className="charts-section">
        <div className="chart-container">
          <h3>Weekly Collection Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="#3b82f6" name="Weight (kg)" />
              <Line type="monotone" dataKey="pickups" stroke="#10b981" name="Pickups" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Incentive Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="incentives" fill="#f59e0b" name="Incentives (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container small">
          <h3>Waste Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={48} />
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn-retry">
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="brand">
            <Home className="brand-icon" />
            <div>
              <h1>स्वच्छ-सारथी सहायक</h1>
              <p>Swacch-Saarthi Sahayak</p>
            </div>
          </div>
          
          <div className="office-info">
            <h2>{officeInfo.officeName}</h2>
            <p>{officeInfo.address.city}, {officeInfo.address.state}</p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-controls">
            <div className="date-selector">
              <Calendar size={16} />
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="date-range-select"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>

            <button 
              className={`refresh-btn ${isAutoRefresh ? 'active' : ''}`}
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            >
              <RefreshCw size={16} />
              Auto Refresh
            </button>

            <div className="notifications">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </div>
          </div>

          <div className="user-menu">
            <div className="user-info">
              <span>{operatorInfo.personalInfo.firstName} {operatorInfo.personalInfo.lastName}</span>
              <small>{operatorInfo.personalInfo.designation}</small>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <nav className="dashboard-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentTab('overview')}
          >
            <BarChart3 size={16} />
            Overview
          </button>
          <button 
            className={`nav-tab ${currentTab === 'workers' ? 'active' : ''}`}
            onClick={() => setCurrentTab('workers')}
          >
            <Users size={16} />
            Workers
          </button>
          <button 
            className={`nav-tab ${currentTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentTab('analytics')}
          >
            <Activity size={16} />
            Analytics
          </button>
          <button 
            className={`nav-tab ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="dashboard-content">
        {currentTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <section className="metrics-section">
              <MetricsCard
                title="Total Workers"
                value={dashboardData.overview.totalWorkers}
                icon={Users}
                color="blue"
                change={5}
              />
              <MetricsCard
                title="Active Workers"
                value={dashboardData.overview.activeWorkers}
                icon={CheckCircle}
                color="green"
                change={2}
              />
              <MetricsCard
                title="Waste Collected"
                value={dashboardData.overview.totalWasteCollected}
                icon={Weight}
                color="purple"
                unit="kg"
                change={12}
              />
              <MetricsCard
                title="Incentives Earned"
                value={dashboardData.overview.totalIncentivesEarned}
                icon={DollarSign}
                color="orange"
                unit="₹"
                change={8}
              />
              <MetricsCard
                title="Total Pickups"
                value={dashboardData.overview.totalPickups}
                icon={Truck}
                color="indigo"
                change={-3}
              />
              <MetricsCard
                title="Efficiency"
                value={`${dashboardData.overview.efficiency}%`}
                icon={TrendingUp}
                color="teal"
                change={4}
              />
            </section>

            {/* Worker Performance Table */}
            <section className="table-section">
              <WorkerPerformanceTable />
            </section>
          </>
        )}

        {currentTab === 'workers' && (
          <section className="workers-section">
            <WorkerPerformanceTable />
          </section>
        )}

        {currentTab === 'analytics' && (
          <section className="analytics-section">
            <PerformanceCharts />
          </section>
        )}

        {currentTab === 'settings' && (
          <section className="settings-section">
            <div className="settings-card">
              <h3>Dashboard Settings</h3>
              <div className="setting-item">
                <label>Auto Refresh Interval (seconds)</label>
                <select 
                  value={refreshInterval / 1000} 
                  onChange={(e) => setRefreshInterval(Number(e.target.value) * 1000)}
                >
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={isAutoRefresh}
                    onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  />
                  Enable Auto Refresh
                </label>
              </div>
            </div>

            <div className="office-settings-card">
              <h3>Office Information</h3>
              <div className="office-details">
                <p><strong>Office:</strong> {officeInfo.officeName}</p>
                <p><strong>Code:</strong> {officeInfo.officeCode}</p>
                <p><strong>Location:</strong> {officeInfo.address.street}, {officeInfo.address.city}</p>
                <p><strong>Coverage:</strong> {officeInfo.coverageArea.radius} km radius</p>
                <p><strong>Operational Hours:</strong> {officeInfo.operationalHours.startTime} - {officeInfo.operationalHours.endTime}</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;