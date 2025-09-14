import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import authUtils from '../utils/authUtils';
import SimpleQRCode from './SimpleQRCode';
import { reverseGeocode, formatCoordinates } from '../utils/geocodingUtils';
import pickupSyncService from '../services/pickupSyncService';

const MyPickupsScreen = () => {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState([]);
  const [filteredPickups, setFilteredPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [addressMap, setAddressMap] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0
  });

  useEffect(() => {
    // Check if user is logged in
    if (!authUtils.isLoggedIn()) {
      navigate('/login');
      return;
    }
    loadPickups();
    
    // Listen for sync events to refresh data
    const handlePickupDataSynced = (event) => {
      console.log('📥 Received pickup data sync event, refreshing...');
      if (event.detail && event.detail.pickups) {
        setPickups(event.detail.pickups);
      } else {
        // Fallback to reload from localStorage if event data is not available
        loadPickups();
      }
    };
    
    window.addEventListener('pickupDataSynced', handlePickupDataSynced);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('pickupDataSynced', handlePickupDataSynced);
    };
  }, [navigate]);

  useEffect(() => {
    filterPickups(selectedFilter);
    calculateStats();
  }, [pickups, selectedFilter]);

  const loadPickups = async () => {
    try {
      setLoading(true);
      
      // Always try to load from API first for the most up-to-date data
      try {
        const token = authUtils.getToken();
        const userId = localStorage.getItem('userId');
        
        console.log('Loading pickup history for user:', userId);
        
        const response = await axios.get(
          `http://localhost:3000/api/pickups/user/${userId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (response.data.success) {
          const apiPickups = response.data.data || [];
          console.log(`✅ Loaded ${apiPickups.length} pickups from database`);
          
          // Get local pickups for comparison/merging
          const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
          
          // Prioritize API data, but merge with local data for any pickups that might not be synced yet
          const mergedPickups = [...apiPickups];
          
          // Add any local pickups that aren't in the API response (recently created, not yet synced)
          localPickups.forEach(localPickup => {
            const existsInApi = apiPickups.find(apiPickup => apiPickup.pickupId === localPickup.pickupId);
            if (!existsInApi) {
              console.log('Adding unsynced local pickup to display:', localPickup.pickupId);
              mergedPickups.push(localPickup);
            }
          });
          
          // Remove duplicates based on pickupId (API data takes precedence)
          const uniquePickups = mergedPickups.filter((pickup, index, self) =>
            index === self.findIndex((p) => p.pickupId === pickup.pickupId)
          );
          
          // Sort by creation date (newest first)
          uniquePickups.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.scheduledDate || 0);
            const dateB = new Date(b.createdAt || b.scheduledDate || 0);
            return dateB - dateA;
          });
          
          setPickups(uniquePickups);
          
          // Update localStorage with the merged data for offline access
          localStorage.setItem('pickupHistory', JSON.stringify(uniquePickups));
          
          // Display stats if available
          if (response.data.stats) {
            setStats(response.data.stats);
          }
          
          // Load addresses for pickups with coordinates
          loadAddressesForPickups(uniquePickups);
          
          console.log(`✅ Successfully loaded and merged ${uniquePickups.length} total pickups`);
          return; // Success, don't fall back to localStorage only
        }
      } catch (apiError) {
        console.log('API not available, using local storage');
        
        // Fallback to localStorage - get the actual scheduled pickups
        const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
        
        // Add mock data only if there are no real pickups
        const mockPickups = localPickups.length === 0 ? [
          {
            pickupId: 'PU17337891234561',
            userId: localStorage.getItem('userId') || 'GUEST',
            wasteTypes: ['Dry Waste', 'Recyclables'],
            estimatedWeight: '5 kg',
            timeSlot: '10:00 AM - 2:00 PM',
            scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            status: 'completed',
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            workerName: 'Rajesh Kumar',
            workerRating: 4.5,
            actualWeight: '4.8 kg',
            feedback: 'Pickup completed successfully'
          },
          {
            pickupId: 'PU17337891234562',
            userId: localStorage.getItem('userId') || 'GUEST',
            wasteTypes: ['Wet Waste'],
            estimatedWeight: '3 kg',
            timeSlot: '6:00 AM - 10:00 AM',
            scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            status: 'rejected',
            rejectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            rejectionReason: 'Waste not properly segregated - found plastic mixed with wet waste',
            workerName: 'Amit Singh',
            suggestions: 'Please ensure proper segregation before next pickup'
          },
          {
            pickupId: 'PU17337891234563',
            userId: localStorage.getItem('userId') || 'GUEST',
            wasteTypes: ['Dry Waste', 'Wet Waste'],
            estimatedWeight: '7 kg',
            timeSlot: '2:00 PM - 6:00 PM',
            scheduledDate: new Date().toLocaleDateString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            assignedWorker: 'Priya Sharma',
            estimatedArrival: '30 minutes',
            location: {
              latitude: 28.6139,
              longitude: 77.2090
            }
          },
          {
            pickupId: 'PU17337891234564',
            userId: localStorage.getItem('userId') || 'GUEST',
            wasteTypes: ['Hazardous Waste'],
            estimatedWeight: '2 kg',
            timeSlot: '10:00 AM - 2:00 PM',
            scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            specialInstructions: 'Contains old batteries and electronic waste'
          },
          ...localPickups
        ] : localPickups;  // Only add mock data if no real pickups exist
        
        // Remove duplicates based on pickupId
        const uniquePickups = mockPickups.filter((pickup, index, self) =>
          index === self.findIndex((p) => p.pickupId === pickup.pickupId)
        );
        
        // Sort pickups by creation date (newest first)
        uniquePickups.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.scheduledDate);
          const dateB = new Date(b.createdAt || b.scheduledDate);
          return dateB - dateA;
        });
        
        setPickups(uniquePickups);
        
        // Load addresses for pickups with coordinates
        loadAddressesForPickups(uniquePickups);
      }
    } catch (error) {
      console.error('Error loading pickups:', error);
      setPickups([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadAddressesForPickups = async (pickupList) => {
    const newAddressMap = {};
    
    for (const pickup of pickupList) {
      // Check if pickup already has an address
      if (pickup.address) {
        newAddressMap[pickup.pickupId] = pickup.address;
      } 
      // Otherwise, if it has coordinates, reverse geocode them
      else if (pickup.location && pickup.location.latitude && pickup.location.longitude) {
        try {
          const address = await reverseGeocode(
            pickup.location.latitude,
            pickup.location.longitude
          );
          newAddressMap[pickup.pickupId] = address;
        } catch (error) {
          console.error('Error loading address for pickup:', pickup.pickupId, error);
          newAddressMap[pickup.pickupId] = formatCoordinates(
            pickup.location.latitude,
            pickup.location.longitude
          );
        }
      }
    }
    
    setAddressMap(newAddressMap);
  };

  const filterPickups = (filter) => {
    if (filter === 'all') {
      setFilteredPickups(pickups);
    } else {
      setFilteredPickups(pickups.filter(pickup => pickup.status === filter));
    }
  };

  const calculateStats = () => {
    const newStats = {
      total: pickups.length,
      pending: pickups.filter(p => p.status === 'pending').length,
      completed: pickups.filter(p => p.status === 'completed' || p.status === 'confirmed').length,
      rejected: pickups.filter(p => p.status === 'rejected' || p.status === 'cancelled').length
    };
    setStats(newStats);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return '#FFC107'; // Yellow/Amber
      case 'completed':
        return '#4CAF50'; // Green
      case 'rejected':
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return '⏳';
      case 'completed':
        return '✅';
      case 'rejected':
      case 'cancelled':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleViewQRCode = (pickup) => {
    setSelectedPickup(pickup);
    setShowQRModal(true);
  };

  const handleCancelPickup = async (pickupId) => {
    if (!window.confirm('Are you sure you want to cancel this pickup?')) {
      return;
    }

    try {
      const token = authUtils.getToken();
      
      // Try API call
      try {
        await axios.delete(
          `http://localhost:3000/api/pickups/${pickupId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
      } catch (apiError) {
        console.log('API not available, updating local storage');
      }
      
      // Update local state
      const updatedPickups = pickups.map(p => 
        p.pickupId === pickupId 
          ? { ...p, status: 'cancelled', cancelledAt: new Date().toISOString() }
          : p
      );
      setPickups(updatedPickups);
      
      // Update localStorage
      localStorage.setItem('pickupHistory', JSON.stringify(updatedPickups));
      
      alert('Pickup cancelled successfully');
    } catch (error) {
      console.error('Error cancelling pickup:', error);
      alert('Failed to cancel pickup');
    }
  };

  const renderPickupCard = (pickup) => {
    const statusColor = getStatusColor(pickup.status);
    const statusIcon = getStatusIcon(pickup.status);
    const isPending = pickup.status === 'pending' || pickup.status === 'confirmed';
    const isRejected = pickup.status === 'rejected';
    
    return (
      <div key={pickup.pickupId} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderLeft: `5px solid ${statusColor}`,
        position: 'relative'
      }}>
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: statusColor,
          color: 'white',
          padding: '5px 15px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          {statusIcon} {formatStatus(pickup.status)}
        </div>

        {/* Pickup ID and Date */}
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
            Pickup #{pickup.pickupId}
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Scheduled: {pickup.scheduledDate} | {pickup.timeSlot}
          </p>
        </div>

        {/* Waste Types */}
        <div style={{ marginBottom: '15px' }}>
          <strong>Waste Types:</strong>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {pickup.wasteTypes.map((type, index) => (
              <span key={index} style={{
                background: '#E3F2FD',
                color: '#1976D2',
                padding: '4px 12px',
                borderRadius: '15px',
                fontSize: '14px'
              }}>
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Location Information */}
        {(addressMap[pickup.pickupId] || pickup.address || pickup.location) && (
          <div style={{ marginBottom: '15px' }}>
            <strong>📍 Pickup Location:</strong>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              {addressMap[pickup.pickupId] || 
               pickup.address || 
               (pickup.location ? formatCoordinates(pickup.location.latitude, pickup.location.longitude) : 'Not specified')}
            </p>
          </div>
        )}

        {/* Weight Information */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '30px' }}>
          <div>
            <strong>Estimated Weight:</strong> {pickup.estimatedWeight}
          </div>
          {pickup.actualWeight && (
            <div>
              <strong>Actual Weight:</strong> {pickup.actualWeight}
            </div>
          )}
        </div>

        {/* Worker Information */}
        {pickup.workerName && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Worker:</strong> {pickup.workerName}
            {pickup.workerRating && (
              <span style={{ marginLeft: '10px', color: '#FFB400' }}>
                ⭐ {pickup.workerRating}
              </span>
            )}
          </div>
        )}

        {/* Rejection Reason */}
        {isRejected && pickup.rejectionReason && (
          <div style={{
            background: '#FFEBEE',
            border: '1px solid #FFCDD2',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#C62828', fontWeight: 'bold' }}>
              ❌ Rejection Reason:
            </p>
            <p style={{ margin: '0 0 10px 0', color: '#D32F2F' }}>
              {pickup.rejectionReason}
            </p>
            {pickup.suggestions && (
              <p style={{ margin: 0, color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                💡 Suggestion: {pickup.suggestions}
              </p>
            )}
          </div>
        )}

        {/* Pending Status Info */}
        {isPending && (
          <div style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            {pickup.assignedWorker && (
              <p style={{ margin: '0 0 8px 0', color: '#F57C00' }}>
                🚛 Assigned to: <strong>{pickup.assignedWorker}</strong>
              </p>
            )}
            {pickup.estimatedArrival && (
              <p style={{ margin: 0, color: '#F57C00' }}>
                ⏱️ Estimated Arrival: <strong>{pickup.estimatedArrival}</strong>
              </p>
            )}
          </div>
        )}

        {/* Completed Status Info */}
        {pickup.status === 'completed' && pickup.feedback && (
          <div style={{
            background: '#E8F5E9',
            border: '1px solid #C8E6C9',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <p style={{ margin: 0, color: '#2E7D32' }}>
              ✅ {pickup.feedback}
            </p>
          </div>
        )}

        {/* Special Instructions */}
        {pickup.specialInstructions && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Special Instructions:</strong>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              {pickup.specialInstructions}
            </p>
          </div>
        )}

        {/* Waste Images */}
        {pickup.wasteImages && pickup.wasteImages.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Waste Images:</strong>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '10px',
              marginTop: '10px'
            }}>
              {pickup.wasteImages.slice(0, 3).map((img, index) => (
                <div key={index} style={{
                  position: 'relative',
                  paddingBottom: '100%',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #ddd'
                }}>
                  <img
                    src={img.url || img}
                    alt={`Waste ${index + 1}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onClick={() => window.open(img.url || img, '_blank')}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}>
                    Image {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {isPending && (
            <>
              <button
                onClick={() => handleViewQRCode(pickup)}
                style={{
                  padding: '8px 20px',
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
                📱 View QR Code
              </button>
              <button
                onClick={() => handleCancelPickup(pickup.pickupId)}
                style={{
                  padding: '8px 20px',
                  background: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel Pickup
              </button>
            </>
          )}
          
          {pickup.status === 'completed' && (
            <button
              style={{
                padding: '8px 20px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ⭐ Rate Service
            </button>
          )}
          
          {isRejected && (
            <button
              onClick={() => navigate('/schedule')}
              style={{
                padding: '8px 20px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Reschedule Pickup
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>My Pickups</h1>
          <p>Track and manage all your waste pickup requests</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/schedule">Schedule Pickup</Link></li>
            <li><Link to="/pickups">My Pickups</Link></li>
            <li><Link to="/training">Training</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderTop: '4px solid #2196F3'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2196F3', fontSize: '36px' }}>
              {stats.total}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Pickups</p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderTop: '4px solid #FFC107'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#FFC107', fontSize: '36px' }}>
              {stats.pending}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Pending</p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderTop: '4px solid #4CAF50'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50', fontSize: '36px' }}>
              {stats.completed}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Completed</p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderTop: '4px solid #F44336'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#F44336', fontSize: '36px' }}>
              {stats.rejected}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Rejected</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '10px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '10px',
          overflowX: 'auto'
        }}>
          {['all', 'pending', 'completed', 'rejected'].map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              style={{
                padding: '10px 25px',
                background: selectedFilter === filter ? '#2196F3' : 'transparent',
                color: selectedFilter === filter ? 'white' : '#666',
                border: selectedFilter === filter ? 'none' : '1px solid #ddd',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedFilter === filter ? 'bold' : 'normal',
                textTransform: 'capitalize',
                transition: 'all 0.3s ease'
              }}
            >
              {filter === 'all' ? 'All Pickups' : filter}
              {filter !== 'all' && (
                <span style={{ marginLeft: '5px' }}>
                  ({filter === 'pending' ? stats.pending : 
                    filter === 'completed' ? stats.completed : 
                    stats.rejected})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pickups List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Loading pickups...</p>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '50px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>No {selectedFilter === 'all' ? '' : selectedFilter} pickups found</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {selectedFilter === 'all' 
                ? "You haven't scheduled any pickups yet."
                : `You don't have any ${selectedFilter} pickups.`}
            </p>
            <Link to="/schedule" className="button">
              Schedule Your First Pickup
            </Link>
          </div>
        ) : (
          <div>
            {filteredPickups.map(renderPickupCard)}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedPickup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowQRModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <SimpleQRCode 
              data={selectedPickup}
              size={250}
              includeDetails={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPickupsScreen;
