import React from 'react';
import { Navigate } from 'react-router-dom';
import authUtils from '../utils/authUtils';

const ProtectedRoute = ({ children, requireWorker = false }) => {
  // Check if user is logged in
  if (!authUtils.isLoggedIn()) {
    // Save the current path to redirect after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Check if worker access is required
  if (requireWorker && !authUtils.isWorker()) {
    alert('Access denied. Only workers can access this page.');
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has proper access
  return children;
};

export default ProtectedRoute;
