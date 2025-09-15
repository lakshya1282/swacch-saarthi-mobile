import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const WorkerProfile = () => {
  const [worker, setWorker] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Enrollment form states
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [officeCode, setOfficeCode] = useState('');
  const [verifiedOffice, setVerifiedOffice] = useState(null);
  const [enrollmentStep, setEnrollmentStep] = useState('enter_code'); // enter_code, verify_office, confirm_enrollment
  
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkerProfile();
  }, []);

  const loadWorkerProfile = () => {
    // Get worker data from localStorage
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    const firstName = localStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName');
    const email = localStorage.getItem('email');

    if (!token || !userId || userType !== 'worker') {
      navigate('/login');
      return;
    }

    const workerData = {
      _id: userId,
      firstName: firstName || 'Worker',
      lastName: lastName || '',
      email: email || 'worker@example.com',
      userType: 'worker'
    };

    setWorker(workerData);
    checkEnrollmentStatus(userId);
  };

  const checkEnrollmentStatus = async (workerId) => {
    try {
      const response = await axios.get(
        `http://192.168.29.93:3000/api/worker/enrollment-status/${workerId}`
      );

      if (response.data.success) {
        const enrollment = response.data.enrollment;
        setEnrollmentStatus(enrollment.status);
        setOffice(enrollment.office);

        // Update localStorage cache
        localStorage.setItem('workerEnrollmentStatus', enrollment.status);
        if (enrollment.officeCode) {
          localStorage.setItem('workerOfficeCode', enrollment.officeCode);
        }
        if (enrollment.office?.officeName) {
          localStorage.setItem('workerOfficeName', enrollment.office.officeName);
        }
      }
    } catch (error) {
      console.error('Error checking enrollment status:', error);
      setEnrollmentStatus('not_enrolled');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOfficeCode = async () => {
    if (!officeCode.trim()) {
      setError('Please enter an office code');
      return;
    }

    setEnrollmentLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://192.168.29.93:3000/api/worker/verify-office-code',
        { officeCode: officeCode.trim() }
      );

      if (response.data.success) {
        setVerifiedOffice(response.data.office);
        setEnrollmentStep('verify_office');
      }
    } catch (error) {
      console.error('Error verifying office code:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to verify office code. Please try again.');
      }
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleEnrollInOffice = async () => {
    setEnrollmentLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://192.168.29.93:3000/api/worker/enroll-in-office',
        { 
          workerId: worker._id,
          officeCode: officeCode.trim()
        }
      );

      if (response.data.success) {
        // Update local state
        setEnrollmentStatus('enrolled');
        setOffice({
          _id: response.data.enrollment.officeId,
          officeName: response.data.enrollment.officeName,
          officeCode: response.data.enrollment.officeCode
        });

        // Update localStorage
        localStorage.setItem('workerEnrollmentStatus', 'enrolled');
        localStorage.setItem('workerOfficeCode', response.data.enrollment.officeCode);
        localStorage.setItem('workerOfficeName', response.data.enrollment.officeName);
        
        setEnrollmentStep('confirm_enrollment');
        
        setTimeout(() => {
          setShowEnrollmentForm(false);
          setEnrollmentStep('enter_code');
          setOfficeCode('');
          setVerifiedOffice(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error enrolling in office:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to enroll in office. Please try again.');
      }
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const resetEnrollment = () => {
    setEnrollmentStep('enter_code');
    setOfficeCode('');
    setVerifiedOffice(null);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading || !worker) {
    return (
      <div>
        <div className="header" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
          <div className="container">
            <h1>Worker Profile</h1>
            <p>Loading your profile...</p>
          </div>
        </div>
        <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
          <div className="loading-spinner"></div>
          <h3>Loading Profile...</h3>
        </div>
      </div>
    );
  }

  const renderEnrollmentForm = () => {
    if (enrollmentStep === 'enter_code') {
      return (
        <div className="enrollment-section">
          <h3>🏢 Office Enrollment</h3>
          <p>Enter your office enrollment code to connect with your zone office.</p>
          
          <div className="form-group">
            <label htmlFor="officeCode">Office Enrollment Code</label>
            <input
              type="text"
              id="officeCode"
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value.toUpperCase())}
              placeholder="Enter office code (e.g., TEST001)"
              className="form-input"
              maxLength={15}
            />
            <small className="form-hint">
              Contact your zone office supervisor to get your enrollment code
            </small>
          </div>

          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}

          <div className="button-group">
            <button
              onClick={() => setShowEnrollmentForm(false)}
              className="secondary-button"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyOfficeCode}
              disabled={enrollmentLoading || !officeCode.trim()}
              className="primary-button"
            >
              {enrollmentLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </div>
      );
    }

    if (enrollmentStep === 'verify_office') {
      return (
        <div className="enrollment-section">
          <h3>✅ Office Found!</h3>
          <p>Please verify this is the correct office before proceeding.</p>

          <div className="office-card">
            <h4>{verifiedOffice.officeName}</h4>
            <div className="office-info">
              <p><strong>Office Code:</strong> {verifiedOffice.officeCode}</p>
              <p><strong>Address:</strong> {verifiedOffice.address.street}, {verifiedOffice.address.city}</p>
              {verifiedOffice.contactInfo?.phone && (
                <p><strong>Phone:</strong> {verifiedOffice.contactInfo.phone}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}

          <div className="button-group">
            <button onClick={resetEnrollment} className="secondary-button">
              Wrong Office? Go Back
            </button>
            <button
              onClick={handleEnrollInOffice}
              disabled={enrollmentLoading}
              className="primary-button"
            >
              {enrollmentLoading ? 'Enrolling...' : 'Confirm Enrollment'}
            </button>
          </div>
        </div>
      );
    }

    if (enrollmentStep === 'confirm_enrollment') {
      return (
        <div className="enrollment-section">
          <h3>🎉 Enrollment Successful!</h3>
          <p>You have been successfully enrolled in <strong>{verifiedOffice?.officeName}</strong></p>
          <div className="success-message">
            <p>✅ Your performance metrics will now be visible to your office</p>
            <p>✅ You'll receive work assignments from your zone</p>
            <p>✅ You're eligible for incentives and performance bonuses</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
        <div className="container">
          <h1>Worker Profile</h1>
          <p>Manage your profile and office enrollment</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/worker">Dashboard</Link></li>
            <li><Link to="/worker/my-works">My Works</Link></li>
            <li><Link to="/worker/find-works">Find Works</Link></li>
            <li><Link to="/worker/profile" className="active">Profile</Link></li>
            <li>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Profile Information */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <span>{worker.firstName.charAt(0)}{worker.lastName.charAt(0)}</span>
            </div>
            <div className="profile-info">
              <h2>{worker.firstName} {worker.lastName}</h2>
              <p className="email">{worker.email}</p>
              <span className="user-type">👷 Worker</span>
            </div>
          </div>

          {/* Office Enrollment Status */}
          <div className="enrollment-status">
            <h3>🏢 Office Enrollment Status</h3>
            
            {enrollmentStatus === 'enrolled' && office ? (
              <div className="enrolled-info">
                <div className="status-badge enrolled">✅ Enrolled</div>
                <div className="office-details">
                  <p><strong>Office:</strong> {office.officeName}</p>
                  <p><strong>Office Code:</strong> {office.officeCode}</p>
                  {office.address && (
                    <p><strong>Location:</strong> {office.address.city}, {office.address.state}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="not-enrolled-info">
                <div className="status-badge not-enrolled">⚠️ Not Enrolled</div>
                <p>You need to enroll with your zone office to receive work assignments and track performance.</p>
                
                {!showEnrollmentForm ? (
                  <button
                    onClick={() => setShowEnrollmentForm(true)}
                    className="enroll-button"
                  >
                    🏢 Enroll in Office
                  </button>
                ) : (
                  renderEnrollmentForm()
                )}
              </div>
            )}
          </div>

          {/* Profile Actions */}
          <div className="profile-actions">
            <h3>Profile Actions</h3>
            <div className="action-buttons">
              <Link to="/worker" className="action-button">
                🏠 Go to Dashboard
              </Link>
              <Link to="/worker/my-works" className="action-button">
                📋 View My Works
              </Link>
              {enrollmentStatus === 'enrolled' && (
                <button
                  onClick={() => {
                    // Reset enrollment if needed
                    if (window.confirm('Are you sure you want to change your office enrollment?')) {
                      setEnrollmentStatus('not_enrolled');
                      setOffice(null);
                      localStorage.removeItem('workerEnrollmentStatus');
                      localStorage.removeItem('workerOfficeCode');
                      localStorage.removeItem('workerOfficeName');
                    }
                  }}
                  className="action-button secondary"
                >
                  🔄 Change Office
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          color: white;
          padding: 40px 0;
          text-align: center;
        }

        .header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
        }

        .navigation {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 0;
        }

        .nav-links {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 30px;
          align-items: center;
        }

        .nav-links li a {
          text-decoration: none;
          color: #333;
          font-weight: 500;
          padding: 15px 0;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .nav-links li a:hover,
        .nav-links li a.active {
          color: #FF9800;
          border-bottom-color: #FF9800;
        }

        .logout-btn {
          background: transparent;
          border: 1px solid #f44336;
          color: #f44336;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .logout-btn:hover {
          background: #f44336;
          color: white;
        }

        .profile-card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FF9800, #F57C00);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }

        .profile-info h2 {
          margin: 0 0 5px 0;
          color: #333;
        }

        .email {
          color: #666;
          margin: 0 0 10px 0;
        }

        .user-type {
          background: #FF9800;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .enrollment-status {
          margin-bottom: 30px;
        }

        .enrollment-status h3 {
          margin-bottom: 15px;
          color: #333;
        }

        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 500;
          margin-bottom: 15px;
        }

        .status-badge.enrolled {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .status-badge.not-enrolled {
          background: #fff3e0;
          color: #f57c00;
        }

        .office-details {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
        }

        .office-details p {
          margin: 5px 0;
        }

        .enroll-button {
          background: #FF9800;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 10px;
        }

        .enroll-button:hover {
          background: #F57C00;
        }

        .enrollment-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-top: 15px;
        }

        .enrollment-section h3 {
          margin-top: 0;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #333;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #FF9800;
        }

        .form-hint {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 14px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .primary-button {
          flex: 2;
          background: #FF9800;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        }

        .primary-button:hover:not(:disabled) {
          background: #F57C00;
        }

        .primary-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .secondary-button {
          flex: 1;
          background: white;
          color: #666;
          border: 1px solid #ddd;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: #f5f5f5;
        }

        .office-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .office-card h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .office-info p {
          margin: 5px 0;
          color: #666;
        }

        .success-message {
          background: #e8f5e8;
          border: 1px solid #c8e6c9;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }

        .success-message p {
          margin: 5px 0;
          color: #2e7d32;
        }

        .error-message {
          background: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          color: #c62828;
        }

        .profile-actions h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-button {
          display: block;
          text-decoration: none;
          background: #f5f5f5;
          color: #333;
          padding: 12px 20px;
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
          border: 1px solid #ddd;
          cursor: pointer;
          font-size: 16px;
        }

        .action-button:hover {
          background: #e0e0e0;
        }

        .action-button.secondary {
          background: #fff3e0;
          color: #f57c00;
          border-color: #ffcc02;
        }

        .action-button.secondary:hover {
          background: #ffcc02;
          color: white;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #FF9800;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .nav-links {
            flex-wrap: wrap;
            gap: 15px;
          }

          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .button-group {
            flex-direction: column;
          }

          .action-buttons {
            margin-top: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkerProfile;