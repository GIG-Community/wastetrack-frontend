import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import ProtectedRoute from '../components/ProtectedRoute';

// Import dashboard spesifik
import SuperAdminDashboard from '../pages/dashboard/super-admin/SuperAdminDashboard';
import Users from '../pages/dashboard/super-admin/Users';
import WasteBanks from '../pages/dashboard/super-admin/WasteBanks';
import SystemSettings from '../pages/dashboard/super-admin/SystemSettings';
import WastebankAdminDashboard from '../pages/dashboard/wastebank/WastebankDashboard';
import BankSettings from '../pages/dashboard/wastebank/BankSettings';
import Employees from '../pages/dashboard/wastebank/Collector';
import Reports from '../pages/dashboard/wastebank/Reports';
import Transactions from '../pages/dashboard/wastebank/Transaction';
import CollectorDashboard from '../pages/dashboard/collector/CollectorDashboard';
import Assignments from '../pages/dashboard/collector/Assignments';
import CollectorRoutes from '../pages/dashboard/collector/CollectorRoutes';
import UpdateCollection from '../pages/dashboard/collector/UpdateCollection';
import CollectorCollections from '../pages/dashboard/collector/CollectorCollections';
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
import MarketplaceDashboard from '../pages/dashboard/marketplace/MarketplaceDashboard';
import Products from '../pages/dashboard/marketplace/Products';
import Orders from '../pages/dashboard/marketplace/Orders';
import Marketplace from '../pages/dashboard/customer/Rewards';
import CustomerMarketplace from '../pages/dashboard/customer/CustomerMarketplace';
import ProductDetails from '../pages/dashboard/customer/ProductDetails';
import Checkout from '../pages/dashboard/customer/Checkout';
import OrderConfirmation from '../pages/dashboard/customer/OrderConfirmation';
import SalaryManagement from '../pages/dashboard/wastebank/SalaryManagement';
import RequestCollection from '../pages/dashboard/wastebank/RequestCollection';
import WastebankMasterDashboard from '../pages/dashboard/wastebank-master/WastebankMasterDashboard';
import MasterTransaction from '../pages/dashboard/wastebank-master/MasterTransaction';
import MasterCollector from '../pages/dashboard/wastebank-master/MasterCollector';
import MasterReports from '../pages/dashboard/wastebank-master/MasterReports';
import MasterWarehouse from '../pages/dashboard/wastebank-master/MasterWarehouse';
import MasterSalaryManagement from '../pages/dashboard/wastebank-master/MasterSalary';
import MasterRequestCollection from '../pages/dashboard/wastebank-master/RequestCollection';
import MasterAssignment from '../pages/dashboard/collector-master/MasterAssignments';
import MasterCollections from '../pages/dashboard/collector-master/MasterCollections';
import MasterCollectorDashboard from '../pages/dashboard/collector-master/MasterCollectorDashboard';
import MasterRoutes from '../pages/dashboard/collector-master/MasterRoutes';
import MasterUpdateCollection from '../pages/dashboard/collector-master/MasterUpdateCollection';

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    
    {/* Protected routes */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
    
    {/* Super Admin Routes */}
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

    {/* Wastebank Routes */}
    <Route path="/dashboard/wastebank/" element={
      <ProtectedRoute>
        <WastebankAdminDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank/warehouse-storage" element={
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
    <Route path="/dashboard/wastebank/salary" element={
      <ProtectedRoute>
        <SalaryManagement />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank/request-induk" element={
      <ProtectedRoute>
        <RequestCollection />
      </ProtectedRoute>
    } />

    {/* Collector Routes */}
    <Route path="/dashboard/collector" element={
      <ProtectedRoute>
        <CollectorCollections />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/collector/dashboard" element={
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
    <Route path="/dashboard/collector/collections" element={
      <ProtectedRoute>
        <CollectorCollections />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/collector/update-collection/:pickupId" element={
      <ProtectedRoute>
        <UpdateCollection />
      </ProtectedRoute>
    } />

    {/* Customer Routes */}
    <Route path="/dashboard/customer" element={
      <ProtectedRoute>
        <CustomerDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/schedule-pickup" element={
      <ProtectedRoute>
        <SchedulePickup />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/detect-waste" element={
      <ProtectedRoute>
        <DetectWaste />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/history" element={
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/rewards" element={
      <ProtectedRoute>
        <Rewards />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/track-pickup" element={
      <ProtectedRoute>
        <TrackPickup />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/marketplace" element={
      <ProtectedRoute>
        <CustomerMarketplace />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/marketplace/product/:id" element={
      <ProtectedRoute>
        <ProductDetails />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/marketplace/checkout" element={
      <ProtectedRoute>
        <Checkout />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/customer/marketplace/order-confirmation/:id" element={
      <ProtectedRoute>
        <OrderConfirmation />
      </ProtectedRoute>
    } />

    {/* Government Routes */}
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

    {/* Industry Routes */}
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

    {/* Wastebank Master Routes */}
    <Route path="/dashboard/wastebank-master" element={
      <ProtectedRoute>
        <WastebankMasterDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/transactions" element={
      <ProtectedRoute>
        <MasterTransaction />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/collectors" element={
      <ProtectedRoute>
        <MasterCollector />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/warehouse" element={
      <ProtectedRoute>
        <MasterWarehouse />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/salary" element={
      <ProtectedRoute>
        <MasterSalaryManagement />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/reports" element={
      <ProtectedRoute>
        <MasterReports />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/wastebank-master/requests" element={
      <ProtectedRoute>
        <MasterRequestCollection />
      </ProtectedRoute>
    } />

    {/* Collector Master Routes */}
    <Route path="/dashboard/collector-master" element={
      <ProtectedRoute>
        <MasterCollectorDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/collector-master/assignments" element={
      <ProtectedRoute>
        <MasterAssignment />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/collector-master/routes" element={
      <ProtectedRoute>
        <MasterRoutes />
      </ProtectedRoute>
    } />
     <Route path="/dashboard/collector-master/collections" element={
      <ProtectedRoute>
        <MasterCollections />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/collector-master/update-collection/:pickupId" element={
      <ProtectedRoute>
        <MasterUpdateCollection />
      </ProtectedRoute>
    } />

    {/* Marketplace Routes */}
    <Route path="/dashboard/marketplace" element={
      <ProtectedRoute>
        <MarketplaceDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/marketplace/products" element={
      <ProtectedRoute>
        <Products />
      </ProtectedRoute>
    } />
    <Route path="/dashboard/marketplace/orders" element={
      <ProtectedRoute>
        <Orders />
      </ProtectedRoute>
    } />

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default AppRoutes;
