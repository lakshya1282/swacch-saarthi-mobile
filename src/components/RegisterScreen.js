import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { locationService, LocationUtils } from '../utils/locationUtils';
import authUtils from '../utils/authUtils';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    pincode: '',
    userType: 'citizen'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [currentLocation, setCurrentLocation] = useState(null);

  // Check if user was redirected from a protected route
  React.useEffect(() => {
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      setShowRedirectMessage(true);
      // Auto-hide the message after 5 seconds
      setTimeout(() => setShowRedirectMessage(false), 5000);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match!');
      setLoading(false);
      return;
    }
    
    try {
      // Get user's location with fallback strategies
      setLocationStatus('Getting your location...');
      const location = await locationService.getLocationWithFallback();
      
      setCurrentLocation(location);
      if (location.warning) {
        setLocationStatus(location.warning);
      } else {
        setLocationStatus(`Location: ${LocationUtils.formatLocation(location)}`);
      }

      // Prepare registration data with enhanced location info
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        pincode: formData.pincode,
        userType: formData.userType,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          source: location.source,
          accuracy: location.accuracy || null,
          city: location.city || null,
          timestamp: location.timestamp || Date.now()
        }
      };

      // Make API call to backend
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      
      if (response.data.success) {
        let successMessage = response.data.message;
        
        // If token is provided, automatically log the user in
        if (response.data.token && response.data.user) {
          authUtils.login(response.data.token, response.data.user);
          successMessage += '\n\nLogging you in automatically...';
        }
        
        if (response.data.notifications) {
          successMessage += '\n\n📧 Notifications sent:';
          successMessage += '\n• ' + response.data.notifications.email;
          successMessage += '\n• ' + response.data.notifications.sms;
          successMessage += '\n• ' + response.data.notifications.location;
        }
        
        setMessage(successMessage);
        
        // Clear form
        // Clear form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          address: '',
          pincode: '',
          userType: 'citizen'
        });
        setLocationStatus('Getting location...');
        setCurrentLocation(null);
        
        // Check if there's a redirect path saved
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          setTimeout(() => {
            navigate(redirectPath);
          }, 2000);
        } else {
          // Redirect to home after successful registration
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setMessage(error.response.data.message);
      } else if (error.code === 'ERR_NETWORK') {
        setMessage('Cannot connect to server. Please make sure the backend server is running on http://localhost:3000');
      } else {
        setMessage('Registration failed. Please try again.');
      }
      
      // Reset location status on error
      if (!currentLocation) {
        setLocationStatus('Location unavailable - using default');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const retryLocation = async () => {
    try {
      setLocationStatus('Retrying location...');
      const location = await locationService.getLocationWithFallback();
      
      setCurrentLocation(location);
      if (location.warning) {
        setLocationStatus(location.warning);
      } else {
        setLocationStatus(`Location: ${LocationUtils.formatLocation(location)}`);
      }
    } catch (error) {
      console.error('Location retry failed:', error);
      setLocationStatus('Location retry failed - using default location');
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>Register for Waste Management</h1>
          <p>Join us in making India cleaner!</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {showRedirectMessage && (
          <div className="card" style={{
            maxWidth: '600px', 
            margin: '0 auto 20px auto', 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            padding: '15px'
          }}>
            <p style={{margin: 0, color: '#856404'}}>
              <strong>🔒 Authentication Required:</strong> Please register or login to access that feature. 
              If you already have an account, <Link to="/login" style={{color: '#0056b3', fontWeight: 'bold'}}>click here to login</Link>.
            </p>
          </div>
        )}
        
        <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
          <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Create Your Account</h2>
          
          {/* User Type Selection */}
          <div style={{marginBottom: '30px'}}>
            <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>I want to register as:</label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <button
                type="button"
                onClick={() => setFormData({...formData, userType: 'citizen'})}
                style={{
                  padding: '20px',
                  background: formData.userType === 'citizen' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 'white',
                  color: formData.userType === 'citizen' ? 'white' : '#333',
                  border: formData.userType === 'citizen' ? 'none' : '2px solid #ddd',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: formData.userType === 'citizen' ? 'bold' : 'normal',
                  boxShadow: formData.userType === 'citizen' ? '0 4px 15px rgba(76,175,80,0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{fontSize: '24px', marginBottom: '8px'}}>🏠</div>
                <div>Citizen</div>
                <div style={{fontSize: '12px', marginTop: '5px', opacity: 0.9}}>Schedule pickups & track waste</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, userType: 'worker'})}
                style={{
                  padding: '20px',
                  background: formData.userType === 'worker' ? 'linear-gradient(135deg, #FF9800, #F57C00)' : 'white',
                  color: formData.userType === 'worker' ? 'white' : '#333',
                  border: formData.userType === 'worker' ? 'none' : '2px solid #ddd',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: formData.userType === 'worker' ? 'bold' : 'normal',
                  boxShadow: formData.userType === 'worker' ? '0 4px 15px rgba(255,152,0,0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{fontSize: '24px', marginBottom: '8px'}}>👷</div>
                <div>Worker</div>
                <div style={{fontSize: '12px', marginTop: '5px', opacity: 0.9}}>Collect waste & earn money</div>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className="form-control"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className="form-control"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                pattern="[6-9][0-9]{9}"
                title="Please enter a valid Indian mobile number"
                required
              />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  minLength="6"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                className="form-control"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label>Pincode</label>
              <input
                type="text"
                name="pincode"
                className="form-control"
                value={formData.pincode}
                onChange={handleChange}
                pattern="[1-9][0-9]{5}"
                title="Please enter a valid 6-digit pincode"
                required
              />
            </div>

            <div className="form-group">
              <label>Register as:</label>
              <div style={{display: 'flex', gap: '20px', marginTop: '10px'}}>
                <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="userType"
                    value="citizen"
                    checked={formData.userType === 'citizen'}
                    onChange={handleChange}
                    style={{marginRight: '8px'}}
                  />
                  Citizen
                </label>
                <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="userType"
                    value="worker"
                    checked={formData.userType === 'worker'}
                    onChange={handleChange}
                    style={{marginRight: '8px'}}
                  />
                  Waste Worker
                </label>
              </div>
            </div>

            <div className="form-group">
              <div style={{padding: '15px', background: currentLocation?.source === 'GPS' ? '#e8f5e8' : '#e3f2fd', borderRadius: '8px', marginBottom: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <p style={{color: currentLocation?.source === 'GPS' ? '#2e7d32' : '#1976d2', margin: 0, marginBottom: '5px'}}>
                      📍 <strong>Location Status:</strong> {locationStatus}
                    </p>
                    {currentLocation?.warning && (
                      <p style={{color: '#f57c00', margin: 0, fontSize: '14px'}}>
                        ⚠️ {currentLocation.warning}
                      </p>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={retryLocation}
                    style={{
                      padding: '8px 16px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Retry Location
                  </button>
                </div>
                <p style={{color: '#666', margin: '10px 0 0 0', fontSize: '14px'}}>
                  We use your location to provide better pickup services and assign nearby workers.
                </p>
              </div>
            </div>

            {message && (
              <div className={message.includes('successful') ? 'success-message' : 'error-message'}>
                <pre style={{whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit'}}>{message}</pre>
              </div>
            )}

            <button type="submit" className="button" style={{width: '100%'}} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div style={{textAlign: 'center', marginTop: '20px'}}>
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
