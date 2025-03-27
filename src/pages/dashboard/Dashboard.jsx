// src/pages/dashboard/Dashboard.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { userData } = useAuth();

  // Jika data user belum ada, tampilkan pesan loading
  if (!userData || !userData.role) {
    return <div className="p-6 text-center">Loading dashboard...</div>;
  }

  // Redirect berdasarkan role
  switch (userData.role) {
    case 'super_admin':
      return <Navigate to="/dashboard/super-admin" replace />;
    case 'wastebank_admin':
      return <Navigate to="/dashboard/wastebank" replace />;
    case 'wastebank_employee':
      return <Navigate to="/dashboard/wastebank-employee" replace />;
    case 'collector':
      return <Navigate to="/dashboard/collector" replace />;
    case 'customer':
      return <Navigate to="/dashboard/customer" replace />;
    case 'government':
      return <Navigate to="/dashboard/government" replace />;
    case 'industry':
      return <Navigate to="/dashboard/industry" replace />;
    default:
      return <div className="p-6 text-center">Role tidak dikenali.</div>;
  }
};

export default Dashboard;
