// src/pages/dashboard/customer/CustomerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Home,
  Camera, 
  Calendar, 
  MapPin, 
  Gift, 
  Clock,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  ChevronDown
} from 'lucide-react';

// Import page components
import HomePage from './Homepage';
import DetectWaste from './DetectWaste';
import SchedulePickup from './SchedulePickup';
import TrackPickup from './TrackPickup';
import Rewards from './Rewards';
import History from './History';
import Marketplace from './CustomerMarketplace';
import ProductDetails from './ProductDetails';
import Checkout from './Checkout';
import OrderConfirmation from './OrderConfirmation';

const CustomerDashboard = () => {
  const { userData, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items configuration
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'detect', icon: Camera, label: 'Detect' },
    { id: 'schedule', icon: Calendar, label: 'Schedule Pickup' },
    { id: 'marketplace', icon: Gift, label: 'Marketplace' },
    { id: 'history', icon: Clock, label: 'History' },
    
    // { id: 'history', icon: Clock, label: 'History' }
  ];

  // Simulated notifications
  useEffect(() => {
    setNotifications([
      { id: 1, title: 'Pickup Scheduled', message: 'Your pickup is scheduled for tomorrow', type: 'info' },
      { id: 2, title: 'New Reward', message: 'You\'ve earned 50 points!', type: 'success' }
    ]);
  }, []);

  const handleSignOut = async () => {
    try {
      const result = await Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#EF4444',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'rounded-lg',
          title: 'text-lg font-semibold text-gray-800',
          htmlContainer: 'text-gray-600',
          confirmButton: 'font-medium',
          cancelButton: 'font-medium'
        }
      });

      if (result.isConfirmed) {
        await logout();
        
        await Swal.fire({
          title: 'Logged Out Successfully',
          text: 'You have been logged out of your account',
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-lg'
          }
        });

        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire({
        title: 'Logout Failed',
        text: 'An error occurred while logging out. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981',
        customClass: {
          popup: 'rounded-lg'
        }
      });
    }
  };

  // Handle navigation
  const handleNavigation = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-menu')) {
        setIsNotificationOpen(false);
      }
      if (!event.target.closest('.profile-menu')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Add event listener for tab changes from ProductDetails
  useEffect(() => {
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('setActiveTab', handleTabChange);
    return () => window.removeEventListener('setActiveTab', handleTabChange);
  }, []);

  // Set active tab based on current path when mounting
  useEffect(() => {
    if (location.pathname.includes('/marketplace')) {
      setActiveTab('marketplace');
    }
  }, []); // Remove location.pathname from dependency array to prevent unexpected tab changes

  // Render active component
  const renderContent = () => {
    // Only render marketplace component on the main marketplace page
    if (activeTab === 'marketplace' && 
        !location.pathname.includes('/product/') && 
        !location.pathname.includes('/checkout') && 
        !location.pathname.includes('/order-confirmation')) {
      return <Marketplace />;
    }

    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'detect':
        return <DetectWaste />;
      case 'schedule':
        return <SchedulePickup />;
      case 'history':
        return <History />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Left side - Brand/Logo */}
          <div className="flex items-center gap-3">
            {/* <button 
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button> */}
            <h1 className="text-xl font-bold text-emerald-600">WasteTrack</h1>
          </div>

          {/* Right side - User menu & notifications */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative notification-menu">
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg relative"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-700">Notifications</h3>
                  </div>
                  {notifications.map((notification) => (
                    <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                      <p className="font-medium text-sm text-gray-800">{notification.title}</p>
                      <p className="text-gray-500 text-xs mt-1">{notification.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative profile-menu">
              <button 
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-medium">
                    {userData?.profile?.fullName?.charAt(0) || 'U'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-700">My Account</p>
                  </div>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Profile</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Settings</span>
                  </button>
                  <div className="border-t border-gray-100 mt-2">
                    <button 
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
             onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <div className="pt-16 pb-16">
        {renderContent()}
        {/* Render the child routes */}
        <Routes>
          <Route path="marketplace/product/:id" element={<ProductDetails />} />
          <Route path="marketplace/checkout" element={<Checkout />} />
          <Route path="marketplace/order-confirmation/:id" element={<OrderConfirmation />} />
        </Routes>
      </div>

      {/* Bottom Navigation - Only show if not in product detail/checkout/confirmation */}
      {!location.pathname.includes('/product/') && 
       !location.pathname.includes('/checkout') && 
       !location.pathname.includes('/order-confirmation') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center p-2 min-w-[64px] transition-colors
                  ${activeTab === item.id 
                    ? 'text-emerald-500 bg-emerald-50 rounded-lg' 
                    : 'text-gray-500 hover:text-emerald-400 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default CustomerDashboard;