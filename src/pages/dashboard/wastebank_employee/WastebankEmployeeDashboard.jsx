// src/pages/dashboard/wastebank_employee/WastebankEmployeeDashboard.jsx
import React from 'react';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

const WastebankEmployeeDashboard = () => {
  const { userData } = useAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={userData?.role} />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Wastebank Employee Dashboard</h1>
        <p>Welcome, {userData?.profile.fullName}. Input transactions, record waste data, and submit your daily reports here.</p>
        {/* Tambahkan form input transaksi, pencatatan sampah, dll. */}
      </div>
    </div>
  );
};

export default WastebankEmployeeDashboard;
