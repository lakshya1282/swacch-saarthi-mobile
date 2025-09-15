import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './utils/debugAuth'; // Import debug helper for development
import './utils/demoDataHelper'; // Import demo data helper for testing
import './utils/clearTestData'; // Import clear test data for worker dashboard
import pickupSyncService from './services/pickupSyncService'; // Import pickup sync service

// Components
import HomePage from './components/HomePage';
import RegisterScreen from './components/RegisterScreen';
import LoginScreen from './components/LoginScreen';
import TrainingScreen from './components/TrainingScreen';
import SchedulePickupScreen from './components/SchedulePickupScreen';
import DemoInstructions from './components/DemoInstructions';
import WorkerDashboard from './components/WorkerDashboard';
import MyPickupsScreen from './components/MyPickupsScreen';
import ProtectedRoute from './components/ProtectedRoute';
import MyWorks from './components/MyWorks';
import FindWorks from './components/FindWorks';
import WorkerProfile from './components/WorkerProfile';
import WorkerPerformance from './components/WorkerPerformance';

const App = () => {
  // Initialize sync service on app start
  React.useEffect(() => {
    // Sync pickups when app starts (if user is logged in)
    const initializeSync = async () => {
      // Wait a bit for localStorage to be available and any initial auth to complete
      setTimeout(() => {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (token && userId) {
          console.log('🚀 App initialized, triggering pickup sync...');
          pickupSyncService.syncPickups(true); // Force initial sync
        }
      }, 1500);
    };
    
    initializeSync();
  }, []);
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<DemoInstructions />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/training" element={<TrainingScreen />} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePickupScreen /></ProtectedRoute>} />
          <Route path="/pickups" element={<ProtectedRoute><MyPickupsScreen /></ProtectedRoute>} />
          <Route path="/worker" element={<ProtectedRoute requireWorker={true}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker-dashboard" element={<ProtectedRoute requireWorker={true}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/my-works" element={<ProtectedRoute requireWorker={true}><MyWorks /></ProtectedRoute>} />
          <Route path="/worker/find-works" element={<ProtectedRoute requireWorker={true}><FindWorks /></ProtectedRoute>} />
          <Route path="/worker/profile" element={<ProtectedRoute requireWorker={true}><WorkerProfile /></ProtectedRoute>} />
          <Route path="/worker/performance" element={<ProtectedRoute requireWorker={true}><WorkerPerformance /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
