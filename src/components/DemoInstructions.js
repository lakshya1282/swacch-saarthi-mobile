import React from 'react';
import { Link } from 'react-router-dom';

const DemoInstructions = () => {
  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>🚀 Demo Instructions</h1>
          <p>How to test the working registration and email system</p>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2>📋 Testing Steps</h2>
          <ol style={{lineHeight: '2', fontSize: '16px'}}>
            <li>Make sure both servers are running:
              <ul style={{marginTop: '10px', marginBottom: '15px'}}>
                <li>✅ Frontend: <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">http://localhost:3001</a></li>
                <li>✅ Backend API: <a href="http://localhost:3000/api/health" target="_blank" rel="noopener noreferrer">http://localhost:3000/api/health</a></li>
              </ul>
            </li>
            
            <li><strong>Register a New User:</strong>
              <ul style={{marginTop: '10px', marginBottom: '15px'}}>
                <li>Go to <Link to="/register">Registration Page</Link></li>
                <li>Fill in all details (use real format for phone: 9876543210)</li>
                <li>Your browser will ask for location permission - allow it</li>
                <li>Click "Register"</li>
              </ul>
            </li>
            
            <li><strong>Watch the Magic Happen:</strong>
              <ul style={{marginTop: '10px', marginBottom: '15px'}}>
                <li>🌍 GPS location gets captured automatically</li>
                <li>📧 "Email" gets sent (simulated - check browser console)</li>
                <li>📱 "SMS" gets sent (simulated - check browser console)</li>
                <li>✅ Success message shows all notifications</li>
                <li>💾 User data gets saved to MongoDB database</li>
              </ul>
            </li>
            
            <li><strong>Login with Your Credentials:</strong>
              <ul style={{marginTop: '10px', marginBottom: '15px'}}>
                <li>Go to <Link to="/login">Login Page</Link></li>
                <li>Enter the email and password you just registered</li>
                <li>Get redirected to training modules</li>
              </ul>
            </li>
            
            <li><strong>Explore the App:</strong>
              <ul style={{marginTop: '10px', marginBottom: '15px'}}>
                <li>Complete <Link to="/training">Training Modules</Link></li>
                <li>Try <Link to="/schedule">Scheduling a Pickup</Link></li>
                <li>See the Zomato-like interface in action</li>
              </ul>
            </li>
          </ol>
        </div>

        <div className="card">
          <h3>🔍 What's Happening Behind the Scenes?</h3>
          <div className="grid">
            <div className="card">
              <h4>📍 Location Capture</h4>
              <p>Your browser's geolocation API captures your real GPS coordinates and saves them to the database for worker assignment optimization.</p>
            </div>
            
            <div className="card">
              <h4>🔐 Secure Registration</h4>
              <p>Passwords are hashed using bcrypt, JWT tokens are generated, and all data is validated before saving to MongoDB.</p>
            </div>
            
            <div className="card">
              <h4>📧 Notifications</h4>
              <p>The system simulates sending welcome emails and SMS messages. In production, this would integrate with services like SendGrid or Twilio.</p>
            </div>
            
            <div className="card">
              <h4>🗄️ Database Storage</h4>
              <p>All user data, including location coordinates, is securely stored in MongoDB with proper indexing for performance.</p>
            </div>
          </div>
        </div>

        <div className="card" style={{background: '#fff3cd', border: '1px solid #ffeaa7'}}>
          <h3>⚠️ Important Notes</h3>
          <ul style={{lineHeight: '1.8'}}>
            <li><strong>Email System:</strong> Currently simulated. Check the backend terminal to see "sent" notifications.</li>
            <li><strong>Location Permission:</strong> Your browser will ask for location access - this is required for the demo.</li>
            <li><strong>Database:</strong> Using real MongoDB - all registrations are actually saved!</li>
            <li><strong>API Integration:</strong> Frontend communicates with real Node.js backend API.</li>
          </ul>
        </div>

        <div style={{textAlign: 'center', marginTop: '30px'}}>
          <Link to="/register" className="button" style={{marginRight: '20px'}}>
            🚀 Start Demo Registration
          </Link>
          <Link to="/" className="button button-secondary">
            🏠 Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DemoInstructions;
