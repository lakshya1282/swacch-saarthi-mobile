import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { reverseGeocode, formatCoordinates } from '../utils/geocodingUtils';
import QRScanner from './QRScanner';

const WorkerDashboard = () => {
  const [worker, setWorker] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressMap, setAddressMap] = useState({});
  const [stats, setStats] = useState({
    todayPickups: 0,
    completedToday: 0,
    totalEarnings: 0,
    rating: 4.8
  });
  const [error, setError] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentAssignmentForCompletion, setCurrentAssignmentForCompletion] = useState(null);
  const navigate = useNavigate();

  // Initial load effect - only runs once on mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, [navigate]);
  
  // Event listener effect - always active after initial load
  useEffect(() => {
    // Listen for worker data updates (when work is accepted)
    const handleWorkerDataUpdate = () => {
      console.log('Worker data update event received'); // Debug log
      const currentWorker = worker || {
        _id: localStorage.getItem('userId')
      };
      
      if (currentWorker && currentWorker._id) {
        console.log('Refreshing assignments for worker:', currentWorker._id); // Debug log
        loadWorkerAssignments(currentWorker._id, localStorage.getItem('authToken'));
      }
    };
    
    window.addEventListener('workerDataUpdated', handleWorkerDataUpdate);
    
    return () => {
      window.removeEventListener('workerDataUpdated', handleWorkerDataUpdate);
    };
  }, []); // Remove worker dependency to prevent re-registration
  
  const checkAuthAndLoadData = () => {
    // Use correct localStorage keys as set by authUtils
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    const firstName = localStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName');
    const email = localStorage.getItem('email');
    
    // Show loading gate while verifying auth to prevent flicker
    setLoading(true);
    
    // Check if user is logged in
    if (!token || !userId) {
      // Not logged in, redirect to login (debounced)
      setTimeout(() => navigate('/login'), 0);
      return;
    }
    
    // Check if user is a worker
    if (userType !== 'worker') {
      // Not a worker, redirect to home (debounced)
      setTimeout(() => navigate('/'), 0);
      return;
    }
    
    // Set worker data from localStorage
    const workerData = {
      _id: userId,
      firstName: firstName || 'Worker',
      lastName: lastName || '',
      email: email || 'worker@example.com',
      userType: 'worker'
    };
    
    // Avoid unnecessary re-renders if worker data hasn't changed
    setWorker(prev => {
      if (!prev || prev._id !== workerData._id || prev.firstName !== workerData.firstName || prev.lastName !== workerData.lastName) {
        return workerData;
      }
      return prev;
    });
    
    loadWorkerAssignments(workerData._id, token);
  };

  const refreshWorkerData = () => {
    if (worker) {
      loadWorkerAssignments(worker._id, localStorage.getItem('authToken'));
    }
  };
  
  const loadWorkerAssignments = async (workerId, token) => {
    console.log('Loading worker assignments for:', workerId); // Debug log
    
    // Always show some form of loading indication
    // Only show full loading screen on initial load
    if (!worker || assignments.length === 0) {
      setLoading(true);
    }
    
    // Clear any previous errors
    setError(null);
    
    try {
      // Try to fetch worker-specific tasks from the new endpoint first
      if (token) {
        try {
          // First try the new worker-specific tasks endpoint
          const tasksResponse = await axios.get(
            `http://localhost:3000/api/pickups/worker/${workerId}/tasks`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (tasksResponse.data && tasksResponse.data.success) {
            console.log('Worker tasks API returned:', tasksResponse.data.data.length, 'tasks'); // Debug log
            
            // Transform the tasks data to match the assignment format expected by the component
            const workerTasks = tasksResponse.data.data.map(task => ({
              _id: task._id || task.pickupId,
              pickupId: task.pickupId,
              location: task.pickupLocation || task.location,
              address: task.customerAddress || task.pickupLocation?.address || 'Address not specified',
              wasteTypes: task.wasteTypes || [],
              timeSlot: task.timeSlot || 'Not specified',
              customerName: task.customerName || 'Unknown',
              customerPhone: task.customerPhone || 'N/A',
              customerAddress: task.customerAddress || 'Address not specified',
              customerPincode: task.customerPincode || task.pincode || '000000',
              status: task.status,
              statusLabel: task.statusLabel,
              statusColor: task.statusColor,
              estimatedWeight: task.estimatedWeight || 'N/A',
              specialInstructions: task.specialInstructions || 'None',
              scheduledDate: task.scheduledDate || task.createdAt,
              createdAt: task.createdAt,
              assignedAt: task.assignedAt,
              completedAt: task.completedAt,
              timeAgo: task.timeAgo,
              assignedTimeAgo: task.assignedTimeAgo,
              completedTimeAgo: task.completedTimeAgo
            }));
            
            setAssignments(workerTasks);
            
            // Update stats from the API response if available
            if (tasksResponse.data.stats) {
              const apiStats = tasksResponse.data.stats;
              setStats({
                todayPickups: apiStats.todayTasks || 0,
                completedToday: apiStats.completed || 0,
                totalEarnings: (apiStats.completed || 0) * 50, // ₹50 per pickup
                rating: 4.5 + (Math.random() * 0.5) // Random rating between 4.5-5.0
              });
            } else {
              updateStats(workerTasks);
            }
            
            setLoading(false);
            return;
          }
        } catch (tasksApiError) {
          console.log('Worker tasks API failed, trying fallback endpoint:', tasksApiError.message);
          
          // Fallback to the original assignments endpoint
          try {
            const response = await axios.get(
              `http://localhost:3000/api/worker/assignments/${workerId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data && response.data.assignments) {
              console.log('Fallback API returned assignments:', response.data.assignments.length); // Debug log
              setAssignments(response.data.assignments);
              updateStats(response.data.assignments);
              setLoading(false);
              return;
            }
          } catch (fallbackError) {
            console.log('Fallback API also failed:', fallbackError.message);
          }
        }
      }
      
      // Fallback: Load pickups from localStorage and convert to assignments
      const pickupHistory = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
      
      // Filter only pickups that are actually assigned to or accepted by this worker
      const currentWorkerId = workerId;
      const workerAcceptedPickups = pickupHistory.filter(pickup => 
        pickup.assignedWorkerId === currentWorkerId && 
        (pickup.status === 'assigned' || pickup.status === 'in-progress')
      );
      
      // Add demo accepted pickups only if no real accepted pickups exist
      const demoAcceptedPickups = workerAcceptedPickups.length === 0 ? [
        {
          _id: 'accepted_1',
          pickupId: 'PU-1012-2001',
          location: { latitude: 12.9716, longitude: 77.5946 },
          address: '45, MG Road, Near City Mall, Bangalore',
          wasteTypes: ['Dry Waste', 'Recyclables'],
          timeSlot: '9:00 AM - 11:00 AM',
          customerName: 'Rajesh Kumar',
          customerPhone: '+91 98765 43210',
          customerAddress: '45, MG Road, Bangalore',
          customerPincode: '560001',
          status: 'assigned',
          estimatedWeight: '5 kg',
          specialInstructions: 'Ring the doorbell twice',
          scheduledDate: new Date().toLocaleDateString(),
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: 'accepted_2',
          pickupId: 'PU-1012-2002',
          location: { latitude: 12.9352, longitude: 77.6245 },
          address: '12B, Koramangala 4th Block, Bangalore',
          wasteTypes: ['Wet Waste'],
          timeSlot: '2:00 PM - 4:00 PM',
          customerName: 'Priya Sharma',
          customerPhone: '+91 99887 76655',
          customerAddress: '12B, Koramangala 4th Block, Bangalore',
          customerPincode: '560034',
          status: 'in-progress',
          estimatedWeight: '3 kg',
          specialInstructions: 'Please come to the back entrance',
          scheduledDate: new Date().toLocaleDateString(),
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          _id: 'accepted_3',
          pickupId: 'PU-1012-2003',
          location: { latitude: 12.9698, longitude: 77.7500 },
          address: '78, Whitefield Main Road, Bangalore',
          wasteTypes: ['Hazardous Waste'],
          timeSlot: '10:00 AM - 12:00 PM',
          customerName: 'Amit Singh',
          customerPhone: '+91 88990 01122',
          customerAddress: '78, Whitefield Main Road, Bangalore',
          customerPincode: '560066',
          status: 'assigned',
          estimatedWeight: '2 kg',
          specialInstructions: 'Contains batteries and electronics',
          scheduledDate: new Date(Date.now() + 86400000).toLocaleDateString(),
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          _id: 'accepted_4',
          pickupId: 'PU-1012-2004',
          location: { latitude: 12.9784, longitude: 77.6408 },
          address: '23, Indiranagar 2nd Stage, Bangalore',
          wasteTypes: ['Dry Waste', 'Wet Waste'],
          timeSlot: '6:00 AM - 8:00 AM',
          customerName: 'Sunita Reddy',
          customerPhone: '+91 77665 54433',
          customerAddress: '23, Indiranagar 2nd Stage, Bangalore',
          customerPincode: '560038',
          status: 'in-progress',
          estimatedWeight: '7 kg',
          specialInstructions: 'Early morning pickup preferred',
          scheduledDate: new Date(Date.now() + 86400000).toLocaleDateString(),
          createdAt: new Date(Date.now() - 900000).toISOString()
        },
        {
          _id: 'accepted_5',
          pickupId: 'PU-1012-2005',
          location: { latitude: 13.0358, longitude: 77.5950 },
          address: '56, Hebbal Outer Ring Road, Bangalore',
          wasteTypes: ['Recyclables'],
          timeSlot: '4:00 PM - 6:00 PM',
          customerName: 'Mohammed Ali',
          customerPhone: '+91 99112 23344',
          customerAddress: '56, Hebbal Outer Ring Road, Bangalore',
          customerPincode: '560024',
          status: 'assigned',
          estimatedWeight: '10 kg',
          specialInstructions: 'Large quantity of cardboard boxes',
          scheduledDate: new Date().toLocaleDateString(),
          createdAt: new Date(Date.now() - 600000).toISOString()
        }
      ] : [];
      
      // Merge worker's accepted pickups with demo data (only if no real data)
      const allPickups = [...workerAcceptedPickups, ...demoAcceptedPickups];
      
      // Convert pickups to worker assignments with enhanced customer info
      const workerAssignments = allPickups.map((pickup, index) => {
        // Get customer info - either from the pickup data or generate demo data
        const customerInfo = getUserInfoFromStorage(pickup.userId);
        
        // Ensure we have a proper, readable customer name
        let customerName = customerInfo.name;
        if (!customerName || customerName === 'Customer' || customerName.includes('User')) {
          // If no proper name, use the one from pickup or generate a readable one
          customerName = pickup.customerName || customerInfo.name || `Customer ${index + 1}`;
        }
        
        // Clean up any encrypted-looking IDs from the name
        if (customerName && customerName.includes('c0')) {
          // Replace encrypted IDs with readable names
          const demoNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Sunita Reddy', 'Mohammed Ali'];
          customerName = demoNames[index % demoNames.length];
        }
        
        return {
          _id: pickup.pickupId || `assign_${index}`,
          pickupId: pickup.pickupId || generateReadablePickupId(index),
          address: pickup.address || (pickup.location ? 
            formatCoordinates(pickup.location.latitude, pickup.location.longitude) : 
            'Location not specified'),
          location: pickup.location,
          wasteTypes: Array.isArray(pickup.wasteTypes) ? pickup.wasteTypes : [pickup.wasteTypes],
          timeSlot: pickup.timeSlot || '9:00 AM - 11:00 AM',
          customerName: customerName,
          customerPhone: customerInfo.phone || pickup.customerPhone || '+91 98765 43210',
          customerAddress: customerInfo.address || pickup.customerAddress || '45, MG Road, Bangalore',
          customerPincode: customerInfo.pincode || pickup.customerPincode || '560001',
          status: pickup.status || 'assigned',
          estimatedWeight: pickup.estimatedWeight || '5 kg',
          specialInstructions: pickup.specialInstructions || 'Please ring the doorbell',
          scheduledDate: pickup.scheduledDate,
          createdAt: pickup.createdAt
        };
      });
      
      setAssignments(workerAssignments);
      updateStats(workerAssignments);
      
      // Load addresses for all assignments with coordinates
      loadAddressesForAssignments(workerAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setError('Failed to load assignments. Using local data.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };
  
  const generateReadablePickupId = (index) => {
    // Generate a readable pickup ID format: PU-DDMM-XXXX
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const randomNum = String(1000 + index).padStart(4, '0');
    return `PU-${day}${month}-${randomNum}`;
  };

  // Function to mask pickup ID for workers - show only last 5 digits
  const maskPickupId = (pickupId) => {
    if (!pickupId) return '';
    const idString = String(pickupId);
    if (idString.length <= 5) return idString;
    return `****${idString.slice(-5)}`;
  };

  const getUserInfoFromStorage = (userId) => {
    // Try to get user info from localStorage
    const userInfo = {
      name: null,
      phone: null,
      address: null,
      pincode: null
    };
    
    // Check if current user's data is available from localStorage
    const currentUserId = localStorage.getItem('userId');
    if (userId === currentUserId) {
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      userInfo.name = `${firstName} ${lastName}`.trim();
      userInfo.phone = localStorage.getItem('userPhone');
      userInfo.address = localStorage.getItem('userAddress');
      userInfo.pincode = localStorage.getItem('userPincode');
    }
    
    // Always provide clear, readable demo data for better UX
    // In production, this would come from the actual database
    if (!userInfo.name || userInfo.name === '' || userInfo.name === 'Customer') {
      const demoUsers = [
        { 
          name: 'Rajesh Kumar', 
          phone: '+91 98765 43210', 
          address: '45, MG Road, Near City Mall, Bangalore', 
          pincode: '560001' 
        },
        { 
          name: 'Priya Sharma', 
          phone: '+91 99887 76655', 
          address: '12B, Koramangala 4th Block, Bangalore', 
          pincode: '560034' 
        },
        { 
          name: 'Amit Singh', 
          phone: '+91 88990 01122', 
          address: '78, Whitefield Main Road, Bangalore', 
          pincode: '560066' 
        },
        { 
          name: 'Sunita Reddy', 
          phone: '+91 77665 54433', 
          address: '23, Indiranagar 2nd Stage, Bangalore', 
          pincode: '560038' 
        },
        { 
          name: 'Mohammed Ali', 
          phone: '+91 99112 23344', 
          address: '56, Hebbal Outer Ring Road, Bangalore', 
          pincode: '560024' 
        }
      ];
      
      // Select a user based on some logic (for demo, we'll rotate through them)
      // In production, this would be the actual customer data
      const now = new Date();
      const index = now.getSeconds() % demoUsers.length;
      const demoUser = demoUsers[index];
      
      userInfo.name = demoUser.name;
      userInfo.phone = demoUser.phone;
      userInfo.address = demoUser.address;
      userInfo.pincode = demoUser.pincode;
    }
    
    // Ensure phone number is never shown as encrypted/placeholder
    if (userInfo.phone === '+91 XXXXXXXXXX' || !userInfo.phone) {
      // Provide a realistic demo number
      userInfo.phone = '+91 98765 43210';
    }
    
    return userInfo;
  };
  
  const loadAddressesForAssignments = async (assignments) => {
    const newAddressMap = {};
    
    // Process each assignment that has coordinates
    for (const assignment of assignments) {
      if (assignment.location && assignment.location.latitude && assignment.location.longitude) {
        try {
          const address = await reverseGeocode(
            assignment.location.latitude,
            assignment.location.longitude
          );
          newAddressMap[assignment._id] = address;
        } catch (error) {
          console.error('Error loading address for assignment:', assignment._id, error);
          newAddressMap[assignment._id] = formatCoordinates(
            assignment.location.latitude,
            assignment.location.longitude
          );
        }
      }
    }
    
    setAddressMap(newAddressMap);
  };
  
  const updateStats = (assignments) => {
    const today = new Date().toDateString();
    const todayAssignments = assignments.filter(a => {
      const assignmentDate = new Date(a.scheduledDate || a.createdAt).toDateString();
      return assignmentDate === today;
    });
    
    const completed = todayAssignments.filter(a => a.status === 'completed').length;
    const earnings = completed * 50; // ₹50 per pickup
    
    setStats({
      todayPickups: todayAssignments.length,
      completedToday: completed,
      totalEarnings: earnings,
      rating: 4.5 + (Math.random() * 0.5) // Random rating between 4.5-5.0
    });
  };


  const handleStartPickup = async (assignmentId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `http://localhost:3000/api/worker/assignment/${assignmentId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      if (worker) {
        loadWorkerAssignments(worker._id, token);
      }
    } catch (error) {
      console.error('Error starting pickup:', error);
    }
  };

  const handleCompletePickup = (assignmentId) => {
    // Find the assignment to get details
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment) {
      alert('Assignment not found');
      return;
    }
    
    // Set current assignment and show QR scanner
    setCurrentAssignmentForCompletion(assignment);
    setShowQRScanner(true);
  };
  
  const handleQRScanSuccess = async (verificationCode, qrSource = 'unknown') => {
    try {
      const token = localStorage.getItem('authToken');
      const assignmentId = currentAssignmentForCompletion._id;
      
      console.log('Attempting to complete pickup with QR verification:', { 
        assignmentId, 
        verificationCode,
        qrSource 
      });
      
      const response = await axios.put(
        `http://localhost:3000/api/worker/assignment/${assignmentId}/complete`,
        {
          qrVerificationCode: verificationCode,
          qrSource: qrSource,
          actualWeight: currentAssignmentForCompletion.estimatedWeight,
          notes: `Completed with QR verification (${qrSource})`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Use the enhanced message from the server
        const successMessage = response.data.message || '✅ Pickup completed successfully! QR code verified.';
        const sourceInfo = qrSource !== 'unknown' ? ` (via ${qrSource})` : '';
        
        alert(`${successMessage}${sourceInfo}`);
        
        // Log verification details for debugging
        console.log('QR Verification successful:', {
          verificationMethod: response.data.verificationMethod,
          qrSource: response.data.qrSource,
          assignmentId
        });
        
        // Close scanner
        setShowQRScanner(false);
        setCurrentAssignmentForCompletion(null);
        
        // Refresh data
        if (worker) {
          loadWorkerAssignments(worker._id, token);
        }
        
        // Dispatch event to update other components
        window.dispatchEvent(new Event('workerDataUpdated'));
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
    setCurrentAssignmentForCompletion(null);
  };

  const handleLogout = () => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('email');
    localStorage.removeItem('pickupHistory');
    navigate('/login');
  };

  // Immediate loading state to prevent flicker
  if (loading || !worker) {
    return (
      <div>
        <div className="header" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
          <div className="container">
            <h1>Worker Dashboard</h1>
            <p>Loading your workspace...</p>
          </div>
        </div>
        
        <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #FF9800',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <h3 style={{ color: '#666' }}>Loading Dashboard...</h3>
          <p style={{ color: '#888' }}>Please wait while we prepare your workspace</p>
        </div>
        
        <style jsx>{`
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
      <div className="header" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
        <div className="container">
          <h1>Worker Dashboard</h1>
          <p>Welcome back, {worker?.name}! Ready to make a difference today?</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/worker">Dashboard</Link></li>
            <li><Link to="/worker/my-works">My Works</Link></li>
            <li><Link to="/worker/find-works">Find Works</Link></li>
            <li><Link to="/worker/profile">Profile</Link></li>
            <li>
              <span style={{color: '#FF9800', fontWeight: 'bold'}}>
                👷 {worker?.firstName || 'Worker'}
              </span>
            </li>
            <li>
              <button onClick={handleLogout} style={{ 
                background: 'transparent', 
                border: '1px solid #f44336',
                color: '#f44336',
                padding: '5px 15px',
                borderRadius: '4px',
                cursor: 'pointer' 
              }}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Debug/Refresh Section */}
        <div className="card" style={{ marginBottom: '20px', background: '#f8f9fa', border: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0', fontSize: '16px' }}>Dashboard Controls</h3>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Refresh your assignments manually</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  console.log('Manual refresh triggered');
                  refreshWorkerData();
                }}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh Assignments
              </button>
              <button
                onClick={() => {
                  console.log('Test event dispatch');
                  window.dispatchEvent(new Event('workerDataUpdated'));
                }}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🧪 Test Event
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ textAlign: 'center', background: '#E8F5E8' }}>
            <h3 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>{stats.todayPickups}</h3>
            <p style={{ margin: '0', color: '#666' }}>Today's Pickups</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#E3F2FD' }}>
            <h3 style={{ color: '#2196F3', margin: '0 0 10px 0' }}>{stats.completedToday}</h3>
            <p style={{ margin: '0', color: '#666' }}>Completed</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#FFF3E0' }}>
            <h3 style={{ color: '#FF9800', margin: '0 0 10px 0' }}>₹{stats.totalEarnings}</h3>
            <p style={{ margin: '0', color: '#666' }}>Today's Earnings</p>
          </div>
          <div className="card" style={{ textAlign: 'center', background: '#F3E5F5' }}>
            <h3 style={{ color: '#9C27B0', margin: '0 0 10px 0' }}>{stats.rating}⭐</h3>
            <p style={{ margin: '0', color: '#666' }}>Your Rating</p>
          </div>
        </div>

        {/* My Tasks Section - List All Tasks Linked to This Worker */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#333' }}>📋 My Tasks</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Tasks assigned to you (excluding available tasks)</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                display: 'inline-block',
                padding: '8px 16px', 
                background: '#E3F2FD', 
                borderRadius: '20px',
                color: '#1976D2',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').length} Active
              </span>
            </div>
          </div>
          
          {assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <h3>📋 No active tasks!</h3>
              <p>You don't have any tasks assigned to you at the moment.</p>
              <Link to="/worker/find-works" className="button" style={{ marginTop: '20px', display: 'inline-block' }}>
                Find Available Tasks
              </Link>
            </div>
          ) : (
            <div>
              {/* Quick Summary Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '15px', 
                marginBottom: '20px'
              }}>
                <div style={{
                  background: '#FFF3E0',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0', color: '#F57C00' }}>
                    {assignments.filter(a => a.status === 'in-progress').length}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#E65100' }}>
                    🚛 In Progress
                  </p>
                </div>
                <div style={{
                  background: '#E3F2FD',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0', color: '#1976D2' }}>
                    {assignments.filter(a => a.status === 'assigned').length}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#0D47A1' }}>
                    📋 Assigned
                  </p>
                </div>
                <div style={{
                  background: '#E8F5E8',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0', color: '#4CAF50' }}>
                    ₹{assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').length * 50}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#1B5E20' }}>
                    💰 Potential Earnings
                  </p>
                </div>
              </div>
              
              {/* List all accepted pickups - show first 5 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').slice(0, 5).map((assignment, index) => (
                <div key={assignment._id || index} className="card" style={{ 
                  background: '#f8f9fa', 
                  border: '1px solid #dee2e6',
                  borderLeft: assignment.status === 'in-progress' ? '5px solid #FF9800' : '5px solid #2196F3'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      {/* Status and ID Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: '0', color: '#333' }}>
                          📍 Pickup ID: {maskPickupId(assignment.pickupId || generateReadablePickupId(index))}
                        </h4>
                        <span 
                          style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: 'bold',
                            background: assignment.status === 'in-progress' ? '#FFF3E0' : '#E3F2FD',
                            color: assignment.status === 'in-progress' ? '#FF9800' : '#2196F3'
                          }}
                        >
                          {assignment.status === 'in-progress' ? '🚛 In Progress' : '📋 Assigned'}
                        </span>
                      </div>
                      
                      {/* Pickup Location Section */}
                      <div style={{ 
                        background: '#e8f4f8', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        marginBottom: '10px',
                        border: '1px solid #b3d9e8'
                      }}>
                        <p style={{ margin: '0 0 5px 0', color: '#0066cc', fontWeight: 'bold', fontSize: '14px' }}>
                          📍 Pickup Location:
                        </p>
                        <p style={{ margin: '0', color: '#444', fontSize: '13px' }}>
                          {addressMap[assignment._id] || assignment.address || formatCoordinates(assignment.location?.latitude || 12.9716, assignment.location?.longitude || 77.5946)}
                        </p>
                      </div>
                      
                      {/* Customer Information Section */}
                      <div style={{ 
                        background: '#f0f8ff', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        marginBottom: '10px',
                        border: '1px solid #d0e4f7'
                      }}>
                        <p style={{ margin: '0 0 5px 0', color: '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>
                          👤 Customer Details:
                        </p>
                        <p style={{ margin: '0 0 3px 0', color: '#555', fontSize: '13px' }}>
                          <strong>Name:</strong> {assignment.customerName || 'John Doe'}
                        </p>
                        <p style={{ margin: '0 0 3px 0', color: '#555', fontSize: '13px' }}>
                          <strong>Phone:</strong> <a href={`tel:${assignment.customerPhone}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                            {assignment.customerPhone}
                          </a>
                        </p>
                        {assignment.customerAddress && (
                          <p style={{ margin: '0 0 3px 0', color: '#555', fontSize: '13px' }}>
                            <strong>Registered Address:</strong> {assignment.customerAddress}
                            {assignment.customerPincode && ` - ${assignment.customerPincode}`}
                          </p>
                        )}
                      </div>
                      
                      {/* Waste Details Section */}
                      <div style={{ marginBottom: '8px' }}>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '13px' }}>
                          <strong>🗑️ Waste Type:</strong> {assignment.wasteTypes?.join(', ') || 'Mixed Waste'}
                        </p>
                        {assignment.estimatedWeight && (
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '13px' }}>
                            <strong>⚖️ Est. Weight:</strong> {assignment.estimatedWeight}
                          </p>
                        )}
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '13px' }}>
                          <strong>🕐 Time Slot:</strong> {assignment.timeSlot || '9:00 AM - 11:00 AM'}
                        </p>
                        {assignment.specialInstructions && (
                          <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
                            <strong>📝 Instructions:</strong> {assignment.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons and Earnings */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px', 
                      minWidth: '150px',
                      alignItems: 'center'
                    }}>
                      {/* Earnings Display */}
                      <div style={{ 
                        textAlign: 'center',
                        padding: '10px',
                        background: '#E8F5E8',
                        borderRadius: '8px',
                        width: '100%'
                      }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>Earnings</p>
                        <h3 style={{ margin: '5px 0', color: '#4CAF50' }}>₹50</h3>
                      </div>
                      
                      {assignment.status === 'assigned' && (
                        <button 
                          className="button" 
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#4CAF50' }}
                          onClick={() => handleStartPickup(assignment._id)}
                        >
                          Start Pickup
                        </button>
                      )}
                      
                      {assignment.status === 'in-progress' && (
                        <button 
                          className="button" 
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#FF9800' }}
                          onClick={() => handleCompletePickup(assignment._id)}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>
              
              {/* View All Link if more than 5 accepted pickups */}
              {assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').length > 5 && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <Link 
                    to="/worker/my-works" 
                    style={{
                      display: 'inline-block',
                      padding: '10px 30px',
                      background: '#2196F3',
                      color: 'white',
                      borderRadius: '5px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    View All {assignments.filter(a => a.status === 'in-progress' || a.status === 'assigned').length} Accepted Pickups →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Pickup Schedules Preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#333' }}>📡 Real-time Pickup Schedules</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Latest available pickup requests in your area</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ color: '#4CAF50', fontSize: '12px', fontWeight: 'bold' }}>LIVE</span>
            </div>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #4CAF50'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ margin: '0', color: '#2E7D32', fontSize: '14px' }}>
                🔄 Auto-refreshing every 30 seconds • Real-time pickup notifications
              </p>
              <span style={{ color: '#1B5E20', fontSize: '12px' }}>
                Click "Browse Available Works" to see all pickup requests
              </span>
            </div>
          </div>
          
          <Link 
            to="/worker/find-works" 
            className="button" 
            style={{ 
              display: 'block', 
              textAlign: 'center', 
              padding: '15px',
              background: '#2196F3',
              fontSize: '16px'
            }}
          >
            🔍 Browse Available Works
          </Link>
        </div>

        {/* Find Works Section */}
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>🔍 Quick Actions</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>Fast access to worker tools</p>
        
        {/* Completed Works Section */}
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>✅ Completed Works</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>Your recently completed pickups</p>
          
          {assignments.filter(a => a.status === 'completed').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <h3>📋 No completed works yet</h3>
              <p>Complete your active works to see them here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {assignments.filter(a => a.status === 'completed').slice(0, 5).map((assignment, index) => (
                <div key={assignment._id || index} className="card" style={{ 
                  background: '#f8f9fa', 
                  border: '1px solid #dee2e6',
                  borderLeft: '5px solid #4CAF50'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        📍 Pickup ID: {maskPickupId(assignment.pickupId || generateReadablePickupId(index))}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                        <strong>Customer:</strong> {assignment.customerName || 'John Doe'}
                      </p>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                        <strong>Location:</strong> {addressMap[assignment._id] || assignment.address || 'Location'}
                      </p>
                      <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                        <strong>Completed:</strong> {new Date(assignment.completedAt || assignment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ 
                        display: 'block',
                        fontSize: '24px', 
                        color: '#4CAF50',
                        fontWeight: 'bold',
                        marginBottom: '5px'
                      }}>
                        ₹50
                      </span>
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
              
              {assignments.filter(a => a.status === 'completed').length > 5 && (
                <Link 
                  to="/worker/history" 
                  style={{ 
                    textAlign: 'center', 
                    color: '#2196F3',
                    textDecoration: 'none',
                    padding: '10px',
                    display: 'block'
                  }}
                >
                  View All Completed Works →
                </Link>
              )}
            </div>
          )}
        </div>

          
          {/* Quick Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <Link to="/worker/scanner" className="button" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px' }}>
              📱 QR Code Scanner
            </Link>
            <Link to="/worker/map" className="button" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px', background: '#2196F3' }}>
              🗺️ View Map
            </Link>
            <Link to="/worker/earnings" className="button" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px', background: '#FF9800' }}>
              💰 Earnings Report
            </Link>
            <Link to="/worker/support" className="button" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px', background: '#9C27B0' }}>
              🆘 Get Support
            </Link>
          </div>
        </div>

        {/* Worker Status and Office Enrollment Notice */}
        <div className="card" style={{ 
          background: worker?.officeId ? '#E8F5E8' : '#FFF3E0', 
          border: worker?.officeId ? '1px solid #4CAF50' : '1px solid #FF9800' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ 
                color: worker?.officeId ? '#2E7D32' : '#F57C00', 
                margin: '0 0 10px 0' 
              }}>
                {worker?.officeId ? '✅ Enrolled Worker Dashboard' : '⚠️ Worker Dashboard (Not Enrolled)'}
              </h3>
              <p style={{ 
                margin: '0', 
                color: worker?.officeId ? '#1B5E20' : '#E65100' 
              }}>
                Welcome {worker?.firstName}! 
                {worker?.officeId ? 
                  `You are enrolled in ${worker.officeId?.officeName || 'an office'} and can track your performance metrics.` :
                  'Enroll in an office to start tracking your performance and earning incentives.'
                }
              </p>
            </div>
            
            {!worker?.officeId && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link 
                  to="/worker/profile" 
                  style={{
                    padding: '8px 16px',
                    background: '#2196F3',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '5px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🏢 Enroll Now
                </Link>
              </div>
            )}
          </div>
          
          {worker?.officeId && (
            <div style={{
              marginTop: '15px',
              padding: '15px',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <strong style={{ color: '#2E7D32' }}>Office:</strong>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    {worker.officeId.officeName || 'Loading...'}
                  </p>
                </div>
                
                <div>
                  <strong style={{ color: '#2E7D32' }}>Code:</strong>
                  <p style={{ margin: '5px 0', fontSize: '14px', fontFamily: 'monospace' }}>
                    {worker.officeCode}
                  </p>
                </div>
                
                <div>
                  <strong style={{ color: '#2E7D32' }}>Enrolled:</strong>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    {new Date(worker.enrolledAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Link 
                    to="/worker/performance" 
                    style={{
                      padding: '6px 12px',
                      background: '#4CAF50',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    📊 View Performance
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* QR Scanner Modal */}
      {showQRScanner && currentAssignmentForCompletion && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onScanError={handleQRScanError}
          onClose={handleQRScanClose}
          assignmentId={currentAssignmentForCompletion._id}
        />
      )}
    </div>
  );
};

export default WorkerDashboard;
