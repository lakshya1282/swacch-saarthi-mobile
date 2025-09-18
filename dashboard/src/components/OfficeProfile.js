import React, { useState, useEffect } from 'react';
import './OfficeProfile.css';

const OfficeProfile = ({ authToken, officeData, operatorData }) => {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [enrollmentStats, setEnrollmentStats] = useState({
    totalWorkers: 0,
    activeWorkers: 0,
    pendingApplications: 0,
    recentEnrollments: []
  });
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const loadOfficeProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Load office profile data
      const profileResponse = await fetch(
        `http://localhost:3000/api/dashboard/office-profile/${officeData._id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setProfileData(profile);
        setFormData({
          officeName: profile.officeName,
          contactInfo: profile.contactInfo || {},
          operationalHours: profile.operationalHours || {},
          coverageArea: profile.coverageArea || {}
        });
      }

      // Load enrollment statistics
      const statsResponse = await fetch(
        `http://localhost:3000/api/dashboard/enrollment-stats/${officeData._id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setEnrollmentStats(stats);
      } else {
        // Mock data if API not available
        setEnrollmentStats({
          totalWorkers: 8,
          activeWorkers: 6,
          pendingApplications: 2,
          recentEnrollments: [
            { id: 1, name: 'Raj Kumar', joinedAt: '2024-01-15T10:30:00Z', status: 'active' },
            { id: 2, name: 'Priya Sharma', joinedAt: '2024-01-14T14:20:00Z', status: 'active' },
            { id: 3, name: 'Amit Singh', joinedAt: '2024-01-13T09:15:00Z', status: 'pending' },
          ]
        });
      }

    } catch (error) {
      console.error('Office profile loading error:', error);
      setError('Failed to load office profile data.');
      // Use existing office data as fallback
      setProfileData(officeData);
      setFormData({
        officeName: officeData.officeName,
        contactInfo: officeData.contactInfo || {},
        operationalHours: officeData.operationalHours || {},
        coverageArea: officeData.coverageArea || {}
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficeProfile();
  }, []);
  
  // Generate QR code for attendance
  useEffect(() => {
    if (profileData && profileData.officeCode) {
      generateAttendanceQR();
    }
  }, [profileData]);
  
  const generateAttendanceQR = () => {
    const qrContainer = document.getElementById('attendance-qr-code');
    if (qrContainer && window.QRious) {
      // Clear existing QR code
      qrContainer.innerHTML = '';
      
      const attendanceCode = profileData?.attendanceCode || `ATT-${profileData?.officeCode || officeData?.officeCode}`;
      const qrData = {
        type: 'attendance',
        officeCode: profileData?.officeCode || officeData?.officeCode,
        attendanceCode: attendanceCode,
        officeName: profileData?.officeName || officeData?.officeName,
        timestamp: Date.now()
      };
      
      // Create canvas element for QR code
      const canvas = document.createElement('canvas');
      qrContainer.appendChild(canvas);
      
      // Generate QR code
      new window.QRious({
        element: canvas,
        value: JSON.stringify(qrData),
        size: 120,
        background: 'white',
        foreground: 'black',
        level: 'M'
      });
      
      // Hide fallback SVG
      const fallback = qrContainer.nextElementSibling;
      if (fallback && fallback.classList.contains('qr-fallback')) {
        fallback.style.display = 'none';
      }
    } else {
      // Fallback: show the SVG placeholder
      console.warn('QRious library not available, showing fallback QR code');
    }
  };

  const handleCopyOfficeCode = async () => {
    try {
      await navigator.clipboard.writeText(profileData?.officeCode || officeData.officeCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy office code:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/dashboard/office-profile/${officeData._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfileData(updatedProfile);
        setEditMode(false);
        setError('');
      } else {
        setError('Failed to update office profile.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update office profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (loading && !profileData) {
    return (
      <div className="office-profile-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Office Profile...</div>
      </div>
    );
  }

  const profile = profileData || officeData;
  const officeCode = profile.officeCode || 'GENERATING...';

  return (
    <div className="office-profile">
      <div className="profile-header">
        <h1>Office Profile</h1>
        <p>Manage your office information and worker enrollment</p>
      </div>

      {error && (
        <div className="error-alert">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      <div className="profile-grid">
        {/* Office Code Section */}
        <div className="office-code-card">
          <div className="card-header">
            <h2>Office Enrollment Code</h2>
            <div className="code-status">
              <span className="status-badge active">Active</span>
            </div>
          </div>
          
          <div className="office-code-display">
            <div className="code-container">
              <span className="office-code">{officeCode}</span>
              <button 
                className={`copy-btn ${copySuccess ? 'copied' : ''}`}
                onClick={handleCopyOfficeCode}
                disabled={officeCode === 'GENERATING...'}
              >
                {copySuccess ? (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                  </svg>
                )}
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="code-instructions">
              <h4>How workers can join:</h4>
              <ol>
                <li>Download the Sahayak Sarthi Worker app</li>
                <li>Create an account or login</li>
                <li>Enter this office code during registration</li>
                <li>Wait for approval from office admin</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Enrollment Statistics */}
        <div className="enrollment-stats-card">
          <div className="card-header">
            <h2>Enrollment Statistics</h2>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon workers">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{enrollmentStats.totalWorkers}</span>
                <span className="stat-label">Total Workers</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon active">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{enrollmentStats.activeWorkers}</span>
                <span className="stat-label">Active Workers</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon pending">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-number">{enrollmentStats.pendingApplications}</span>
                <span className="stat-label">Pending Approvals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance QR Code Section */}
        <div className="attendance-qr-card">
          <div className="card-header">
            <h2>Attendance QR Code</h2>
            <div className="qr-status">
              <span className="status-badge active">Active</span>
            </div>
          </div>
          
          <div className="qr-code-display">
            <div className="qr-container">
              <div className="qr-code-placeholder">
                <div id="attendance-qr-code"></div>
                <div className="qr-fallback">
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <rect width="120" height="120" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
                    <rect x="10" y="10" width="20" height="20" fill="#000"/>
                    <rect x="40" y="10" width="10" height="10" fill="#000"/>
                    <rect x="60" y="10" width="10" height="10" fill="#000"/>
                    <rect x="90" y="10" width="20" height="20" fill="#000"/>
                    <rect x="10" y="40" width="10" height="10" fill="#000"/>
                    <rect x="90" y="40" width="10" height="10" fill="#000"/>
                    <rect x="40" y="50" width="40" height="20" fill="#000"/>
                    <rect x="10" y="90" width="20" height="20" fill="#000"/>
                    <rect x="50" y="90" width="10" height="10" fill="#000"/>
                    <rect x="90" y="90" width="20" height="20" fill="#000"/>
                  </svg>
                </div>
              </div>
              
              <div className="qr-info">
                <div className="attendance-code">
                  <span className="code-label">Attendance Code:</span>
                  <span className="code-value">{profile.attendanceCode || `ATT-${officeCode}`}</span>
                  <button 
                    className="copy-btn-small"
                    onClick={() => {
                      const attendanceCode = profile.attendanceCode || `ATT-${officeCode}`;
                      navigator.clipboard.writeText(attendanceCode);
                    }}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                    </svg>
                  </button>
                </div>
                
                <div className="qr-actions">
                  <button className="btn btn-outline btn-sm">Download QR</button>
                  <button className="btn btn-primary btn-sm">Print QR</button>
                </div>
              </div>
            </div>
            
            <div className="qr-instructions">
              <h4>How workers mark attendance:</h4>
              <ol>
                <li>Open the Sahayak Sarthi Worker app</li>
                <li>Tap on "Mark Attendance" or QR scanner</li>
                <li>Scan this QR code when arriving at work</li>
                <li>Attendance will be automatically recorded</li>
              </ol>
              <div className="qr-note">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span>Place this QR code at the office entrance for easy scanning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Office Information */}
        <div className="office-info-card">
          <div className="card-header">
            <h2>Office Information</h2>
            <button 
              className="btn btn-outline"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>
          
          {editMode ? (
            <form onSubmit={handleUpdateProfile} className="edit-form">
              <div className="form-group">
                <label>Office Name</label>
                <input
                  type="text"
                  name="officeName"
                  value={formData.officeName || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="contactInfo.phone"
                    value={formData.contactInfo?.phone || ''}
                    onChange={handleInputChange}
                    placeholder="Contact phone"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="contactInfo.email"
                    value={formData.contactInfo?.email || ''}
                    onChange={handleInputChange}
                    placeholder="Contact email"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    name="operationalHours.startTime"
                    value={formData.operationalHours?.startTime || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    name="operationalHours.endTime"
                    value={formData.operationalHours?.endTime || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="office-details">
              <div className="detail-item">
                <span className="detail-label">Office Name:</span>
                <span className="detail-value">{profile.officeName}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">
                  {profile.address?.street}, {profile.address?.area && `${profile.address.area}, `}
                  {profile.address?.city}, {profile.address?.state} - {profile.address?.pincode}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Contact Phone:</span>
                <span className="detail-value">{profile.contactInfo?.phone || 'Not provided'}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Contact Email:</span>
                <span className="detail-value">{profile.contactInfo?.email || 'Not provided'}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Operational Hours:</span>
                <span className="detail-value">
                  {profile.operationalHours?.startTime || '08:00'} - {profile.operationalHours?.endTime || '18:00'}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Coverage Radius:</span>
                <span className="detail-value">{profile.coverageArea?.radius || 5} km</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${profile.status || 'active'}`}>
                  {(profile.status || 'active').charAt(0).toUpperCase() + (profile.status || 'active').slice(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="recent-enrollments-card">
          <div className="card-header">
            <h2>Recent Enrollments</h2>
            <span className="enrollment-count">{enrollmentStats.recentEnrollments.length} recent</span>
          </div>
          
          <div className="enrollments-list">
            {enrollmentStats.recentEnrollments.length > 0 ? (
              enrollmentStats.recentEnrollments.map(enrollment => (
                <div key={enrollment.id} className="enrollment-item">
                  <div className="worker-avatar">
                    {enrollment.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="enrollment-info">
                    <span className="worker-name">{enrollment.name}</span>
                    <span className="join-date">
                      Joined {new Date(enrollment.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`status-badge ${enrollment.status}`}>
                    {enrollment.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-enrollments">
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <p>No recent enrollments</p>
                <small>Workers who join using your office code will appear here</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeProfile;