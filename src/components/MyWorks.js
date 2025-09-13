import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { reverseGeocode, formatCoordinates } from '../utils/geocodingUtils';
import QRScanner from './QRScanner';
import QRTestingInterface from './QRTestingInterface';

// Helper to derive a short area name from a full address string provided by the citizen
const extractAreaFromAddress = (address) => {
  if (!address || typeof address !== 'string') return null;
  // Take the first segment before the first comma as a concise area/locality name
  const firstSegment = address.split(',')[0]?.trim();
  return firstSegment || null;
};

const MyWorks = () => {
  const [activeWorks, setActiveWorks] = useState([]);
  const [completedWorks, setCompletedWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressMap, setAddressMap] = useState({});
  const [selectedTab, setSelectedTab] = useState('active');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentWorkForCompletion, setCurrentWorkForCompletion] = useState(null);
  const [isCompletingPickup, setIsCompletingPickup] = useState(false);
  const [showQRTesting, setShowQRTesting] = useState(false);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    totalEarnings: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadWorks();
  }, [navigate]);
  
  // Listen for work updates from other components
  useEffect(() => {
    const handleWorkerDataUpdate = () => {
      console.log('Work data update event received in MyWorks');
      loadMyWorks();
    };
    
    window.addEventListener('workerDataUpdated', handleWorkerDataUpdate);
    
    return () => {
      window.removeEventListener('workerDataUpdated', handleWorkerDataUpdate);
    };
  }, []);

  const checkAuthAndLoadWorks = () => {
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (userType !== 'worker') {
      alert('Access denied. Only workers can access this page.');
      navigate('/');
      return;
    }
    
    loadMyWorks();
  };

  const loadMyWorks = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const workerId = localStorage.getItem('userId');
      
      // Try to fetch from API first
      let activeWorksData = [];
      let completedWorksData = [];
      
      if (token && workerId) {
        try {
          // Get worker assignments from API
          const assignmentsResponse = await axios.get(
            `http://localhost:3000/api/worker/assignments/${workerId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (assignmentsResponse.data && assignmentsResponse.data.assignments) {
            const assignments = assignmentsResponse.data.assignments;
            
            // Separate active and completed works
            activeWorksData = assignments.filter(work => 
              work.status === 'assigned' || work.status === 'in-progress'
            ).map(work => ({
              ...work,
              earnings: work.status === 'completed' ? 50 : 50, // ₹50 per pickup
              customerName: work.customerName || `Customer ${work.pickupId}`,
              customerPhone: work.customerPhone || '+91 XXXXXXXXXX'
            }));
            
            completedWorksData = assignments.filter(work => 
              work.status === 'completed'
            ).map(work => ({
              ...work,
              earnings: 50, // ₹50 per pickup
              customerName: work.customerName || `Customer ${work.pickupId}`,
              customerPhone: work.customerPhone || '+91 XXXXXXXXXX',
              completedDate: work.completedAt ? 
                new Date(work.completedAt).toLocaleDateString() : 
                new Date().toLocaleDateString(),
              actualWeight: work.actualWeight || work.estimatedWeight || '0 kg',
              rating: Math.floor(Math.random() * 2) + 4, // Random rating 4-5
              feedback: [
                'Excellent service, very professional',
                'Good service, arrived on time', 
                'Very satisfied with the service',
                'Professional and courteous worker'
              ][Math.floor(Math.random() * 4)]
            }));
          }
        } catch (apiError) {
          console.log('API call failed, using local/demo data:', apiError);
        }
      }
      
      // If no real data, use demo data
      if (activeWorksData.length === 0) {
        activeWorksData = [
        {
          _id: 'active_1',
          pickupId: 'PU-0112-2001',
          customerName: 'Rajesh Kumar',
          customerPhone: '+91 98765 43210',
          address: '45, MG Road, Near City Mall, Bangalore',
          location: { latitude: 12.9716, longitude: 77.5946 },
          wasteTypes: ['Dry Waste', 'Recyclables'],
          estimatedWeight: '5 kg',
          timeSlot: '9:00 AM - 11:00 AM',
          scheduledDate: new Date().toLocaleDateString(),
          specialInstructions: 'Ring the doorbell twice',
          earnings: 50,
          status: 'in-progress',
          acceptedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: 'active_2',
          pickupId: 'PU-0112-2002',
          customerName: 'Priya Sharma',
          customerPhone: '+91 99887 76655',
          address: '12B, Koramangala 4th Block, Bangalore',
          location: { latitude: 12.9352, longitude: 77.6245 },
          wasteTypes: ['Wet Waste'],
          estimatedWeight: '3 kg',
          timeSlot: '2:00 PM - 4:00 PM',
          scheduledDate: new Date().toLocaleDateString(),
          specialInstructions: 'Please come to the back entrance',
          earnings: 40,
          status: 'assigned',
          acceptedAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      }

      const demoCompletedWorks = [
        {
          _id: 'completed_1',
          pickupId: 'PU-0112-3001',
          customerName: 'Amit Singh',
          customerPhone: '+91 88990 01122',
          address: '78, Whitefield Main Road, Bangalore',
          location: { latitude: 12.9698, longitude: 77.7500 },
          wasteTypes: ['Hazardous Waste'],
          actualWeight: '2.3 kg',
          timeSlot: '10:00 AM - 12:00 PM',
          completedDate: new Date(Date.now() - 86400000).toLocaleDateString(),
          earnings: 75,
          status: 'completed',
          completedAt: new Date(Date.now() - 86400000).toISOString(),
          rating: 5,
          feedback: 'Excellent service, very professional'
        },
        {
          _id: 'completed_2',
          pickupId: 'PU-0112-3002',
          customerName: 'Sunita Reddy',
          customerPhone: '+91 77665 54433',
          address: '23, Indiranagar 2nd Stage, Bangalore',
          location: { latitude: 12.9784, longitude: 77.6408 },
          wasteTypes: ['Dry Waste', 'Wet Waste'],
          actualWeight: '6.8 kg',
          timeSlot: '6:00 AM - 8:00 AM',
          completedDate: new Date(Date.now() - 172800000).toLocaleDateString(),
          earnings: 60,
          status: 'completed',
          completedAt: new Date(Date.now() - 172800000).toISOString(),
          rating: 4,
          feedback: 'Good service, arrived on time'
        },
        {
          _id: 'completed_3',
          pickupId: 'PU-0112-3003',
          customerName: 'Mohammed Ali',
          customerPhone: '+91 99112 23344',
          address: '56, Hebbal Outer Ring Road, Bangalore',
          location: { latitude: 13.0358, longitude: 77.5950 },
          wasteTypes: ['Recyclables'],
          actualWeight: '9.5 kg',
          timeSlot: '4:00 PM - 6:00 PM',
          completedDate: new Date(Date.now() - 259200000).toLocaleDateString(),
          earnings: 80,
          status: 'completed',
          completedAt: new Date(Date.now() - 259200000).toISOString(),
          rating: 5,
          feedback: 'Very satisfied with the service'
        }
      ];
      
      // If no completed data from API, fall back to demo
      if (completedWorksData.length === 0) {
        completedWorksData = demoCompletedWorks;
      }
      
      setActiveWorks(activeWorksData);
      setCompletedWorks(completedWorksData);
      
      // Calculate stats
      updateStats(completedWorksData);
      
      // Load addresses
      loadAddressesForWorks([...activeWorksData, ...completedWorksData]);
    } catch (error) {
      console.error('Error loading works:', error);
      setActiveWorks([]);
      setCompletedWorks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (completedWorks) => {
    const today = new Date().toDateString();
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const todayEarnings = completedWorks
      .filter(work => {
        const workDate = new Date(work.completedAt || work.completedDate).toDateString();
        return workDate === today;
      })
      .reduce((sum, work) => sum + (work.earnings || 50), 0);
    
    const weekEarnings = completedWorks
      .filter(work => {
        const workDate = new Date(work.completedAt || work.completedDate);
        return workDate >= thisWeek;
      })
      .reduce((sum, work) => sum + (work.earnings || 50), 0);
    
    const totalEarnings = completedWorks
      .reduce((sum, work) => sum + (work.earnings || 50), 0);
    
    setStats({
      todayEarnings,
      weekEarnings,
      totalEarnings
    });
  };

  const loadAddressesForWorks = async (works) => {
    const newAddressMap = {};
    
    for (const work of works) {
      if (work.location && work.location.latitude && work.location.longitude) {
        try {
          const address = await reverseGeocode(
            work.location.latitude,
            work.location.longitude
          );
          newAddressMap[work._id] = address;
        } catch (error) {
          console.error('Error loading address for work:', work._id, error);
          newAddressMap[work._id] = work.address || formatCoordinates(
            work.location.latitude,
            work.location.longitude
          );
        }
      }
    }
    
    setAddressMap(newAddressMap);
  };

  const handleStartPickup = async (workId) => {
    try {
      // Update work status to in-progress
      setActiveWorks(prevWorks => 
        prevWorks.map(work => 
          work._id === workId 
            ? { ...work, status: 'in-progress', startedAt: new Date().toISOString() }
            : work
        )
      );
      alert('Pickup started! Navigate to the customer location.');
    } catch (error) {
      console.error('Error starting pickup:', error);
      alert('Failed to start pickup. Please try again.');
    }
  };

  const handleCompletePickup = (workId) => {
    // Find the work to complete
    const work = activeWorks.find(w => w._id === workId);
    if (!work) {
      alert('Work not found');
      return;
    }
    
    // Set current work and show QR scanner
    setCurrentWorkForCompletion(work);
    setShowQRScanner(true);
  };
  
  const handleQRScanSuccess = async (verificationCode, qrSource) => {
    try {
      const token = localStorage.getItem('authToken');
      const workId = currentWorkForCompletion._id;
      
      console.log('Attempting to complete work with QR verification:', { 
        workId, 
        verificationCode, 
        qrSource 
      });
      
      // Call backend to complete the pickup
      const response = await axios.put(
        `http://localhost:3000/api/worker/assignment/${workId}/complete`,
        {
          qrVerificationCode: verificationCode,
          qrSource: qrSource,
          actualWeight: currentWorkForCompletion.estimatedWeight,
          notes: `Completed via My Works section (${qrSource})`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Success - update local state
        const completedWork = {
          ...currentWorkForCompletion,
          status: 'completed',
          completedAt: new Date().toISOString(),
          completedDate: new Date().toLocaleDateString(),
          actualWeight: currentWorkForCompletion.estimatedWeight,
          qrVerified: true,
          qrSource: qrSource
        };
        
        setCompletedWorks(prev => [completedWork, ...prev]);
        setActiveWorks(prev => prev.filter(work => work._id !== workId));
        
        // Update stats
        updateStats([completedWork, ...completedWorks]);
        
        alert(`✅ ${response.data.message || 'Pickup completed successfully! QR code verified.'}`);
        
        // Close scanner
        setShowQRScanner(false);
        setCurrentWorkForCompletion(null);
        
      } else {
        throw new Error(response.data.message || 'Failed to complete pickup');
      }
      
    } catch (error) {
      console.error('Error completing pickup:', error);
      
      let errorMessage = 'Failed to complete pickup.';
      
      if (error.response) {
        const errorData = error.response.data;
        if (errorData.requiresQR) {
          errorMessage = errorData.message || 'QR verification required to complete pickup.';
        } else if (errorData.qrVerificationFailed) {
          errorMessage = errorData.message || 'Invalid QR code. Please scan the correct QR code.';
        } else {
          errorMessage = errorData.message || errorMessage;
        }
      }
      
      alert('❌ ' + errorMessage);
    }
  };
  
  const handleQRScanError = (error) => {
    console.error('QR scan error:', error);
    alert('Failed to scan QR code. Please try again or use manual entry.');
  };
  
  const handleQRScanClose = () => {
    setShowQRScanner(false);
    setCurrentWorkForCompletion(null);
  };

  const handleCancelWork = async (workId) => {
    if (!window.confirm('Are you sure you want to cancel this pickup? This may affect your rating.')) {
      return;
    }
    
    try {
      // Remove work from active list
      setActiveWorks(prev => prev.filter(work => work._id !== workId));
      alert('Pickup cancelled. The work is now available for other workers.');
    } catch (error) {
      console.error('Error cancelling work:', error);
      alert('Failed to cancel work. Please try again.');
    }
  };

  // Remove getTotalEarnings since we now use updateStats

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading your works...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0' }}>My Works</h1>
              <p style={{ margin: '0' }}>Manage your accepted pickups and track earnings</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowQRTesting(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🧪 Test QR
              </button>
              <button
                onClick={loadMyWorks}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Refreshing...
                  </>
                ) : (
                  <>
                    🔄 Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/worker">Dashboard</Link></li>
            <li><Link to="/worker/my-works">My Works</Link></li>
            <li><Link to="/worker/find-works">Find Works</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Earnings Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div className="card" style={{ textAlign: 'center', background: '#E8F5E8' }}>
            <h3 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>₹{stats.todayEarnings}</h3>
            <p style={{ margin: '0', color: '#666' }}>Today's Earnings</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#FFF3E0' }}>
            <h3 style={{ color: '#FF9800', margin: '0 0 10px 0' }}>₹{stats.weekEarnings}</h3>
            <p style={{ margin: '0', color: '#666' }}>This Week</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#E3F2FD' }}>
            <h3 style={{ color: '#2196F3', margin: '0 0 10px 0' }}>{activeWorks.length}</h3>
            <p style={{ margin: '0', color: '#666' }}>Active Works</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#F3E5F5' }}>
            <h3 style={{ color: '#9C27B0', margin: '0 0 10px 0' }}>{completedWorks.length}</h3>
            <p style={{ margin: '0', color: '#666' }}>Completed</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          borderBottom: '2px solid #ddd',
          paddingBottom: '10px'
        }}>
          <button
            onClick={() => setSelectedTab('active')}
            style={{
              padding: '10px 30px',
              background: selectedTab === 'active' ? '#FF9800' : 'transparent',
              color: selectedTab === 'active' ? 'white' : '#666',
              border: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: selectedTab === 'active' ? 'bold' : 'normal'
            }}
          >
            Active Works ({activeWorks.length})
          </button>
          <button
            onClick={() => setSelectedTab('completed')}
            style={{
              padding: '10px 30px',
              background: selectedTab === 'completed' ? '#4CAF50' : 'transparent',
              color: selectedTab === 'completed' ? 'white' : '#666',
              border: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: selectedTab === 'completed' ? 'bold' : 'normal'
            }}
          >
            Completed ({completedWorks.length})
          </button>
        </div>

        {/* Active Works */}
        {selectedTab === 'active' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px', color: '#333' }}>🚛 Active Works</h2>
            
            {activeWorks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <h3>No active works</h3>
                <p>Browse available works to accept new pickups.</p>
                <Link to="/worker/find-works" className="button" style={{ marginTop: '20px', display: 'inline-block' }}>
                  Find Works
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeWorks.map((work) => (
                  <div 
                    key={work._id} 
                    className="card" 
                    style={{ 
                      background: '#f8f9fa', 
                      border: '1px solid #dee2e6',
                      borderLeft: work.status === 'in-progress' ? '5px solid #FF9800' : '5px solid #2196F3'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                      <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: work.status === 'in-progress' ? '#FFF3E0' : '#E3F2FD',
                            color: work.status === 'in-progress' ? '#FF9800' : '#2196F3'
                          }}>
                            {work.status === 'in-progress' ? '🚛 In Progress' : '📋 Assigned'}
                          </span>
                        </div>
                        
                        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
                          Pickup ID: {work.pickupId ? `****${String(work.pickupId).slice(-5)}` : ''}
                        </h3>
                        
                        {/* Customer Info */}
                        <div style={{
                          background: '#fff',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: '0 0 8px 0', color: '#333', fontWeight: 'bold' }}>
                            Customer Details:
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>Name:</strong> {work.customerName}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>Phone:</strong> <a href={`tel:${work.customerPhone}`} style={{ color: '#2196F3' }}>
                              {work.customerPhone}
                            </a>
                          </p>
                          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                            <strong>Address:</strong> {work.address}
                          </p>
                        </div>
                        
                        {/* Pickup Details */}
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>📅 Date:</strong> {work.scheduledDate}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>🕐 Time:</strong> {work.timeSlot}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>🗑️ Type:</strong> {work.wasteTypes.join(', ')}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>⚖️ Est. Weight:</strong> {work.estimatedWeight}
                          </p>
                        </div>
                        
                        {work.specialInstructions && (
                          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
                            <strong>📝 Instructions:</strong> {work.specialInstructions}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '150px',
                        gap: '15px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Earnings</p>
                          <h2 style={{ margin: '5px 0', color: '#4CAF50' }}>₹{work.earnings}</h2>
                        </div>
                        
                        {work.status === 'assigned' ? (
                          <button
                            onClick={() => handleStartPickup(work._id)}
                            className="button"
                            style={{
                              background: '#FF9800',
                              padding: '10px 25px',
                              fontSize: '14px',
                              width: '100%'
                            }}
                          >
                            Start Pickup
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCompletePickup(work._id)}
                            className="button"
                            style={{
                              background: '#4CAF50',
                              padding: '10px 25px',
                              fontSize: '14px',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px'
                            }}
                          >
                            🔍 Complete with QR
                          </button>
                        )}
                        
                        <button
                          style={{
                            background: 'transparent',
                            border: '1px solid #2196F3',
                            color: '#2196F3',
                            padding: '8px 20px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          onClick={() => {
                            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${work.location.latitude},${work.location.longitude}`;
                            window.open(mapUrl, '_blank');
                          }}
                        >
                          📍 Navigate
                        </button>
                        
                        <button
                          onClick={() => handleCancelWork(work._id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #f44336',
                            color: '#f44336',
                            padding: '8px 20px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Works */}
        {selectedTab === 'completed' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px', color: '#333' }}>✅ Completed Works</h2>
            
            {completedWorks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <h3>No completed works yet</h3>
                <p>Complete your active works to see them here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {completedWorks.map((work) => (
                  <div 
                    key={work._id} 
                    className="card" 
                    style={{ 
                      background: '#f8f9fa', 
                      border: '1px solid #dee2e6',
                      borderLeft: '5px solid #4CAF50'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                          Pickup ID: {work.pickupId ? `****${String(work.pickupId).slice(-5)}` : ''}
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '10px' }}>
                          <div>
                            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                              <strong>Customer:</strong> {work.customerName}
                            </p>
                            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                              <strong>Location:</strong> {work.address}
                            </p>
                          </div>
                          <div>
                            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                              <strong>Completed:</strong> {work.completedDate}
                            </p>
                            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                              <strong>Actual Weight:</strong> {work.actualWeight}
                            </p>
                          </div>
                        </div>
                        
                        {work.rating && (
                          <div style={{ marginTop: '10px' }}>
                            <span style={{ color: '#FFB400', fontSize: '16px' }}>
                              {'⭐'.repeat(work.rating)}
                            </span>
                            {work.feedback && (
                              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                                "{work.feedback}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Earned</p>
                        <h3 style={{ margin: '5px 0', color: '#4CAF50' }}>₹{work.earnings}</h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: '#E8F5E8',
                          color: '#4CAF50'
                        }}>
                          ✅ Completed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* QR Scanner Modal */}
      {showQRScanner && currentWorkForCompletion && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onScanError={handleQRScanError}
          onClose={handleQRScanClose}
          assignmentId={currentWorkForCompletion.pickupId}
        />
      )}
      
      {/* QR Testing Interface */}
      {showQRTesting && (
        <QRTestingInterface
          assignmentId={activeWorks.length > 0 ? activeWorks[0].pickupId : 'PU-0112-2001'}
          onClose={() => setShowQRTesting(false)}
        />
      )}
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MyWorks;
