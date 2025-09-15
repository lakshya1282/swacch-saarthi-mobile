import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const WorkerPerformance = () => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [worker, setWorker] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPerformanceData();
  }, [period]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      if (!token || !userId) {
        navigate('/login');
        return;
      }
      
      // Fetch performance data
      const response = await axios.get(
        `http://localhost:3000/api/worker/performance/${userId}?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPerformance(response.data.data);
        
        // Also get worker profile for additional context
        try {
          const profileResponse = await axios.get(
            `http://localhost:3000/api/worker/profile/${userId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (profileResponse.data.success) {
            setWorker(profileResponse.data.data);
          }
        } catch (profileError) {
          console.log('Could not fetch worker profile:', profileError.message);
        }
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPerformanceColor = (value, type = 'percentage') => {
    if (type === 'percentage') {
      if (value >= 90) return '#4CAF50';
      if (value >= 70) return '#FF9800';
      return '#f44336';
    }
    return '#2196F3';
  };

  const calculateTrend = (data) => {
    if (!data || data.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = data.slice(0, 3);
    const older = data.slice(3, 6);
    
    if (recent.length === 0 || older.length === 0) return { direction: 'stable', change: 0 };
    
    const recentAvg = recent.reduce((sum, item) => sum + (item.efficiency || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + (item.efficiency || 0), 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    
    return { direction, change: Math.abs(change) };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #FF9800',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h3 style={{ color: '#666', marginTop: '20px' }}>Loading Performance Data...</h3>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' }}>
        <div className="container">
          <h1>📊 Performance Dashboard</h1>
          <p>Track your work metrics and improvement over time</p>
        </div>
      </div>

      <div className="container" style={{ padding: '20px' }}>
        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            border: '1px solid #ef5350'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Period Selector */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', color: '#333' }}>📅 Performance Period</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['week', 'month', '3months'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '8px 16px',
                    background: period === p ? '#2196F3' : '#f5f5f5',
                    color: period === p ? 'white' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Last 3 Months'}
                </button>
              ))}
            </div>
          </div>
          
          {performance && (
            <p style={{ margin: '0', color: '#666' }}>
              Showing data from {formatDate(performance.period.start)} to {formatDate(performance.period.end)}
            </p>
          )}
        </div>

        {performance ? (
          <>
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="card" style={{ textAlign: 'center', background: '#e3f2fd' }}>
                <h3 style={{ color: '#1976d2', margin: '0 0 10px 0' }}>
                  {performance.metrics.attendance.rate}%
                </h3>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Attendance Rate</p>
                <small style={{ color: '#888' }}>
                  {performance.metrics.attendance.daysWorked}/{performance.metrics.attendance.expectedDays} days
                </small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#e8f5e9' }}>
                <h3 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>
                  {performance.metrics.performance.totalWeight} kg
                </h3>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Waste Collected</p>
                <small style={{ color: '#888' }}>
                  {performance.metrics.performance.totalPickups} pickups completed
                </small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#fff3e0' }}>
                <h3 style={{ color: '#ff9800', margin: '0 0 10px 0' }}>
                  {performance.metrics.performance.averageEfficiency}%
                </h3>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Efficiency Score</p>
                <small style={{ 
                  color: getPerformanceColor(performance.metrics.performance.averageEfficiency), 
                  fontWeight: 'bold' 
                }}>
                  {performance.metrics.performance.averageEfficiency >= 90 ? 'Excellent' : 
                   performance.metrics.performance.averageEfficiency >= 70 ? 'Good' : 'Needs Improvement'}
                </small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#f3e5f5' }}>
                <h3 style={{ color: '#9c27b0', margin: '0 0 10px 0' }}>
                  ₹{performance.metrics.performance.totalIncentives}
                </h3>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Incentives Earned</p>
                <small style={{ color: '#888' }}>
                  {performance.metrics.performance.totalWeight > 0 ? 
                    `₹${Math.round(performance.metrics.performance.totalIncentives / performance.metrics.performance.totalWeight)}` : '₹0'}/kg avg
                </small>
              </div>
            </div>

            {/* Performance Trend */}
            {performance.trends && performance.trends.length > 0 && (
              <div className="card" style={{ marginBottom: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>📈 Recent Performance Trend</h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  {performance.trends.slice(0, 7).map((day, index) => (
                    <div key={index} style={{
                      background: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        {formatDate(day.date)}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                        {day.weight || 0} kg
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {day.pickups || 0} pickups
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: getPerformanceColor(day.efficiency),
                        fontWeight: 'bold',
                        marginTop: '5px'
                      }}>
                        {day.efficiency || 0}% eff.
                      </div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const trend = calculateTrend(performance.trends);
                  return (
                    <div style={{
                      background: trend.direction === 'up' ? '#e8f5e9' : 
                                 trend.direction === 'down' ? '#ffebee' : '#f5f5f5',
                      padding: '15px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '24px' }}>
                        {trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➖'}
                      </span>
                      <div>
                        <strong style={{ 
                          color: trend.direction === 'up' ? '#4caf50' : 
                                 trend.direction === 'down' ? '#f44336' : '#666'
                        }}>
                          {trend.direction === 'up' ? 'Improving Performance' : 
                           trend.direction === 'down' ? 'Declining Performance' : 'Stable Performance'}
                        </strong>
                        {trend.change > 0 && (
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {Math.round(trend.change)}% change in recent days
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Office Information (if enrolled) */}
            {worker && worker.officeId && (
              <div className="card" style={{ marginBottom: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🏢 Office Information</h2>
                
                <div style={{ 
                  background: '#e8f5e9',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #4caf50'
                }}>
                  <h3 style={{ color: '#2e7d32', margin: '0 0 15px 0' }}>
                    {worker.officeId.officeName || 'Office Name'}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                      <strong style={{ color: '#666' }}>Office Code:</strong>
                      <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '16px' }}>
                        {worker.officeCode}
                      </p>
                    </div>
                    
                    <div>
                      <strong style={{ color: '#666' }}>Enrolled Since:</strong>
                      <p style={{ margin: '5px 0' }}>
                        {formatDate(worker.enrolledAt)}
                      </p>
                    </div>
                    
                    {worker.officeId.address && (
                      <div style={{ gridColumn: '1/-1' }}>
                        <strong style={{ color: '#666' }}>Address:</strong>
                        <p style={{ margin: '5px 0' }}>
                          {worker.officeId.address.street}, {worker.officeId.address.city}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tips */}
            <div className="card" style={{ marginBottom: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>💡 Performance Tips</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#1976d2', margin: '0 0 10px 0' }}>🎯 Boost Your Efficiency</h3>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                    <li>Plan your route to minimize travel time</li>
                    <li>Start work early to avoid traffic</li>
                    <li>Keep your vehicle well-maintained</li>
                    <li>Use GPS for optimal route planning</li>
                  </ul>
                </div>
                
                <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>💰 Maximize Incentives</h3>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                    <li>Collect over 15kg daily to earn incentives</li>
                    <li>Focus on high-volume pickup areas</li>
                    <li>Maintain good customer relations</li>
                    <li>Complete all assigned pickups on time</li>
                  </ul>
                </div>
                
                <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#ff9800', margin: '0 0 10px 0' }}>⭐ Improve Rating</h3>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                    <li>Be punctual for scheduled pickups</li>
                    <li>Handle waste materials carefully</li>
                    <li>Maintain professional appearance</li>
                    <li>Follow all safety protocols</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
              <button
                onClick={() => navigate('/worker')}
                style={{
                  padding: '12px 24px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ← Back to Dashboard
              </button>
              
              <button
                onClick={() => navigate('/worker/profile')}
                style={{
                  padding: '12px 24px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                👤 View Profile
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🔄 Refresh Data
              </button>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ color: '#666' }}>📊 No Performance Data Available</h3>
            <p style={{ color: '#888', marginBottom: '20px' }}>
              {worker && worker.enrollmentStatus === 'not_enrolled' ? 
                'Please enroll in an office to start tracking your performance.' :
                'Complete some pickups to see your performance metrics here.'
              }
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              {worker && worker.enrollmentStatus === 'not_enrolled' ? (
                <button
                  onClick={() => navigate('/worker/profile')}
                  style={{
                    padding: '12px 24px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  🏢 Enroll in Office
                </button>
              ) : (
                <button
                  onClick={() => navigate('/worker/find-works')}
                  style={{
                    padding: '12px 24px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Find Available Works
                </button>
              )}
              
              <button
                onClick={() => navigate('/worker')}
                style={{
                  padding: '12px 24px',
                  background: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerPerformance;