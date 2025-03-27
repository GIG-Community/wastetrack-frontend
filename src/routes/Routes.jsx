// src/routes/Routes.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import ProtectedRoute from '../components/ProtectedRoute';

// Import dashboard spesifik
import SuperAdminDashboard from '../pages/dashboard/super_admin/SuperAdminDashboard';
import Users from '../pages/dashboard/super_admin/Users';
import WasteBanks from '../pages/dashboard/super_admin/WasteBanks';
import SystemSettings from '../pages/dashboard/super_admin/SystemSettings';
import WastebankAdminDashboard from '../pages/dashboard/wastebank/WastebankDashboard';
import BankSettings from '../pages/dashboard/wastebank/BankSettings';
import Employees from '../pages/dashboard/wastebank/Collector';
import Reports from '../pages/dashboard/wastebank/Reports';
import Transactions from '../pages/dashboard/wastebank/Transaction';
import WastebankEmployeeDashboard from '../pages/dashboard/wastebank_employee/WastebankEmployeeDashboard';
import CollectorDashboard from '../pages/dashboard/collector/CollectorDashboard';
import Assignments from '../pages/dashboard/collector/Assignments';
import CollectorRoutes from '../pages/dashboard/collector/CollectorRoutes';
import UpdateCollection from '../pages/dashboard/collector/UpdateCollection';
import CustomerDashboard from '../pages/dashboard/customer/CustomerDashboard';
import SchedulePickup from '../pages/dashboard/customer/SchedulePickup';
import DetectWaste from '../pages/dashboard/customer/DetectWaste';
import History from '../pages/dashboard/customer/History';
import Rewards from '../pages/dashboard/customer/Rewards';
import TrackPickup from '../pages/dashboard/customer/TrackPickup';
import GovernmentDashboard from '../pages/dashboard/government/GovernmentDashboard';
import WastebankReports from '../pages/dashboard/government/GovernmentReports';
import IndustryDashboard from '../pages/dashboard/industry/IndustryDashboard';
import OffsetPlannerIndustry from '../pages/dashboard/industry/OffsetPlannerIndustry';
import RecycledHubIndustry from '../pages/dashboard/industry/RecycledHubIndustry';
import GovernmentMonitoring from '../pages/dashboard/government/GovernmentMonitoring';
import GovernmentAnalytics from '../pages/dashboard/government/GovernmentAnalytics';

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Dashboard spesifik berdasarkan role */}
      {/* <Route path="/dashboard/super-admin/*" element={
        <ProtectedRoute>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } /> */}

<Route path="/dashboard/super-admin" element={
        <ProtectedRoute>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/super-admin/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/super-admin/wastebanks" element={
        <ProtectedRoute>
          <WasteBanks />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/super-admin/settings" element={
        <ProtectedRoute>
          <SystemSettings />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/super-admin/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank/" element={
        <ProtectedRoute>
          <WastebankAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank/bank-settings" element={
        <ProtectedRoute>
          <BankSettings />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank/employees" element={
        <ProtectedRoute>
          <Employees />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank/transactions" element={
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/wastebank-employee/*" element={
        <ProtectedRoute>
          <WastebankEmployeeDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/collector/" element={
        <ProtectedRoute>
          <CollectorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/collector/assignments" element={
        <ProtectedRoute>
          <Assignments />
        </ProtectedRoute>
      } />
       <Route path="/dashboard/collector/routes" element={
        <ProtectedRoute>
          <CollectorRoutes />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/collector/update-collection" element={
        <ProtectedRoute>
          <UpdateCollection />
        </ProtectedRoute>
      } />
       <Route path="/dashboard/collector/update-collection/:id" element={
        <ProtectedRoute>
          <UpdateCollection />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer" element={
        <ProtectedRoute>
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/schedule" element={
        <ProtectedRoute>
          <SchedulePickup />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/history" element={
        <ProtectedRoute>
          <History/>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/rewards" element={
        <ProtectedRoute>
          <Rewards />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/detect" element={
        <ProtectedRoute>
          <DetectWaste />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/customer/track" element={
        <ProtectedRoute>
          <TrackPickup />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/government/" element={
        <ProtectedRoute>
          <GovernmentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/government/wastebank-reports" element={
        <ProtectedRoute>
          <WastebankReports />
        </ProtectedRoute>
      } />
       <Route path="/dashboard/government/monitoring" element={
        <ProtectedRoute>
          <GovernmentMonitoring />
        </ProtectedRoute>
      } />
       <Route path="/dashboard/government/analytics" element={
        <ProtectedRoute>
          <GovernmentAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/industry/" element={
        <ProtectedRoute>
          <IndustryDashboard />
        </ProtectedRoute>
      } />
          <Route path="/dashboard/industry/offset-planner" element={
        <ProtectedRoute>
          <OffsetPlannerIndustry />
        </ProtectedRoute>
      } />
        <Route path="/dashboard/industry/recycledhub" element={
        <ProtectedRoute>
          <RecycledHubIndustry />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
