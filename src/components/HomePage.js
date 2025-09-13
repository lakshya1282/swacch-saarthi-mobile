import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authUtils from '../utils/authUtils';

const HomePage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const stats = {
    wasteCollected: '1.7L',
    citizensTrained: '50K+',
    pickupsCompleted: '25K+',
    satisfaction: '4.8/5'
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const loggedIn = authUtils.isLoggedIn();
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      setCurrentUser(authUtils.getCurrentUser());
    }
  };

  const handleProtectedNavigation = (path) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      // Save intended destination
      localStorage.setItem('redirectAfterLogin', path);
      // Show alert and redirect to register
      alert('Please register or login to access this feature!');
      navigate('/register');
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>🌱 Waste Management App</h1>
          <p>Building a cleaner and sustainable India through technology</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            {!isLoggedIn ? (
              <>
                <li><Link to="/register">Register</Link></li>
                <li><Link to="/login">Login</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/training">Training</Link></li>
                <li><Link to="/schedule">Schedule Pickup</Link></li>
                <li><Link to="/pickups">My Pickups</Link></li>
                <li>
                  <span style={{color: '#4CAF50', fontWeight: 'bold'}}>
                    👤 {currentUser?.firstName || 'User'}
                  </span>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      authUtils.logout();
                      checkAuthStatus();
                      navigate('/');
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #f44336',
                      color: '#f44336',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      <div className="container">
        {/* Quick Access for Logged-in Users */}
        {isLoggedIn && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h2 style={{ margin: '0 0 10px 0' }}>Welcome back, {currentUser?.firstName}! 👋</h2>
                <p style={{ margin: 0, opacity: 0.9 }}>Quick access to your waste management services</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/schedule')}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid white',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                >
                  📦 Schedule Pickup
                </button>
                <button
                  onClick={() => navigate('/pickups')}
                  style={{
                    padding: '10px 20px',
                    background: 'white',
                    border: 'none',
                    color: '#667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  📃 View My Pickups
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.wasteCollected}</div>
            <div className="stat-label">Tonnes Collected Daily</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.citizensTrained}</div>
            <div className="stat-label">Citizens Trained</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.pickupsCompleted}</div>
            <div className="stat-label">Pickups Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.satisfaction}</div>
            <div className="stat-label">User Satisfaction</div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="card">
          <h2>🚨 The Challenge</h2>
          <p>
            In FY 2021–22, India generated approximately <strong>1.7 lakh tonnes</strong> of municipal solid waste daily, 
            of which only <strong>54%</strong> was scientifically treated. Around 24% was dumped in landfills and 22% remained unaccounted due to leakages in the waste management chain.
          </p>
          <p>
            This unaccounted waste is often burned or disposed of in open areas, drains, or water bodies, 
            posing severe environmental and public health risks.
          </p>
        </div>

        {/* Features */}
        <h2 style={{textAlign: 'center', margin: '40px 0', color: '#333'}}>Our Solution</h2>
        <div className="grid">
          <div className="card">
            <div className="feature-icon">🎓</div>
            <h3>Interactive Training</h3>
            <p>
              Comprehensive waste management education with interactive modules, quizzes, and progress tracking. 
              Learn proper segregation, composting, and waste reduction techniques.
            </p>
            <button 
              onClick={() => handleProtectedNavigation('/training')} 
              className="button" 
              style={{marginTop: '15px'}}
            >
              Start Training
            </button>
          </div>

          <div className="card">
            <div className="feature-icon">📱</div>
            <h3>Smart Pickup Scheduling</h3>
            <p>
              Zomato-like interface for scheduling waste pickups. Choose time slots, select waste types, 
              and track your pickup in real-time with GPS-enabled worker assignment.
            </p>
            <button 
              onClick={() => handleProtectedNavigation('/schedule')} 
              className="button" 
              style={{marginTop: '15px'}}
            >
              Schedule Pickup
            </button>
          </div>

          <div className="card">
            <div className="feature-icon">🤖</div>
            <h3>AI Waste Validation</h3>
            <p>
              Upload photos of your segregated waste and get instant AI-powered feedback. 
              Learn from mistakes and improve your segregation skills with detailed suggestions.
            </p>
            <button className="button" style={{marginTop: '15px'}}>Validate Waste</button>
          </div>

          <div className="card">
            <div className="feature-icon">📍</div>
            <h3>GPS Location Tracking</h3>
            <p>
              Real-time location tracking for efficient waste collection. Workers are assigned based on proximity, 
              ensuring faster service and optimal route planning.
            </p>
            <button className="button" style={{marginTop: '15px'}}>View Map</button>
          </div>

          <div className="card">
            <div className="feature-icon">✅</div>
            <h3>QR Code Confirmation</h3>
            <p>
              Digital confirmation system using QR codes. No more disputes - every pickup is verified 
              digitally with time stamps and worker verification.
            </p>
            <button className="button" style={{marginTop: '15px'}}>Learn More</button>
          </div>

          <div className="card">
            <div className="feature-icon">⭐</div>
            <h3>Rating & Feedback</h3>
            <p>
              Rate your pickup experience and provide feedback. Help us maintain quality service 
              and recognize outstanding workers in your community.
            </p>
            <button className="button" style={{marginTop: '15px'}}>Rate Service</button>
          </div>
        </div>

        {/* Worker Section - Show only if user is a worker */}
        {isLoggedIn && currentUser?.userType === 'worker' && (
          <div className="card" style={{textAlign: 'center', background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)', color: 'white', marginBottom: '20px'}}>
            <h2>👷 Worker Dashboard</h2>
            <p style={{fontSize: '1.1rem', margin: '20px 0'}}>
              Manage your waste collection assignments and track earnings
            </p>
            <Link to="/worker" className="button" style={{background: 'white', color: '#FF6B6B', fontSize: '1.1rem', padding: '12px 25px'}}>
              🚛 Go to Worker Dashboard
            </Link>
          </div>
        )}
        
        {/* Show Worker Registration CTA if not logged in */}
        {!isLoggedIn && (
          <div className="card" style={{textAlign: 'center', background: 'linear-gradient(135deg, #FF9800, #F57C00)', color: 'white', marginBottom: '20px'}}>
            <h2>👷 Become a Waste Collection Worker</h2>
            <p style={{fontSize: '1.1rem', margin: '20px 0'}}>
              Join our team of workers and earn money by collecting waste from citizens
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
              <Link to="/register" className="button" style={{background: 'white', color: '#FF9800', fontSize: '1.1rem', padding: '12px 25px'}}>
                📝 Register as Worker
              </Link>
              <Link to="/login" className="button" style={{background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid white', fontSize: '1.1rem', padding: '12px 25px'}}>
                🔐 Worker Login
              </Link>
            </div>
          </div>
        )}

        {/* Demo Call to Action */}
        <div className="card" style={{textAlign: 'center', background: 'linear-gradient(135deg, #FF9800, #F57C00)', color: 'white', border: '3px solid #FF5722'}}>
          <h2>🚀 Try the Live Demo!</h2>
          <p style={{fontSize: '1.2rem', margin: '20px 0'}}>
            Test the complete registration system with real GPS tracking, email notifications, and database integration
          </p>
          <Link to="/demo" className="button" style={{background: 'white', color: '#FF9800', fontSize: '1.2rem', padding: '15px 30px'}}>
            📱 Start Interactive Demo
          </Link>
        </div>

        {/* Call to Action */}
        <div className="card" style={{textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white'}}>
          <h2>Ready to Make a Difference?</h2>
          <p style={{fontSize: '1.2rem', margin: '20px 0'}}>
            Join thousands of citizens already contributing to a cleaner India
          </p>
          <div style={{display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link to="/register" className="button" style={{background: 'white', color: '#4CAF50'}}>
              Register as Citizen
            </Link>
            <Link to="/register" className="button" style={{background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid white'}}>
              Register as Worker
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center', padding: '40px 0', color: '#666'}}>
          <p>&copy; 2024 Waste Management App. Together, let's build a cleaner and sustainable India! 🇮🇳</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
