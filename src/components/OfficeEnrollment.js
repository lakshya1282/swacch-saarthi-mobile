import React, { useState } from 'react';
import axios from 'axios';

const OfficeEnrollment = ({ workerId, onEnrollmentComplete }) => {
  const [enrollmentStep, setEnrollmentStep] = useState('enter_code'); // enter_code, verify_office, confirm_enrollment
  const [officeCode, setOfficeCode] = useState('');
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerifyOfficeCode = async () => {
    if (!officeCode.trim()) {
      setError('Please enter an office code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://192.168.29.93:3000/api/worker/verify-office-code',
        { officeCode: officeCode.trim() }
      );

      if (response.data.success) {
        setOffice(response.data.office);
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
      setLoading(false);
    }
  };

  const handleEnrollInOffice = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://192.168.29.93:3000/api/worker/enroll-in-office',
        { 
          workerId: workerId,
          officeCode: officeCode.trim()
        }
      );

      if (response.data.success) {
        // Store enrollment info in localStorage for immediate use
        localStorage.setItem('workerOfficeCode', response.data.enrollment.officeCode);
        localStorage.setItem('workerOfficeName', response.data.enrollment.officeName);
        localStorage.setItem('workerEnrollmentStatus', 'enrolled');
        
        setEnrollmentStep('confirm_enrollment');
        
        // Call the completion callback after a short delay to show success message
        setTimeout(() => {
          onEnrollmentComplete(response.data.enrollment);
        }, 2000);
      }
    } catch (error) {
      console.error('Error enrolling in office:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to enroll in office. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetEnrollment = () => {
    setEnrollmentStep('enter_code');
    setOfficeCode('');
    setOffice(null);
    setError(null);
  };

  const renderEnterCodeStep = () => (
    <div className="enrollment-container">
      <div className="enrollment-header">
        <div className="icon-container">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
        <h2>Office Enrollment Required</h2>
        <p>To access the worker dashboard, you must enroll with your zone office using the official enrollment code.</p>
      </div>

      <div className="enrollment-form">
        <div className="form-group">
          <label htmlFor="officeCode">Office Enrollment Code</label>
          <input
            type="text"
            id="officeCode"
            value={officeCode}
            onChange={(e) => setOfficeCode(e.target.value.toUpperCase())}
            placeholder="Enter your office code (e.g., BAN202401)"
            className="form-input"
            maxLength={15}
          />
          <small className="form-hint">
            Contact your zone office supervisor to get your enrollment code
          </small>
        </div>

        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleVerifyOfficeCode}
          disabled={loading || !officeCode.trim()}
          className="primary-button"
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>

      <div className="enrollment-info">
        <h3>Why is enrollment required?</h3>
        <ul>
          <li>Ensures workers are properly assigned to their zone office</li>
          <li>Enables performance tracking and metrics</li>
          <li>Connects workers with their supervisors and office resources</li>
          <li>Required for incentive payments and work assignments</li>
        </ul>
      </div>
    </div>
  );

  const renderVerifyOfficeStep = () => (
    <div className="enrollment-container">
      <div className="enrollment-header">
        <div className="icon-container success">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        </div>
        <h2>Office Found!</h2>
        <p>Please verify this is the correct office before proceeding with enrollment.</p>
      </div>

      <div className="office-details">
        <div className="office-card">
          <h3>{office.officeName}</h3>
          <div className="office-info">
            <div className="info-item">
              <strong>Office Code:</strong> {office.officeCode}
            </div>
            <div className="info-item">
              <strong>Address:</strong> 
              <div className="address">
                {office.address.street}
                {office.address.area && <span>, {office.address.area}</span>}
                <br />
                {office.address.city}, {office.address.state} - {office.address.pincode}
              </div>
            </div>
            {office.contactInfo?.phone && (
              <div className="info-item">
                <strong>Phone:</strong> {office.contactInfo.phone}
              </div>
            )}
            {office.contactInfo?.email && (
              <div className="info-item">
                <strong>Email:</strong> {office.contactInfo.email}
              </div>
            )}
            {office.operationalHours && (
              <div className="info-item">
                <strong>Working Hours:</strong> 
                {office.operationalHours.startTime} - {office.operationalHours.endTime}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      <div className="button-group">
        <button onClick={resetEnrollment} className="secondary-button">
          Wrong Office? Go Back
        </button>
        <button
          onClick={handleEnrollInOffice}
          disabled={loading}
          className="primary-button"
        >
          {loading ? 'Enrolling...' : 'Confirm Enrollment'}
        </button>
      </div>
    </div>
  );

  const renderConfirmEnrollmentStep = () => (
    <div className="enrollment-container">
      <div className="enrollment-header">
        <div className="icon-container success">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        </div>
        <h2>Enrollment Successful!</h2>
        <p>You have been successfully enrolled in <strong>{office?.officeName}</strong></p>
      </div>

      <div className="success-message">
        <div className="success-card">
          <h3>🎉 Welcome to the team!</h3>
          <p>You can now access your worker dashboard and start accepting work assignments.</p>
          <div className="next-steps">
            <h4>What's next?</h4>
            <ul>
              <li>Your performance metrics will now be visible to your office</li>
              <li>You'll receive work assignments from your zone</li>
              <li>Your supervisor can track your progress and provide support</li>
              <li>You're eligible for incentives and performance bonuses</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="loading-message">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="office-enrollment-overlay">
      <div className="enrollment-modal">
        {enrollmentStep === 'enter_code' && renderEnterCodeStep()}
        {enrollmentStep === 'verify_office' && renderVerifyOfficeStep()}
        {enrollmentStep === 'confirm_enrollment' && renderConfirmEnrollmentStep()}
      </div>

      <style jsx>{`
        .office-enrollment-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .enrollment-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .enrollment-container {
          padding: 40px;
        }

        .enrollment-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .icon-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f0f4ff;
          color: #4f46e5;
          margin-bottom: 20px;
        }

        .icon-container.success {
          background: #f0fdf4;
          color: #16a34a;
        }

        .enrollment-header h2 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 28px;
          font-weight: 700;
        }

        .enrollment-header p {
          margin: 0;
          color: #6b7280;
          font-size: 16px;
          line-height: 1.5;
        }

        .enrollment-form {
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-hint {
          display: block;
          margin-top: 6px;
          color: #6b7280;
          font-size: 14px;
        }

        .primary-button {
          width: 100%;
          padding: 12px 24px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .primary-button:hover:not(:disabled) {
          background: #4338ca;
        }

        .primary-button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .secondary-button {
          padding: 12px 24px;
          background: white;
          color: #6b7280;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .button-group .secondary-button {
          flex: 1;
        }

        .button-group .primary-button {
          flex: 2;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .enrollment-info {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
        }

        .enrollment-info h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .enrollment-info ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }

        .enrollment-info li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .office-details {
          margin-bottom: 30px;
        }

        .office-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
        }

        .office-card h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }

        .office-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          color: #4b5563;
          line-height: 1.5;
        }

        .info-item strong {
          color: #1f2937;
          display: inline-block;
          min-width: 100px;
        }

        .address {
          display: inline-block;
          margin-left: 8px;
        }

        .success-message {
          margin-bottom: 30px;
        }

        .success-card {
          background: #f0fdf4;
          border: 2px solid #bbf7d0;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .success-card h3 {
          margin: 0 0 12px 0;
          color: #16a34a;
          font-size: 20px;
        }

        .success-card p {
          margin: 0 0 20px 0;
          color: #15803d;
        }

        .next-steps {
          text-align: left;
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }

        .next-steps h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }

        .next-steps ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }

        .next-steps li {
          margin-bottom: 8px;
        }

        .loading-message {
          text-align: center;
          padding: 20px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .loading-message p {
          color: #6b7280;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .enrollment-modal {
            margin: 10px;
          }

          .enrollment-container {
            padding: 20px;
          }

          .button-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default OfficeEnrollment;