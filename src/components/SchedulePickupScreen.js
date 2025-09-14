import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import authUtils from '../utils/authUtils';
import SimpleQRCode from './SimpleQRCode';
import LocationPickerEnhanced from './LocationPickerEnhanced';
import locationService from '../services/locationService';
import { reverseGeocode, formatCoordinates } from '../utils/geocodingUtils';

const SchedulePickupScreen = () => {
  const [selectedWasteTypes, setSelectedWasteTypes] = useState([]);
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [pickupData, setPickupData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [wasteImages, setWasteImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);

  const wasteTypes = [
    {
      id: 'dry',
      name: 'Dry Waste',
      icon: '📄',
      color: '#2196F3',
      description: 'Paper, plastic, metal, glass'
    },
    {
      id: 'wet',
      name: 'Wet Waste', 
      icon: '🍃',
      color: '#4CAF50',
      description: 'Kitchen scraps, organic waste'
    },
    {
      id: 'hazardous',
      name: 'Hazardous Waste',
      icon: '⚠️',
      color: '#f44336',
      description: 'Electronics, batteries, chemicals'
    }
  ];

  const timeSlots = [
    { id: 'morning', label: '6:00 AM - 10:00 AM', available: true },
    { id: 'midday', label: '10:00 AM - 2:00 PM', available: true },
    { id: 'afternoon', label: '2:00 PM - 6:00 PM', available: false },
    { id: 'evening', label: '6:00 PM - 8:00 PM', available: true }
  ];

  const toggleWasteType = (wasteTypeId) => {
    if (selectedWasteTypes.includes(wasteTypeId)) {
      setSelectedWasteTypes(selectedWasteTypes.filter(id => id !== wasteTypeId));
    } else {
      setSelectedWasteTypes([...selectedWasteTypes, wasteTypeId]);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + wasteImages.length > 3) {
      alert('You can upload maximum 3 images');
      return;
    }

    const newImages = [];
    const newPreviews = [];

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`);
        return;
      }

      newImages.push(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          url: reader.result,
          name: file.name
        });
        
        if (newPreviews.length === files.length) {
          setImagePreview([...imagePreview, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setWasteImages([...wasteImages, ...newImages]);
  };

  const removeImage = (index) => {
    const newImages = wasteImages.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setWasteImages(newImages);
    setImagePreview(newPreviews);
  };

  const handleSchedule = async () => {
    setLoading(true);
    
    try {
      // Get user location and address
      let location = null;
      let address = '';
      try {
        location = await locationService.getLocationWithFallback();
        setUserLocation(location);
        
        // Get human-readable address
        if (location && location.latitude && location.longitude) {
          try {
            address = await reverseGeocode(location.latitude, location.longitude);
            setUserAddress(address);
          } catch (geoError) {
            console.warn('Could not get address:', geoError);
            address = formatCoordinates(location.latitude, location.longitude);
          }
        }
      } catch (error) {
        console.warn('Location not available:', error);
      }

      // Generate unique pickup ID
      const pickupId = `PU${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Convert images to base64 for storage (in production, upload to server)
      const imageData = imagePreview.map(img => ({
        url: img.url,
        name: img.name
      }));
      
      // Get customer info from localStorage
      const customerName = `${localStorage.getItem('firstName') || ''} ${localStorage.getItem('lastName') || ''}`.trim();
      const customerPhone = localStorage.getItem('userPhone') || 'Not provided';
      const customerAddress = localStorage.getItem('userAddress') || '';
      const customerPincode = localStorage.getItem('userPincode') || '';
      
      // Prepare pickup data for QR code - pickup ID is the primary identifier
      const qrData = {
        pickupId: pickupId, // This is the primary identifier for QR verification
        verificationCode: pickupId, // Same as pickup ID for verification
        userId: localStorage.getItem('userId') || 'GUEST',
        customerName: customerName || 'Guest User',
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        customerPincode: customerPincode,
        wasteTypes: selectedWasteTypes.map(id => {
          const type = wasteTypes.find(w => w.id === id);
          return type ? type.name : id;
        }),
        estimatedWeight: estimatedWeight,
        timeSlot: timeSlots.find(slot => slot.id === selectedTimeSlot)?.label,
        specialInstructions: specialInstructions || 'None',
        wasteImages: imageData,
        scheduledDate: new Date().toLocaleDateString(),
        scheduledTime: new Date().toLocaleTimeString(),
        timestamp: new Date().toISOString(),
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : null,
        address: address || 'Location not available',
        status: 'pending',  // Changed from 'confirmed' to 'pending' to match the status flow
        createdAt: new Date().toISOString()
      };
      
      // Try to save via API first with retry logic
      let serverSyncSuccessful = false;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const token = authUtils.getToken();
          console.log(`Attempting to save pickup to server (attempt ${attempt}/${maxRetries})`);
          
          const response = await axios.post(
            'http://localhost:3000/api/pickups/schedule',
            {
              pickupId: qrData.pickupId, // Send our generated ID
              userId: qrData.userId,
              customerName: qrData.customerName,
              customerPhone: qrData.customerPhone,
              customerAddress: qrData.customerAddress,
              customerPincode: qrData.customerPincode,
              wasteTypes: qrData.wasteTypes,
              estimatedWeight: qrData.estimatedWeight,
              timeSlot: qrData.timeSlot,
              specialInstructions: qrData.specialInstructions,
              location: qrData.location,
              address: qrData.address,
              scheduledDate: qrData.scheduledDate,
              scheduledTime: qrData.scheduledTime,
              wasteImages: qrData.wasteImages,
              timestamp: qrData.timestamp,
              createdAt: qrData.createdAt
            },
            {
              headers: { 'Authorization': `Bearer ${token}` },
              timeout: 10000 // 10 second timeout
            }
          );
          
          if (response.data.success) {
            // Use the server-generated pickup ID if provided, otherwise keep ours
            if (response.data.data.pickupId) {
              qrData.pickupId = response.data.data.pickupId;
              qrData.verificationCode = response.data.data.pickupId;
            }
            if (response.data.data.qrCodeData) {
              qrData.qrCodeData = response.data.data.qrCodeData;
            }
            
            serverSyncSuccessful = true;
            qrData.syncedToServer = true;
            qrData.lastSyncAt = new Date().toISOString();
            
            console.log('✅ Pickup successfully saved to server:', qrData.pickupId);
            break; // Success, exit retry loop
          }
        } catch (apiError) {
          console.log(`❌ Server sync attempt ${attempt} failed:`, apiError.message);
          
          if (attempt === maxRetries) {
            console.log('All server sync attempts failed, will save locally and sync later');
            // Mark for future sync
            qrData.syncedToServer = false;
            qrData.needsSync = true;
            qrData.syncAttempts = maxRetries;
            qrData.lastSyncError = apiError.message;
            qrData.lastSyncAttempt = new Date().toISOString();
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // Always save to localStorage for offline access and as backup
      const pickupHistory = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
      
      // Remove any existing pickup with same ID (in case of retry/update)
      const filteredHistory = pickupHistory.filter(p => p.pickupId !== qrData.pickupId);
      
      // Add new pickup to beginning of array
      filteredHistory.unshift(qrData);
      
      // Keep only latest 100 pickups to prevent localStorage bloat
      const trimmedHistory = filteredHistory.slice(0, 100);
      
      localStorage.setItem('pickupHistory', JSON.stringify(trimmedHistory));
      
      // Show appropriate success message based on sync status
      const syncMessage = serverSyncSuccessful ? 
        '✅ Pickup scheduled and saved to database!' : 
        '⚠️ Pickup scheduled locally. Will sync with database when connection is available.';
      
      console.log(syncMessage);
      
      // If server sync failed, attempt to schedule background sync
      if (!serverSyncSuccessful && 'serviceWorker' in navigator) {
        // Register for background sync if service worker is available
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.sync) {
            await registration.sync.register('pickup-sync');
            console.log('📡 Background sync registered for failed pickup');
          }
        } catch (syncError) {
          console.log('Background sync registration failed:', syncError);
        }
      }
      
      setPickupData(qrData);
      setLoading(false);
      setScheduled(true);
      
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      alert('Failed to schedule pickup. Please try again.');
      setLoading(false);
    }
  };

  if (scheduled && pickupData) {
    return (
      <div>
        <div className="header">
          <div className="container">
            <h1>Pickup Scheduled! ✅</h1>
            <p>Your waste pickup has been confirmed</p>
          </div>
        </div>

        <nav className="navigation">
          <div className="container">
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/training">Training</Link></li>
              <li><Link to="/schedule">Schedule Pickup</Link></li>
            </ul>
          </div>
        </nav>

        <div className="container">
          <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className="card" style={{marginBottom: '20px'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '4rem', marginBottom: '20px'}}>🎉</div>
                <h2>Pickup Successfully Scheduled!</h2>
                <p style={{fontSize: '18px', color: '#666', marginBottom: '30px'}}>
                  Your waste pickup request has been confirmed. Please save the QR code below.
                </p>
              </div>
              
              {/* QR Code Display */}
              <SimpleQRCode 
                data={pickupData}
                size={250}
                includeDetails={true}
              />
              
              {/* Display Uploaded Images */}
              {pickupData.wasteImages && pickupData.wasteImages.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '8px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📷 Uploaded Waste Images</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px'
                  }}>
                    {pickupData.wasteImages.map((img, index) => (
                      <div key={index} style={{
                        background: 'white',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <img
                          src={img.url}
                          alt={`Waste ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover'
                          }}
                        />
                        <p style={{
                          margin: 0,
                          padding: '8px',
                          fontSize: '12px',
                          color: '#666',
                          textAlign: 'center',
                          background: '#f9f9f9'
                        }}>
                          {img.name || `Image ${index + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p style={{
                    margin: '15px 0 0 0',
                    fontSize: '14px',
                    color: '#666',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    ✓ These images have been saved with your pickup request
                  </p>
                </div>
              )}
            </div>

            <div className="card" style={{background: '#f8f9fa'}}>
              <h3>What's Next?</h3>
              <div style={{display: 'grid', gap: '15px', marginTop: '20px'}}>
                <div style={{display: 'flex', alignItems: 'start', gap: '15px'}}>
                  <span style={{fontSize: '24px'}}>1️⃣</span>
                  <div>
                    <strong>Save Your QR Code</strong>
                    <p style={{margin: '5px 0 0 0', color: '#666'}}>
                      Download or print the QR code for your records. You'll need to show this to the waste collector.
                    </p>
                  </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'start', gap: '15px'}}>
                  <span style={{fontSize: '24px'}}>2️⃣</span>
                  <div>
                    <strong>Prepare Your Waste</strong>
                    <p style={{margin: '5px 0 0 0', color: '#666'}}>
                      Sort and bag your waste according to the categories you selected.
                    </p>
                  </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'start', gap: '15px'}}>
                  <span style={{fontSize: '24px'}}>3️⃣</span>
                  <div>
                    <strong>Wait for Pickup</strong>
                    <p style={{margin: '5px 0 0 0', color: '#666'}}>
                      A waste collector will arrive during your selected time slot: <strong>{pickupData.timeSlot}</strong>
                    </p>
                  </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'start', gap: '15px'}}>
                  <span style={{fontSize: '24px'}}>4️⃣</span>
                  <div>
                    <strong>Show QR Code</strong>
                    <p style={{margin: '5px 0 0 0', color: '#666'}}>
                      Present the QR code to the collector for quick verification and confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'center'}}>
              <Link to="/" className="button" style={{padding: '15px 30px'}}>Back to Home</Link>
              <button 
                className="button" 
                style={{padding: '15px 30px', background: '#4CAF50'}}
                onClick={() => {
                  setScheduled(false);
                  setPickupData(null);
                  setSelectedWasteTypes([]);
                  setEstimatedWeight('');
                  setSelectedTimeSlot('');
                  setSpecialInstructions('');
                  setWasteImages([]);
                  setImagePreview([]);
                }}
              >
                Schedule Another Pickup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>Schedule Waste Pickup</h1>
          <p>Book your waste collection like ordering food!</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/training">Training</Link></li>
            <li><Link to="/schedule">Schedule Pickup</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
          <h3>Select Waste Types:</h3>
          <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'}}>
            {wasteTypes.map(wasteType => (
              <div
                key={wasteType.id}
                className="card"
                onClick={() => toggleWasteType(wasteType.id)}
                style={{
                  cursor: 'pointer',
                  border: selectedWasteTypes.includes(wasteType.id) 
                    ? `3px solid ${wasteType.color}` 
                    : '2px solid #e0e0e0',
                  background: selectedWasteTypes.includes(wasteType.id) 
                    ? `${wasteType.color}10` 
                    : 'white'
                }}
              >
                <div style={{fontSize: '2rem', marginBottom: '10px'}}>{wasteType.icon}</div>
                <h4>{wasteType.name}</h4>
                <p>{wasteType.description}</p>
                {selectedWasteTypes.includes(wasteType.id) && (
                  <div className="badge" style={{background: wasteType.color}}>Selected</div>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Pickup Location:</label>
            <LocationPickerEnhanced
              onLocationChange={(location) => {
                setUserLocation(location);
                if (location.address) {
                  setUserAddress(location.address);
                }
              }}
              initialLocation={userLocation}
            />
          </div>

          <div className="form-group">
            <label>Estimated Weight:</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., 2 kg"
              value={estimatedWeight}
              onChange={(e) => setEstimatedWeight(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Preferred Time Slot:</label>
            <div style={{display: 'grid', gap: '10px', marginTop: '10px'}}>
              {timeSlots.map(slot => (
                <div
                  key={slot.id}
                  className="card"
                  onClick={() => slot.available && setSelectedTimeSlot(slot.id)}
                  style={{
                    cursor: slot.available ? 'pointer' : 'not-allowed',
                    opacity: slot.available ? 1 : 0.6,
                    border: selectedTimeSlot === slot.id ? '3px solid #4CAF50' : '2px solid #e0e0e0',
                    background: selectedTimeSlot === slot.id ? '#e8f5e8' : 'white',
                    padding: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>{slot.label}</strong>
                  </div>
                  <div>
                    <span className={slot.available ? 'badge' : 'badge'} 
                          style={{background: slot.available ? '#4CAF50' : '#999'}}>
                      {slot.available ? 'Available' : 'Full'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Upload Waste Images (Optional):</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              background: '#f9f9f9',
              marginBottom: '20px'
            }}>
              <input
                type="file"
                id="imageUpload"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={wasteImages.length >= 3}
              />
              
              {imagePreview.length === 0 ? (
                <label htmlFor="imageUpload" style={{
                  cursor: 'pointer',
                  display: 'block'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '10px'
                  }}>📷</div>
                  <p style={{ margin: '10px 0', color: '#666' }}>
                    Click to upload images of your waste
                  </p>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    Maximum 3 images, 5MB each
                  </p>
                </label>
              ) : (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    {imagePreview.map((img, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        background: 'white',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <img
                          src={img.url}
                          alt={`Waste ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(244, 67, 54, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                        <p style={{
                          margin: 0,
                          padding: '5px',
                          fontSize: '12px',
                          color: '#666',
                          textAlign: 'center',
                          background: '#f5f5f5',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {img.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {wasteImages.length < 3 && (
                    <label htmlFor="imageUpload" style={{
                      cursor: 'pointer',
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#4CAF50',
                      color: 'white',
                      borderRadius: '5px',
                      fontSize: '14px'
                    }}>
                      + Add More Images ({3 - wasteImages.length} remaining)
                    </label>
                  )}
                </div>
              )}
            </div>
            
            <div style={{
              background: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>
                💡 <strong>Why upload images?</strong>
              </p>
              <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', color: '#1976d2' }}>
                <li>Helps workers prepare appropriate collection bags</li>
                <li>Ensures proper waste segregation verification</li>
                <li>Speeds up the pickup process</li>
                <li>Helps in estimating actual weight</li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label>Special Instructions (Optional):</label>
            <textarea
              className="form-control"
              placeholder="Any special instructions for the pickup..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows="3"
            />
          </div>

          <button
            className="button"
            onClick={handleSchedule}
            disabled={loading || selectedWasteTypes.length === 0 || !selectedTimeSlot || !estimatedWeight}
            style={{width: '100%', padding: '20px'}}
          >
            {loading ? 'Scheduling...' : 'Schedule Pickup'}
          </button>

          {selectedWasteTypes.length === 0 && (
            <p style={{color: '#f44336', textAlign: 'center', marginTop: '10px'}}>
              Please select at least one waste type
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePickupScreen;
