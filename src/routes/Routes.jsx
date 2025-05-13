import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import ProtectedRoute from '../components/ProtectedRoute';
import NotFound from '../pages/NotFound';
import Forbidden from '../pages/Forbidden';
import ServerError from '../pages/ServerError';
import Maintenance from '../pages/Maintenance';
import DevelopmentModal from '../components/DevelopmentModal';

// Import dashboard spesifik
import SuperAdminDashboard from '../pages/dashboard/super-admin/SuperAdminDashboard';
import Users from '../pages/dashboard/super-admin/Users';
import WasteBanks from '../pages/dashboard/super-admin/WasteBanks';
import SystemSettings from '../pages/dashboard/super-admin/SystemSettings';
import WastebankAdminDashboard from '../pages/dashboard/wastebank/WastebankDashboard';
import Warehouse from '../pages/dashboard/wastebank/Warehouse';
import Employees from '../pages/dashboard/wastebank/Collector';
import Reports from '../pages/dashboard/wastebank/Reports';
import Transactions from '../pages/dashboard/wastebank/Transaction';
import SalaryManagement from '../pages/dashboard/wastebank/SalaryManagement';
import RequestCollection from '../pages/dashboard/wastebank/RequestCollection';
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
import CustomerMarketplace from '../pages/dashboard/customer/CustomerMarketplace';
import ProductDetails from '../pages/dashboard/customer/ProductDetails';
import Checkout from '../pages/dashboard/customer/Checkout';
import OrderConfirmation from '../pages/dashboard/customer/OrderConfirmation';
import CustomerProfile from '../pages/dashboard/customer/Profile';
import PickLocation from '../components/PickLocation';
import GovernmentDashboard from '../pages/dashboard/government/GovernmentDashboard';
import WastebankReports from '../pages/dashboard/government/GovernmentReports';
import GovernmentMonitoring from '../pages/dashboard/government/GovernmentMonitoring';
import GovernmentAnalytics from '../pages/dashboard/government/GovernmentAnalytics';
import IndustryDashboard from '../pages/dashboard/industry/IndustryDashboard';
import OffsetPlannerIndustry from '../pages/dashboard/industry/OffsetPlannerIndustry';
import RecycledHubIndustry from '../pages/dashboard/industry/RecycledHubIndustry';
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
import MarketplaceDashboard from '../pages/dashboard/marketplace/MarketplaceDashboard';
import Products from '../pages/dashboard/marketplace/Products';
import Orders from '../pages/dashboard/marketplace/Orders';

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    
    {/* General Protected route - redirects based on user role */}
    <Route path="/dashboard" element={
      <ProtectedRoute allowedRoles={['customer', 'collector', 'wastebank_admin', 'wastebank_master', 'wastebank_master_collector', 'industry', 'marketplace', 'government', 'super_admin']}>
        <Dashboard />
      </ProtectedRoute>
    } />

    {/* Error Pages */}
    <Route path="/403" element={<Forbidden />} />
    <Route path="/404" element={<NotFound />} />
    <Route path="/500" element={<ServerError />} />

    {/* Redirect to 404 for any unmatched routes */}
    {/* <Route path="*" element={<NotFound />} /> */}

    {/* Maintenance Page */}
    <Route path="/maintenance" element={<Maintenance />} />
    
    {/* Development Modal */}
    <Route path="/feature-development" element={<DevelopmentModal />} />

    {/* Location Correction */}
    <Route path="/pick-location" element={<PickLocation />} />

    {/* Super Admin Routes */}
    <Route path="/dashboard/super-admin/*" element={
      <ProtectedRoute allowedRoles={['super_admin']}>
        <Routes>
          <Route path="/" element={<SuperAdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="wastebanks" element={<WasteBanks />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Wastebank Routes */}
    <Route path="/dashboard/wastebank/*" element={
      <ProtectedRoute allowedRoles={['wastebank_admin']}>
        <Routes>
          <Route path="/" element={<WastebankAdminDashboard />} />
          <Route path="warehouse-storage" element={<Warehouse />} />
          <Route path="employees" element={<Employees />} />
          <Route path="reports" element={<Reports />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="salary" element={<SalaryManagement />} />
          <Route path="request-induk" element={<RequestCollection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Collector Routes */}
    <Route path="/dashboard/collector/*" element={
      <ProtectedRoute allowedRoles={['collector']}>
        <Routes>
          <Route path="/" element={<CollectorCollections />} />
          <Route path="dashboard" element={<CollectorDashboard />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="routes" element={<CollectorRoutes />} />
          <Route path="collections" element={<CollectorCollections />} />
          <Route path="update-collection/:pickupId" element={<UpdateCollection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Customer Routes */}
    <Route path="/dashboard/customer/*" element={
      <ProtectedRoute allowedRoles={['customer']}>
        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="schedule-pickup" element={<SchedulePickup />} />
          <Route path="detect-waste" element={<DetectWaste />} />
          <Route path="history" element={<History />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="track-pickup" element={<TrackPickup />} />
          <Route path="marketplace" element={<CustomerMarketplace />} />
          <Route path="marketplace/product/:id" element={<ProductDetails />} />
          <Route path="marketplace/checkout" element={<Checkout />} />
          <Route path="marketplace/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Government Routes */}
    <Route path="/dashboard/government/*" element={
      <ProtectedRoute allowedRoles={['government']}>
        <Routes>
          <Route path="/" element={<GovernmentDashboard />} />
          <Route path="wastebank-reports" element={<WastebankReports />} />
          <Route path="monitoring" element={<GovernmentMonitoring />} />
          <Route path="analytics" element={<GovernmentAnalytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Industry Routes */}
    <Route path="/dashboard/industry/*" element={
      <ProtectedRoute allowedRoles={['industry']}>
        <Routes>
          <Route path="/" element={<IndustryDashboard />} />
          <Route path="offset-planner" element={<OffsetPlannerIndustry />} />
          <Route path="recycledhub" element={<RecycledHubIndustry />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Wastebank Master Routes */}
    <Route path="/dashboard/wastebank-master/*" element={
      <ProtectedRoute allowedRoles={['wastebank_master']}>
        <Routes>
          <Route path="/" element={<WastebankMasterDashboard />} />
          <Route path="transactions" element={<MasterTransaction />} />
          <Route path="collectors" element={<MasterCollector />} />
          <Route path="warehouse" element={<MasterWarehouse />} />
          <Route path="salary" element={<MasterSalaryManagement />} />
          <Route path="reports" element={<MasterReports />} />
          <Route path="requests" element={<MasterRequestCollection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Collector Master Routes */}
    <Route path="/dashboard/collector-master/*" element={
      <ProtectedRoute allowedRoles={['wastebank_master_collector']}>
        <Routes>
          <Route path="/" element={<MasterCollectorDashboard />} />
          <Route path="assignments" element={<MasterAssignment />} />
          <Route path="routes" element={<MasterRoutes />} />
          <Route path="collections" element={<MasterCollections />} />
          <Route path="update-collection/:pickupId" element={<MasterUpdateCollection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />

    {/* Marketplace Routes */}
    <Route path="/dashboard/marketplace/*" element={
      <ProtectedRoute allowedRoles={['marketplace']}>
        <Routes>
          <Route path="/" element={<MarketplaceDashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProtectedRoute>
    } />
    
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default AppRoutes;
