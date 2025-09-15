import React, { useState } from 'react';
import './OfficeRegistration.css';

const OfficeRegistration = ({ onRegistrationSuccess, onBackToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Office location and address only
    officeName: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    area: '',
    latitude: '',
    longitude: '',
    
    // Operator essential info only
    operatorName: '',
    operatorEmail: '',
    operatorPhone: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Generate auto codes
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const officeCode = `ECO${timestamp}${randomCode}`;
    const clientNumber = `CL${Date.now().toString(36).toUpperCase()}`;
    const employeeId = `EMP${timestamp}`;

    // Prepare registration data with auto-generated codes
    const registrationData = {
      office: {
        officeName: formData.officeName,
        officeCode: officeCode, // Auto-generated
        clientNumber: clientNumber, // Auto-generated
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          area: formData.area
        },
        location: {
          latitude: parseFloat(formData.latitude) || 0,
          longitude: parseFloat(formData.longitude) || 0
        },
        contactInfo: {
          primaryPhone: formData.operatorPhone, // Use operator phone as office phone
          email: formData.operatorEmail, // Use operator email as office email
          website: '' // Default empty
        },
        operationalHours: {
          weekdays: { start: "08:00", end: "18:00" },
          saturday: { start: "08:00", end: "14:00" },
          sunday: { start: "closed", end: "closed" }
        },
        coverageArea: {
          zones: ["Zone A", "Zone B", "Zone C"],
          radius: 10,
          wasteTypes: ["dry", "wet", "mixed", "hazardous"]
        }
      },
      operator: {
        personalInfo: {
          firstName: formData.operatorName.split(' ')[0] || formData.operatorName,
          lastName: formData.operatorName.split(' ').slice(1).join(' ') || '',
          employeeId: employeeId, // Auto-generated
          designation: "Operations Manager", // Default
          email: formData.operatorEmail,
          phone: formData.operatorPhone
        },
        authentication: {
          password: formData.password
        },
        officeInfo: {
          joiningDate: new Date(),
          department: "Operations",
          shift: "morning"
        },
        permissions: {
          viewWorkerPerformance: true,
          processIncentives: true,
          manageWorkers: true,
          viewAnalytics: true,
          exportReports: true,
          systemSettings: false
        }
      }
    };

    try {
      const response = await fetch('http://localhost:3000/api/dashboard/register-office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        onRegistrationSuccess(data);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          console.error('Location error:', error);
          setError('Could not get current location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <button 
            className="back-button"
            onClick={onBackToLogin}
            disabled={loading}
          >
            ← Back to Login
          </button>
          
          <h1>🌍 Register New EcoOffice</h1>
          <p>Set up your waste management office and operator account</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          {/* Office Information Section */}
          <div className="form-section">
            <h3>🌳 EcoOffice Information</h3>
            <p className="section-description">Office codes will be generated automatically</p>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label>Office Name *</label>
                <input
                  type="text"
                  name="officeName"
                  value={formData.officeName}
                  onChange={handleInputChange}
                  placeholder="Green City Waste Management"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="123 Environment Street"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Area/Locality *</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="Sector 21"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Eco City"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Green State"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="123456"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-section">
              <h4>🌍 EcoLocation</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="20.5937"
                    step="any"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="78.9629"
                    step="any"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={getCurrentLocation}
                    disabled={loading}
                  >
                    🌍 Current Location
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Operator Information Section */}
          <div className="form-section">
            <h3>🌿 EcoOperator Information</h3>
            <p className="section-description">Employee ID will be generated automatically</p>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="operatorName"
                  value={formData.operatorName}
                  onChange={handleInputChange}
                  placeholder="John Manager"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="operatorEmail"
                  value={formData.operatorEmail}
                  onChange={handleInputChange}
                  placeholder="john.manager@greencity.com"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="operatorPhone"
                  value={formData.operatorPhone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required
                  disabled={loading}
                  minLength="6"
                />
              </div>
              
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm password"
                  required
                  disabled={loading}
                  minLength="6"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '🌱 Registering...' : '🌍 Register EcoOffice'}
            </button>
          </div>
        </form>

        <div className="registration-footer">
          <div className="info-text">
            🌿 Your data is secure and will be used only for sustainable waste management.<br/>
            🌱 Green incentive system: Workers earn ₹10 per kg for collections above 15kg threshold.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeRegistration;