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
  ShoppingBag,
  Menu,
  X,
  LogOut,
  Settings,
  Wallet,
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
    { id: 'home', icon: Home, label: 'Beranda' },
    { id: 'detect', icon: Camera, label: 'Deteksi' },
    { id: 'schedule', icon: Calendar, label: 'Setor' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Toko' },
    { id: 'history', icon: Wallet, label: 'Tabungan' },

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
        title: 'Konfirmasi Logout',
        text: 'Apakah Anda yakin ingin keluar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Tidak',
        customClass: {
          popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
          title: 'text-xl sm:text-2xl font-semibold text-gray-800',
          htmlContainer: 'text-sm sm:text-base text-gray-600',
          confirmButton: 'text-sm sm:text-base',
          cancelButton: 'text-sm sm:text-base'
        },
        // Mencegah perubahan padding pada body
        padding: '1em',
        heightAuto: false,
        scrollbarPadding: false
      });

      if (result.isConfirmed) {
        await logout();
        
        await Swal.fire({
          title: 'Berhasil Keluar',
          text: 'Anda telah berhasil keluar dari akun Anda.',
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: {
            popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
            title: 'text-xl sm:text-2xl font-semibold text-gray-800',
          },
          // Mencegah perubahan padding pada body
          padding: '1em',
          heightAuto: false,
          scrollbarPadding: false
        });

        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire({
        title: 'Gagal Keluar',
        text: 'Terjadi kesalahan saat mencoba keluar. Silakan coba lagi.',
        icon: 'error',
        confirmButtonColor: '#10B981',
        customClass: {
          popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg'
        },
        // Mencegah perubahan padding pada body
        padding: '1em',
        heightAuto: false,
        scrollbarPadding: false
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
    <div className="sm:min-h-screen">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-100 px-6">
        <div className="flex items-center justify-between h-full">
          {/* Left side - Brand/Logo */}
          <div className="flex items-center gap-3">
            {/* <button 
              className="p-2 rounded-lg lg:hidden hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button> */}
            <h1 className="text-lg font-bold text-emerald-600 sm:text-xl">WasteTrack</h1>
          </div>

          {/* Right side - User menu & notifications */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <div className="relative notification-menu">
              <button 
                className="bg-white relative p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-1 -right-1">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 py-2 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg w-64 sm:w-80">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-md font-semibold text-gray-700 sm:text-lg">Notifikasi</h3>
                  </div>
                  {notifications.map((notification) => (
                    <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-sm text-left font-medium text-gray-800">{notification.title}</p>
                      <p className="mt-1 text-left text-xs font-light text-gray-500">{notification.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative profile-menu">
              <button 
                className="bg-white flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                  <span className="font-medium text-emerald-600">
                    {userData?.profile?.fullName?.charAt(0) || 'U'}
                  </span>
                </div>
                {/* <ChevronDown className="w-4 h-4 text-gray-600" /> */}
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 py-2 bg-white border border-gray-100 rounded-lg shadow-lg w-52 sm:w-72">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-md font-semibold text-gray-700 sm:text-lg">Akun Saya</p>
                  </div>
                  <button className="flex items-center w-full bg-white gap-2 px-4 py-2 text-left hover:bg-gray-50">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Profile</span>
                  </button>
                  <button className="flex items-center w-full bg-white gap-2 px-4 py-2 text-left hover:bg-gray-50">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Pengaturan</span>
                  </button>
                  <div className="mt-3 border-t bg-white border-gray-100">
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center w-full gap-2 bg-white px-4 py-2 text-left text-red-600 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Keluar</span>
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
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <div className="pt-14 pb-14">
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`bg-white flex flex-col items-center p-2 min-w-[64px] transition-colors
                  ${activeTab === item.id 
                    ? 'text-emerald-500 bg-emerald-50 rounded-lg' 
                    : 'text-gray-500 hover:text-emerald-400 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="mt-1 text-[11px]">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default CustomerDashboard;