import React, { useState, useEffect } from 'react';
import { locationService, LocationUtils } from '../utils/locationUtils';
import { geocode } from '../utils/geocodingUtils';

const LocationPickerEnhanced = ({ 
  onLocationChange, 
  initialLocation = null,
  style = {} 
}) => {
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [isLoading, setIsLoading] = useState(false);
  const [displayAddress, setDisplayAddress] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    } else {
      setCurrentLocation(initialLocation);
      setLocationStatus('Location set');
      if (initialLocation.address) {
        setDisplayAddress(initialLocation.address);
      }
    }
  }, [initialLocation]);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setLocationStatus('Getting your location...');
      
      const location = await locationService.getLocationWithFallback();
      
      setCurrentLocation(location);
      if (location.warning) {
        setLocationStatus(location.warning);
      } else {
        setLocationStatus('Location detected');
        // Try to get address
        try {
          const address = await locationService.getAddressFromCoordinates(
            location.latitude, 
            location.longitude
          );
          setDisplayAddress(address);
        } catch (error) {
          console.warn('Address lookup failed:', error.message);
        }
      }
      
      // Notify parent component
      if (onLocationChange) {
        onLocationChange(location);
      }
      
    } catch (error) {
      console.error('Location failed:', error);
      setLocationStatus('Location unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!manualAddress.trim()) return;
    
    try {
      setAddressLoading(true);
      const coords = await geocode(manualAddress.trim());
      
      if (!coords) {
        alert('Could not find that address. Please try a different format.');
        return;
      }
      
      const addressLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: 'ADDRESS',
        timestamp: Date.now(),
        accuracy: 1000,
        address: manualAddress.trim()
      };
      
      setCurrentLocation(addressLocation);
      setLocationStatus('Address set');
      setDisplayAddress(manualAddress.trim());
      setShowManualEntry(false);
      setManualAddress('');
      
      if (onLocationChange) {
        onLocationChange(addressLocation);
      }
      
    } catch (err) {
      console.error('Address geocoding failed:', err);
      alert('Failed to find that address. Please check the spelling and try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const containerStyle = {
    background: '#f0f8ff',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    ...style
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px' }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#333', fontSize: '16px' }}>Pickup Location:</strong>
            <button
              type="button"
              onClick={() => setShowManualEntry(!showManualEntry)}
              style={{
                padding: '6px 12px',
                background: '#8E24AA',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showManualEntry ? 'Cancel' : 'Manual Entry'}
            </button>
          </div>
          
          {displayAddress ? (
            <>
              <p style={{ margin: '8px 0 0 0', color: '#333', fontSize: '14px' }}>
                <strong>Address:</strong>
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                {displayAddress}
              </p>
            </>
          ) : currentLocation ? (
            <>
              <p style={{ margin: '8px 0 0 0', color: '#333', fontSize: '14px' }}>
                <strong>Coordinates:</strong>
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                {currentLocation.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
              </p>
            </>
          ) : (
            <p style={{ margin: '8px 0 0 0', color: '#999', fontStyle: 'italic', fontSize: '14px' }}>
              {locationStatus}
            </p>
          )}
        </div>
      </div>
      
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={isLoading}
        style={{
          padding: '8px 15px',
          background: isLoading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        🔄 {isLoading ? 'Updating...' : 'Update Location'}
      </button>

      {showManualEntry && (
        <form onSubmit={handleAddressSubmit} style={{
          marginTop: '15px', 
          padding: '15px', 
          background: 'rgba(255,255,255,0.9)', 
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{margin: '0 0 10px 0', color: '#333', fontSize: '16px'}}>Enter Address Manually</h4>
          <div style={{marginBottom: '10px'}}>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Raipur, Chhattisgarh, 493332"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            />
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            <button
              type="submit"
              disabled={addressLoading || !manualAddress.trim()}
              style={{
                padding: '10px 16px',
                background: (addressLoading || !manualAddress.trim()) ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (addressLoading || !manualAddress.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {addressLoading ? 'Finding...' : 'Set Address'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualEntry(false);
                setManualAddress('');
              }}
              style={{
                padding: '10px 16px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{fontSize: '12px', color: '#666', margin: '10px 0 0 0'}}>
            💡 <strong>Tip:</strong> Include area, city, state and pincode for best results (e.g., "MG Road, Raipur, Chhattisgarh, 492001")
          </p>
        </form>
      )}
    </div>
  );
};

export default LocationPickerEnhanced;
