// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData } = useAuth();

  // Periksa apakah user sudah login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Periksa apakah user memiliki role yang diizinkan
  if (allowedRoles && userData) {
    const userRole = userData.role;
    
    if (!allowedRoles.includes(userRole)) {
      // Arahkan ke halaman berdasarkan role pengguna jika tidak memiliki akses
      switch (userRole) {
        case 'customer':
          return <Navigate to="/dashboard/customer" replace />;
        case 'collector':
          return <Navigate to="/dashboard/collector" replace />;
        case 'wastebank_master_collector':
          return <Navigate to="/dashboard/collector-master" replace />;
        case 'wastebank_admin':
          return <Navigate to="/dashboard/wastebank" replace />;
        case 'wastebank_master':
          return <Navigate to="/dashboard/wastebank-master" replace />;
        case 'industry':
          return <Navigate to="/dashboard/industry" replace />;
        case 'marketplace':
          return <Navigate to="/dashboard/marketplace" replace />;
        case 'government':
          return <Navigate to="/dashboard/government" replace />;
        case 'super_admin':
          return <Navigate to="/dashboard/super-admin" replace />;
        default:
          // Default jika role tidak dikenali, arahkan ke login
          return <Navigate to="/login" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
