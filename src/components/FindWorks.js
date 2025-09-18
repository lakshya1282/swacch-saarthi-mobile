import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { reverseGeocode, formatCoordinates } from '../utils/geocodingUtils';

// Helper to derive a short area name from a full address string provided by the citizen
const extractAreaFromAddress = (address) => {
  if (!address || typeof address !== 'string') return null;
  // Take the first segment before the first comma as a concise area/locality name
  const firstSegment = address.split(',')[0]?.trim();
  return firstSegment || null;
};

const FindWorks = () => {
  const [availableWorks, setAvailableWorks] = useState([]);
  const [filteredWorks, setFilteredWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressMap, setAddressMap] = useState({});
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedWasteType, setSelectedWasteType] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadWorks();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAvailableWorks();
      setLastRefresh(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    filterWorks();
  }, [availableWorks, selectedArea, selectedWasteType]);

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
    
    loadAvailableWorks();
  };

  const loadAvailableWorks = async () => {
    setLoading(true);
    
    try {
      // First try to fetch from API for real-time schedules
      const token = localStorage.getItem('authToken');
      let realTimeWorks = [];
      
      try {
        const response = await axios.get(
          'http://localhost:3000/api/pickups/schedules',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.success) {
          realTimeWorks = response.data.data;
        }
      } catch (apiError) {
        console.log('API call failed, using local data:', apiError);
      }
      
      // Load real-time pickup schedules from localStorage as fallback
      const allPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
      
      // Filter only pending pickups that are not assigned to any worker yet
      const availablePickups = allPickups.filter(pickup => 
        pickup.status === 'pending' && 
        !pickup.assignedWorkerId && 
        !pickup.assignedTo
      );
      
      // Transform pickup data to work format for workers from localStorage
      const localStorageWorks = availablePickups.map((pickup, index) => {
        // Calculate distance (mock for demo, in production use real distance calculation)
        const distances = ['1.2 km', '2.5 km', '3.8 km', '4.5 km', '5.2 km'];

        // Determine urgency based on time slot
        let urgency = 'normal';
        const currentHour = new Date().getHours();
        if (pickup.timeSlot) {
          const slotHour = parseInt(pickup.timeSlot.split(':')[0]);
          if (Math.abs(slotHour - currentHour) <= 2) {
            urgency = 'urgent';
          } else if (Math.abs(slotHour - currentHour) <= 4) {
            urgency = 'high';
          }
        }

        // Prefer citizen-provided area; otherwise, derive a short area from the provided address
        const derivedArea = pickup.area 
          || pickup.locality 
          || extractAreaFromAddress(pickup.address || pickup.customerAddress) 
          || 'Area not specified';
        
        return {
          _id: pickup.pickupId || `pickup_${index}`,
          pickupId: pickup.pickupId || `PU-${Date.now()}-${index}`,
          customerName: pickup.customerName || pickup.userId || 'Customer',
          customerPhone: pickup.customerPhone || '+91 XXXXXXXXXX',
          address: pickup.address || pickup.customerAddress || 'Address not specified',
          location: pickup.location || { 
            latitude: 12.9716 + (Math.random() - 0.5) * 0.1, 
            longitude: 77.5946 + (Math.random() - 0.5) * 0.1 
          },
          wasteTypes: Array.isArray(pickup.wasteTypes) ? pickup.wasteTypes : [pickup.wasteTypes || 'Mixed Waste'],
          estimatedWeight: pickup.estimatedWeight || '5 kg',
          timeSlot: pickup.timeSlot || '9:00 AM - 11:00 AM',
          scheduledDate: pickup.scheduledDate || new Date().toLocaleDateString(),
          specialInstructions: pickup.specialInstructions || 'None',
          estimatedEarnings: 50 + (Math.floor(Math.random() * 3) * 10), // 50-80 rupees
          distance: distances[index % distances.length],
          area: derivedArea,
          urgency: urgency,
          status: 'pending',
          createdAt: pickup.createdAt || new Date().toISOString(),
          wasteImages: pickup.wasteImages || []
        };
      });
      
      // Combine API data with localStorage data (prioritize API data)
      let combinedWorks = realTimeWorks.length > 0 ? realTimeWorks : localStorageWorks;
      
      // If no real pickups, add some demo ones for testing (all with pending status and no assignment)
      const demoWorks = combinedWorks.length === 0 ? [
        {
          _id: 'work_1',
          pickupId: 'PU-0112-1001',
          customerName: 'Rajesh Kumar',
          customerPhone: '+91 98765 43210',
          address: '45, MG Road, Near City Mall, Bangalore',
          location: { latitude: 12.9716, longitude: 77.5946 },
          wasteTypes: ['Dry Waste', 'Recyclables'],
          estimatedWeight: '5 kg',
          timeSlot: '9:00 AM - 11:00 AM',
          scheduledDate: new Date().toLocaleDateString(),
          specialInstructions: 'Ring the doorbell twice',
          estimatedEarnings: 50,
          distance: '2.5 km',
          area: extractAreaFromAddress('45, MG Road, Near City Mall, Bangalore') || 'MG Road Area',
          urgency: 'normal',
          status: 'pending',
          assignedWorkerId: null,
          assignedTo: null
        },
        {
          _id: 'work_2',
          pickupId: 'PU-0112-1002',
          customerName: 'Priya Sharma',
          customerPhone: '+91 99887 76655',
          address: '12B, Koramangala 4th Block, Bangalore',
          location: { latitude: 12.9352, longitude: 77.6245 },
          wasteTypes: ['Wet Waste'],
          estimatedWeight: '3 kg',
          timeSlot: '2:00 PM - 4:00 PM',
          scheduledDate: new Date().toLocaleDateString(),
          specialInstructions: 'Please come to the back entrance',
          estimatedEarnings: 40,
          distance: '3.8 km',
          area: extractAreaFromAddress('12B, Koramangala 4th Block, Bangalore') || 'Koramangala Area',
          urgency: 'high',
          status: 'pending',
          assignedWorkerId: null,
          assignedTo: null
        },
        {
          _id: 'work_3',
          pickupId: 'PU-0112-1003',
          customerName: 'Amit Singh',
          customerPhone: '+91 88990 01122',
          address: '78, Whitefield Main Road, Bangalore',
          location: { latitude: 12.9698, longitude: 77.7500 },
          wasteTypes: ['Hazardous Waste'],
          estimatedWeight: '2 kg',
          timeSlot: '10:00 AM - 12:00 PM',
          scheduledDate: new Date(Date.now() + 86400000).toLocaleDateString(),
          specialInstructions: 'Contains batteries and electronics',
          estimatedEarnings: 75,
          distance: '5.2 km',
          area: extractAreaFromAddress('78, Whitefield Main Road, Bangalore') || 'Whitefield Area',
          urgency: 'normal',
          status: 'pending',
          assignedWorkerId: null,
          assignedTo: null
        },
        {
          _id: 'work_4',
          pickupId: 'PU-0112-1004',
          customerName: 'Sunita Reddy',
          customerPhone: '+91 77665 54433',
          address: '23, Indiranagar 2nd Stage, Bangalore',
          location: { latitude: 12.9784, longitude: 77.6408 },
          wasteTypes: ['Dry Waste', 'Wet Waste'],
          estimatedWeight: '7 kg',
          timeSlot: '6:00 AM - 8:00 AM',
          scheduledDate: new Date(Date.now() + 86400000).toLocaleDateString(),
          specialInstructions: 'Early morning pickup preferred',
          estimatedEarnings: 60,
          distance: '1.5 km',
          area: extractAreaFromAddress('23, Indiranagar 2nd Stage, Bangalore') || 'Indiranagar Area',
          urgency: 'normal',
          status: 'pending',
          assignedWorkerId: null,
          assignedTo: null
        },
        {
          _id: 'work_5',
          pickupId: 'PU-0112-1005',
          customerName: 'Mohammed Ali',
          customerPhone: '+91 99112 23344',
          address: '56, Hebbal Outer Ring Road, Bangalore',
          location: { latitude: 13.0358, longitude: 77.5950 },
          wasteTypes: ['Recyclables'],
          estimatedWeight: '10 kg',
          timeSlot: '4:00 PM - 6:00 PM',
          scheduledDate: new Date().toLocaleDateString(),
          specialInstructions: 'Large quantity of cardboard boxes',
          estimatedEarnings: 80,
          distance: '4.0 km',
          area: extractAreaFromAddress('56, Hebbal Outer Ring Road, Bangalore') || 'Hebbal Area',
          urgency: 'urgent',
          status: 'pending',
          assignedWorkerId: null,
          assignedTo: null
        }
      ] : [];
      
      // Combine real-time works with demo works
      const allWorks = [...combinedWorks, ...demoWorks];
      
      // Sort by urgency and creation time
      allWorks.sort((a, b) => {
        // Sort by urgency first
        const urgencyOrder = { 'urgent': 0, 'high': 1, 'normal': 2 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        // Then by creation time (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setAvailableWorks(allWorks);
      loadAddressesForWorks(allWorks);
    } catch (error) {
      console.error('Error loading available works:', error);
      setAvailableWorks([]);
    } finally {
      setLoading(false);
    }
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

  const filterWorks = () => {
    let filtered = [...availableWorks];
    
    if (selectedArea !== 'all') {
      filtered = filtered.filter(work => work.area === selectedArea);
    }
    
    if (selectedWasteType !== 'all') {
      filtered = filtered.filter(work => 
        work.wasteTypes.some(type => type.toLowerCase().includes(selectedWasteType.toLowerCase()))
      );
    }
    
    setFilteredWorks(filtered);
  };

  const handleAcceptWork = async (workId) => {
    if (!window.confirm('Are you sure you want to accept this pickup request?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const workerId = localStorage.getItem('userId');
      
      // Try to update via API first
      try {
        const response = await axios.post(
          'http://localhost:3000/api/worker/accept-work',
          { workId, workerId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.success) {
          alert('Work accepted successfully! Check "My Works" to see your active assignments.');
          
          // Remove the accepted work from available list
          setAvailableWorks(prevWorks => prevWorks.filter(work => work._id !== workId));
          
          // Notify dashboard to refresh data immediately
          console.log('Dispatching workerDataUpdated event from API success'); // Debug log
          window.dispatchEvent(new Event('workerDataUpdated'));
          
          // Navigate to My Works
          setTimeout(() => {
            navigate('/worker');
          }, 500);
          return;
        }
      } catch (apiError) {
        console.log('API accept failed, using localStorage:', apiError);
      }
      
      // Fallback: Update the pickup status in localStorage
      const pickupHistory = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
      const acceptedWork = availableWorks.find(work => work._id === workId);
      
      if (acceptedWork) {
        // Find and update the pickup in history
        const updatedHistory = pickupHistory.map(pickup => {
          if (pickup.pickupId === acceptedWork.pickupId || pickup.pickupId === workId) {
            return {
              ...pickup,
              status: 'assigned',
              assignedTo: localStorage.getItem('firstName') || 'Worker',
              assignedWorkerId: localStorage.getItem('userId') || 'worker_1',
              assignedAt: new Date().toISOString()
            };
          }
          return pickup;
        });
        
        // If pickup not found in history (demo data), add it
        if (!updatedHistory.find(p => p.pickupId === workId)) {
          updatedHistory.unshift({
            ...acceptedWork,
            status: 'assigned',
            assignedTo: localStorage.getItem('firstName') || 'Worker',
            assignedWorkerId: localStorage.getItem('userId') || 'worker_1',
            assignedAt: new Date().toISOString()
          });
        }
        
        localStorage.setItem('pickupHistory', JSON.stringify(updatedHistory));
        
        // Also add to worker's accepted works (for worker dashboard)
        const workerAcceptedWorks = JSON.parse(localStorage.getItem('workerAcceptedWorks') || '[]');
        workerAcceptedWorks.unshift({
          ...acceptedWork,
          status: 'assigned',
          acceptedAt: new Date().toISOString()
        });
        localStorage.setItem('workerAcceptedWorks', JSON.stringify(workerAcceptedWorks));
      }
      
      alert('Work accepted successfully! Check \"My Works\" to see your active assignments.');
      
      // Remove the accepted work from available list
      setAvailableWorks(prevWorks => prevWorks.filter(work => work._id !== workId));
      
      // Notify dashboard to refresh data immediately
      console.log('Dispatching workerDataUpdated event from localStorage fallback'); // Debug log
      window.dispatchEvent(new Event('workerDataUpdated'));
      
      // Navigate to My Works
      setTimeout(() => {
        navigate('/worker');
      }, 500);
    } catch (error) {
      console.error('Error accepting work:', error);
      alert('Failed to accept work. Please try again.');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 'urgent': return '🔴 Urgent';
      case 'high': return '🟠 High Priority';
      default: return '🟢 Normal';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading available works...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="header" style={{ background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' }}>
        <div className="container">
          <h1>Find Works</h1>
          <p>Browse and accept available pickup requests in your area</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/worker">Dashboard</Link></li>
            <li><Link to="/worker/my-works">My Works</Link></li>
            <li><Link to="/worker/find-works">Find Works</Link></li>
            <li><Link to="/worker/profile">👤 Profile</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Filters */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>🔍 Filter Works</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
            <h3 style={{ margin: '0', fontSize: '18px' }}>🔍 Filter Works</h3>
            <button
              onClick={() => {
                loadAvailableWorks();
                setLastRefresh(new Date());
              }}
              style={{
                padding: '8px 16px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🔄 Refresh Now
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Area
              </label>
              <select 
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              >
                <option value="all">All Areas</option>
                {/* Generate options dynamically from available work areas */}
                {Array.from(new Set(availableWorks.map(work => work.area))).filter(Boolean).map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Waste Type
              </label>
              <select 
                value={selectedWasteType}
                onChange={(e) => setSelectedWasteType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              >
                <option value="all">All Types</option>
                <option value="dry">Dry Waste</option>
                <option value="wet">Wet Waste</option>
                <option value="recyclables">Recyclables</option>
                <option value="hazardous">Hazardous Waste</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', 
          border: '1px solid #4CAF50',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#2E7D32', fontSize: '16px' }}>
                📡 Real-time Pickup Schedules
              </h3>
              <p style={{ margin: '0', color: '#1B5E20', fontSize: '14px' }}>
                Live updates every 30 seconds • Auto-refresh enabled
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ color: '#2E7D32', fontSize: '12px', fontWeight: 'bold' }}>
                LIVE • Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div className="card" style={{ textAlign: 'center', background: '#E3F2FD' }}>
            <h3 style={{ color: '#2196F3', margin: '0 0 10px 0' }}>{filteredWorks.length}</h3>
            <p style={{ margin: '0', color: '#666' }}>Available Works</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#FFF3E0' }}>
            <h3 style={{ color: '#FF9800', margin: '0 0 10px 0' }}>
              ₹{filteredWorks.reduce((sum, work) => sum + work.estimatedEarnings, 0)}
            </h3>
            <p style={{ margin: '0', color: '#666' }}>Potential Earnings</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#F3E5F5' }}>
            <h3 style={{ color: '#9C27B0', margin: '0 0 10px 0' }}>
              {filteredWorks.filter(w => w.urgency === 'urgent' || w.urgency === 'high').length}
            </h3>
            <p style={{ margin: '0', color: '#666' }}>Priority Pickups</p>
          </div>
        </div>

        {/* Available Works List */}
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>📦 Available Pickup Requests</h2>
          
          {filteredWorks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <h3>No available works found</h3>
              <p>Try adjusting your filters or check back later for new requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredWorks.map((work) => (
                <div 
                  key={work._id} 
                  className="card" 
                  style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6',
                    borderLeft: `5px solid ${getUrgencyColor(work.urgency)}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      {/* Priority Badge and Time Info */}
                      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: getUrgencyColor(work.urgency) + '20',
                          color: getUrgencyColor(work.urgency),
                          border: `1px solid ${getUrgencyColor(work.urgency)}40`
                        }}>
                          {getUrgencyLabel(work.urgency)}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: '#666',
                          background: '#f5f5f5',
                          padding: '3px 8px',
                          borderRadius: '10px'
                        }}>
                          🕐 Posted: {new Date(work.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
                        📍 {work.area} - {work.distance}
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
                          <strong>Phone:</strong> {work.customerPhone}
                        </p>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                          <strong>Address:</strong> {work.address}
                        </p>
                      </div>
                      
                      {/* Pickup Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>📅 Date:</strong> {work.scheduledDate}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>🕐 Time:</strong> {work.timeSlot}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>🗑️ Type:</strong> {work.wasteTypes.join(', ')}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>⚖️ Weight:</strong> {work.estimatedWeight}
                          </p>
                        </div>
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
                        <h2 style={{ margin: '5px 0', color: '#4CAF50' }}>₹{work.estimatedEarnings}</h2>
                      </div>
                      
                      <button
                        onClick={() => handleAcceptWork(work._id)}
                        className="button"
                        style={{
                          background: '#4CAF50',
                          padding: '12px 30px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          width: '100%'
                        }}
                      >
                        Accept Work
                      </button>
                      
                      <button
                        style={{
                          background: 'transparent',
                          border: '1px solid #2196F3',
                          color: '#2196F3',
                          padding: '8px 20px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${work.location.latitude},${work.location.longitude}`;
                          window.open(mapUrl, '_blank');
                        }}
                      >
                        📍 View on Map
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="card" style={{ 
          background: '#E8F5E9', 
          border: '1px solid #4CAF50',
          marginTop: '30px'
        }}>
          <h3 style={{ color: '#2E7D32', margin: '0 0 15px 0' }}>💡 Tips for Workers</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#1B5E20' }}>
            <li style={{ marginBottom: '8px' }}>Accept works that are close to your current location to save time and fuel</li>
            <li style={{ marginBottom: '8px' }}>Priority pickups often have higher earnings</li>
            <li style={{ marginBottom: '8px' }}>Check the waste type to ensure you have the right equipment</li>
            <li style={{ marginBottom: '8px' }}>Read special instructions carefully before accepting</li>
            <li>Complete pickups on time to maintain a good rating</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FindWorks;
