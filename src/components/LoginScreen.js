import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import authUtils from '../utils/authUtils';
import pickupSyncService from '../services/pickupSyncService';

const LoginScreen = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', formData);
      
      if (response.data.success) {
        // Save authentication data using authUtils
        authUtils.login(response.data.token, response.data.user);
        
        setMessage('Login successful! Syncing data...');
        
        // Trigger pickup sync after successful login
        setTimeout(() => {
          pickupSyncService.syncPickups(true).then((result) => {
            console.log('📲 Post-login sync result:', result);
          }).catch((error) => {
            console.log('⚠️ Post-login sync failed:', error);
          });
        }, 500);
        
        // Check if there's a redirect path saved (from protected route attempt)
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          setTimeout(() => {
            navigate(redirectPath);
          }, 1000);
        } else {
          // Redirect based on user type
          setTimeout(() => {
            if (response.data.user.userType === 'citizen') {
              navigate('/');
            } else {
              navigate('/worker-dashboard');
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setMessage(error.response.data.message);
      } else if (error.code === 'ERR_NETWORK') {
        // FALLBACK: Demo mode when server is not available
        console.log('🔄 Backend server not available, using demo mode...');
        
        // Demo credentials check
        const demoUsers = [
          { email: 'citizen@demo.com', password: 'demo123', userType: 'citizen', firstName: 'Demo', lastName: 'Citizen' },
          { email: 'worker@demo.com', password: 'demo123', userType: 'worker', firstName: 'Demo', lastName: 'Worker' },
          { email: 'admin@demo.com', password: 'admin123', userType: 'citizen', firstName: 'Admin', lastName: 'User' },
          { email: 'test@test.com', password: 'test123', userType: 'citizen', firstName: 'Test', lastName: 'User' }
        ];
        
        const demoUser = demoUsers.find(u => u.email === formData.email && u.password === formData.password);
        
        if (demoUser) {
          // Generate a demo token
          const demoToken = 'demo-token-' + Date.now();
          const userData = {
            id: 'demo-user-' + Date.now(),
            userId: 'demo-user-' + Date.now(),
            ...demoUser,
            phone: '+91 9876543210',
            address: 'Demo Address, Bangalore',
            pincode: '560001'
          };
          
          // Save authentication data
          authUtils.login(demoToken, userData);
          
          setMessage('Demo mode: Login successful!');
          
          // Redirect after successful demo login
          setTimeout(() => {
            const redirectPath = localStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
              localStorage.removeItem('redirectAfterLogin');
              navigate(redirectPath);
            } else if (demoUser.userType === 'worker') {
              navigate('/worker-dashboard');
            } else {
              navigate('/');
            }
          }, 1000);
        } else {
          setMessage('Demo Mode: Use citizen@demo.com / demo123 for citizen or worker@demo.com / demo123 for worker access');
        }
      } else {
        setMessage('Login failed. Please try again.');
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

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>Login</h1>
          <p>Welcome back to Waste Management App</p>
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
        <div className="card" style={{maxWidth: '400px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
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
              <label>Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {message && (
              <div className={message.includes('successful') ? 'success-message' : 'error-message'}>
                {message}
              </div>
            )}

            <button type="submit" className="button" style={{width: '100%'}} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{textAlign: 'center', marginTop: '20px'}}>
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>
          
          <div style={{marginTop: '30px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px', border: '1px solid #4CAF50'}}>
            <h4 style={{color: '#4CAF50', marginBottom: '10px'}}>🔐 Demo Credentials</h4>
            <p style={{fontSize: '14px', marginBottom: '5px'}}>
              <strong>Citizen Access:</strong> citizen@demo.com / demo123
            </p>
            <p style={{fontSize: '14px', marginBottom: '5px'}}>
              <strong>Worker Access:</strong> worker@demo.com / demo123
            </p>
            <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
              Note: Demo mode is active when backend server is not running.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
