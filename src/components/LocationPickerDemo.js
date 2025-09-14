import React, { useState } from 'react';
import LocationPickerEnhanced from './LocationPickerEnhanced';

const LocationPickerDemo = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    console.log('Location selected:', location);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1>Enhanced Location Picker Demo</h1>
        <p>This demonstrates the new address input functionality for the waste management app.</p>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Features:</h2>
        <ul>
          <li>✅ GPS location detection</li>
          <li>✅ Manual address entry (e.g., "Raipur, Chhattisgarh, 493332")</li>
          <li>✅ Coordinate entry for precise locations</li>
          <li>✅ Address-to-coordinate conversion (geocoding)</li>
          <li>✅ User-friendly interface matching your design</li>
        </ul>
      </div>

      <LocationPickerEnhanced 
        onLocationChange={handleLocationChange}
        style={{ marginBottom: '30px' }}
      />

      {selectedLocation && (
        <div style={{
          background: '#e8f5e8',
          border: '1px solid #4CAF50',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h3>Selected Location Details:</h3>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><strong>Source:</strong> {selectedLocation.source}</p>
            <p><strong>Latitude:</strong> {selectedLocation.latitude}</p>
            <p><strong>Longitude:</strong> {selectedLocation.longitude}</p>
            {selectedLocation.accuracy && (
              <p><strong>Accuracy:</strong> ±{Math.round(selectedLocation.accuracy)}m</p>
            )}
            {selectedLocation.address && (
              <p><strong>Address:</strong> {selectedLocation.address}</p>
            )}
            <p><strong>Timestamp:</strong> {new Date(selectedLocation.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#e3f2fd',
        borderRadius: '8px'
      }}>
        <h3>How to use:</h3>
        <ol>
          <li><strong>GPS Detection:</strong> Click "Update Location" to detect your current location</li>
          <li><strong>Manual Address:</strong> Click "Manual Entry" → Enter an address like "Raipur, Chhattisgarh, 493332"</li>
          <li><strong>Coordinates:</strong> Click "Manual Entry" → Use the original coordinate inputs for precise positioning</li>
        </ol>
        
        <h4>Example addresses you can try:</h4>
        <ul>
          <li>Raipur, Chhattisgarh, India</li>
          <li>Connaught Place, New Delhi, India</li>
          <li>MG Road, Bangalore, Karnataka, India</li>
          <li>Marine Drive, Mumbai, Maharashtra, India</li>
        </ul>
      </div>
    </div>
  );
};

export default LocationPickerDemo;
