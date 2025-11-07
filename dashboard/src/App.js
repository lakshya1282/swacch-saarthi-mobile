import React, { useState, useEffect } from 'react';
import './App.css';
import OfficeRegistration from './components/OfficeRegistration';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [officeData, setOfficeData] = useState(null);
  const [operatorData, setOperatorData] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication on app load
    const storedToken = localStorage.getItem('dashboardToken');
    const storedOffice = localStorage.getItem('officeData');
    const storedOperator = localStorage.getItem('operatorData');

    if (storedToken && storedOffice && storedOperator) {
      try {
        setAuthToken(storedToken);
        setOfficeData(JSON.parse(storedOffice));
        setOperatorData(JSON.parse(storedOperator));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored data:', error);
        // Clear invalid stored data
        localStorage.removeItem('dashboardToken');
        localStorage.removeItem('officeData');
        localStorage.removeItem('operatorData');
      }
    }
    
    setLoading(false);
  }, []);

  const handleRegistrationSuccess = (registrationData) => {
    const { token, office, operator } = registrationData;
    
    // Store authentication data
    localStorage.setItem('dashboardToken', token);
    localStorage.setItem('officeData', JSON.stringify(office));
    localStorage.setItem('operatorData', JSON.stringify(operator));
    
    // Update state
    setAuthToken(token);
    setOfficeData(office);
    setOperatorData(operator);
    setIsAuthenticated(true);
    setShowRegistration(false);
  };

  const handleLogout = () => {
    // Clear stored data
    localStorage.removeItem('dashboardToken');
    localStorage.removeItem('officeData');
    localStorage.removeItem('operatorData');
    
    // Reset state
    setAuthToken(null);
    setOfficeData(null);
    setOperatorData(null);
    setIsAuthenticated(false);
    setShowRegistration(false);
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };

  const handleLoginSuccess = (loginData) => {
    const { token, office, operator } = loginData;
    
    // Store authentication data
    localStorage.setItem('dashboardToken', token);
    localStorage.setItem('officeData', JSON.stringify(office));
    localStorage.setItem('operatorData', JSON.stringify(operator));
    
    // Update state
    setAuthToken(token);
    setOfficeData(office);
    setOperatorData(operator);
    setIsAuthenticated(true);
    setShowRegistration(false);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Dashboard...</div>
      </div>
    );
  }

  if (isAuthenticated && authToken && officeData) {
    return (
      <Dashboard
        authToken={authToken}
        officeData={officeData}
        operatorData={operatorData}
        onLogout={handleLogout}
      />
    );
  }

  if (showRegistration) {
    return (
      <OfficeRegistration
        onRegistrationSuccess={handleRegistrationSuccess}
        onBackToLogin={() => setShowRegistration(false)}
      />
    );
  }

  // Login/Welcome Screen
  return (
    <div className="app">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🌍 Sahayak Sarthi Management Dashboard</h1>
            <p>Monitor worker performance and track incentives in real-time</p>
          </div>
          
          <div className="auth-content">
            <div className="welcome-features">
              <div className="feature">
                <div className="feature-icon">🌱</div>
                <h3>Real-time Analytics</h3>
                <p>Monitor worker performance and collection metrics live</p>
              </div>
              
              <div className="feature">
                <div className="feature-icon">🌿</div>
                <h3>Incentive Tracking</h3>
                <p>Automatic calculation at ₹10/kg for collections above 15kg threshold</p>
              </div>
              
              <div className="feature">
                <div className="feature-icon">🌳</div>
                <h3>Worker Management</h3>
                <p>Comprehensive worker performance and location tracking</p>
              </div>
              
              <div className="feature">
                <div className="feature-icon">♻️</div>
                <h3>Mobile Integration</h3>
                <p>Seamless integration with mobile waste collection app</p>
              </div>
            </div>
            
            <div className="auth-actions">
              <button
                className="btn btn-primary"
                onClick={handleShowRegistration}
              >
                Register New Office
              </button>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
        
        <div className="auth-footer">
            <div className="system-info">
              <div className="info-item">
                <strong>Backend Server:</strong> http://localhost:3001
              </div>
            <div className="info-item">
              <strong>Dashboard Interface:</strong> Real-time monitoring enabled
            </div>
            <div className="info-item">
              <strong>Incentive System:</strong> 15kg threshold, ₹10 per kg excess
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Login Form Component
const LoginForm = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/dashboard/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        onLoginSuccess(data);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="login-form">
      <h3>Login to Existing Office</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="form-group">
        <input
          type="email"
          placeholder="Operator Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      <button
        type="submit"
        className="btn btn-secondary"
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default App;