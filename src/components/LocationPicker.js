import React, { useState, useEffect } from 'react';
import { locationService, LocationUtils } from '../utils/locationUtils';
import { geocode } from '../utils/geocodingUtils';

const LocationPicker = ({ 
  onLocationChange, 
  showRetryButton = true, 
  showAddressLookup = false,
  initialLocation = null,
  style = {} 
}) => {
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showAddressEntry, setShowAddressEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    } else {
      setCurrentLocation(initialLocation);
      setLocationStatus(`Location: ${LocationUtils.formatLocation(initialLocation)}`);
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
        setLocationStatus(`Location: ${LocationUtils.formatLocation(location)}`);
      }
      
      // Get address if requested
      if (showAddressLookup) {
        try {
          const addressData = await locationService.reverseGeocode(
            location.latitude, 
            location.longitude
          );
          setAddress(addressData.formatted_address);
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
      setLocationStatus('Location unavailable - please enter manually');
      setShowManualEntry(true);
    } finally {
      setIsLoading(false);
    }
  };

  const retryLocation = async () => {
    await getCurrentLocation();
  };

  const handleManualLocationSubmit = (e) => {
    e.preventDefault();
    const manualLat = parseFloat(e.target.latitude.value);
    const manualLng = parseFloat(e.target.longitude.value);
    
    if (isNaN(manualLat) || isNaN(manualLng)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    const manualLocation = {
      latitude: manualLat,
      longitude: manualLng,
      source: 'MANUAL',
      timestamp: Date.now()
    };
    
    setCurrentLocation(manualLocation);
    setLocationStatus(`Manual Location: ${LocationUtils.formatLocation(manualLocation)}`);
    setShowManualEntry(false);
    
    if (onLocationChange) {
      onLocationChange(manualLocation);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!manualAddress.trim()) return;
    try {
      setAddressLoading(true);
      const coords = await geocode(manualAddress.trim());
      if (!coords) {
        alert('Could not find that address. Please refine it.');
        return;
      }
      const manualLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: 'ADDRESS',
        timestamp: Date.now()
      };
      setCurrentLocation(manualLocation);
      setLocationStatus(`Address Set: ${manualAddress}`);
      setAddress(manualAddress);
      setShowAddressEntry(false);
      if (onLocationChange) onLocationChange(manualLocation);
    } catch (err) {
      console.error('Address geocoding failed:', err);
      alert('Failed to set location from address.');
    } finally {
      setAddressLoading(false);
    }
  };

  const containerStyle = {
    padding: '15px',
    background: currentLocation?.source === 'GPS' ? '#e8f5e8' : '#e3f2fd',
    borderRadius: '8px',
    marginBottom: '20px',
    ...style
  };

  const statusColor = currentLocation?.source === 'GPS' ? '#2e7d32' : '#1976d2';

  return (
    <div style={containerStyle}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{ flex: 1 }}>
          <p style={{color: statusColor, margin: 0, marginBottom: '5px'}}>
            📍 <strong>Location Status:</strong> {locationStatus}
          </p>
          
          {currentLocation?.warning && (
            <p style={{color: '#f57c00', margin: 0, fontSize: '14px'}}>
              ⚠️ {currentLocation.warning}
            </p>
          )}
          
          {address && (
            <p style={{color: '#666', margin: '5px 0 0 0', fontSize: '14px'}}>
              📍 Address: {address}
            </p>
          )}
          
          {currentLocation && (
            <p style={{color: '#666', margin: '5px 0 0 0', fontSize: '12px'}}>
              Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              {currentLocation.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
            </p>
          )}
        </div>
        
        <div style={{display: 'flex', gap: '10px', flexDirection: 'column'}}>
          {showRetryButton && (
            <button 
              type="button" 
              onClick={retryLocation}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                background: isLoading ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? 'Getting...' : 'Retry GPS'}
            </button>
          )}
          
          <button 
            type="button" 
            onClick={() => setShowManualEntry(!showManualEntry)}
            style={{
              padding: '8px 16px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Enter Coordinates
          </button>

          <button 
            type="button" 
            onClick={() => setShowAddressEntry(!showAddressEntry)}
            style={{
              padding: '8px 16px',
              background: '#8E24AA',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Enter Address
          </button>
        </div>
      </div>
      
      {showManualEntry && (
        <form onSubmit={handleManualLocationSubmit} style={{marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px'}}>
          <h4 style={{margin: '0 0 15px 0', color: '#333'}}>Enter Coordinates Manually</h4>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px'}}>
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666'}}>
                Latitude:
              </label>
              <input
                type="number"
                name="latitude"
                step="any"
                placeholder="28.6139"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666'}}>
                Longitude:
              </label>
              <input
                type="number"
                name="longitude"
                step="any"
                placeholder="77.2090"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            <button 
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Set Location
            </button>
            <button 
              type="button"
              onClick={() => setShowManualEntry(false)}
              style={{
                padding: '8px 16px',
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
            💡 You can get coordinates from Google Maps by right-clicking on a location and selecting the coordinates.
          </p>
        </form>
      )}

      {showAddressEntry && (
        <form onSubmit={handleAddressSubmit} style={{marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.9)', borderRadius: '8px'}}>
          <h4 style={{margin: '0 0 10px 0', color: '#333'}}>Enter Address</h4>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Raipur, Chhattisgarh, 493332"
              required
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={addressLoading}
              style={{
                padding: '10px 16px',
                background: addressLoading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: addressLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {addressLoading ? 'Finding...' : 'Set Address'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddressEntry(false)}
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
            Tip: Include area, city, state and pincode for best results.
          </p>
        </form>
      )}
    </div>
  );
};

export default LocationPicker;
