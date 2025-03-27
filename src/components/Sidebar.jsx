import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import Swal from 'sweetalert2';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  FileBarChart,
  UserCog,
  Receipt,
  Building,
  Trash2,
  ClipboardList,
  Truck,
  MapPin,
  Calendar,
  Navigation,
  Award,
  History,
  PieChart,
  Recycle,
  Factory,
  Store,
  ChevronRight,
  LogOut,
  Loader2,
  AreaChart
} from 'lucide-react';

const Sidebar = ({ role, onCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Icon mapping for menu items
  const getIcon = (label) => {
    const iconProps = { size: 20, className: "group-hover:text-emerald-400 transition-colors" };
    const icons = {
      'Dashboard': <LayoutDashboard {...iconProps} />,
      'User Management': <Users {...iconProps} />,
      'Waste Bank Management': <Building2 {...iconProps} />,
      'System Settings': <Settings {...iconProps} />,
      'Reports': <FileBarChart {...iconProps} />,
      'Collector Management': <UserCog {...iconProps} />,
      'Transactions': <Receipt {...iconProps} />,
      'Bank Settings': <Building {...iconProps} />,
      'Process Transactions': <Receipt {...iconProps} />,
      'Manage Waste': <Trash2 {...iconProps} />,
      'Daily Reports': <ClipboardList {...iconProps} />,
      'My Assignments': <Truck {...iconProps} />,
      'Update Collection': <ClipboardList {...iconProps} />,
      'Routes': <MapPin {...iconProps} />,
      'Schedule Pickup': <Calendar {...iconProps} />,
      'Track Pickup': <Navigation {...iconProps} />,
      'Rewards': <Award {...iconProps} />,
      'History': <History {...iconProps} />,
      'Monitoring': <PieChart {...iconProps} />,
      'Offset Planner': <PieChart {...iconProps} />,
      'Recycling Hub': <Recycle {...iconProps} />,
      'Carbon Management': <Factory {...iconProps} />,
      'Marketplace': <Store {...iconProps} />,
      'Analytics': <AreaChart {...iconProps} />
    };
    return icons[label] || <ChevronRight {...iconProps} />;
  };

  // Menu items configuration based on role
  const getMenuItems = (role) => {
    const menuConfigs = {
      super_admin: [
        { label: 'Dashboard', path: '/dashboard/super-admin' },
        { label: 'User Management', path: '/dashboard/super-admin/users' },
        { label: 'Waste Bank Management', path: '/dashboard/super-admin/wastebanks' },
        { label: 'System Settings', path: '/dashboard/super-admin/settings' },
        { label: 'Reports', path: '/dashboard/super-admin/reports' }
      ],
      wastebank_admin: [
        { label: 'Dashboard', path: '/dashboard/wastebank' },
        { label: 'Collector Management', path: '/dashboard/wastebank/employees' },
        { label: 'Transactions', path: '/dashboard/wastebank/transactions' },
        { label: 'Bank Settings', path: '/dashboard/wastebank/bank-settings' },
        { label: 'Reports', path: '/dashboard/wastebank/reports' }
      ],
      wastebank_employee: [
        { label: 'Dashboard', path: '/dashboard/wastebank_employee' },
        { label: 'Process Transactions', path: '/dashboard/wastebank_employee/transactions' },
        { label: 'Manage Waste', path: '/dashboard/wastebank_employee/waste' },
        { label: 'Daily Reports', path: '/dashboard/wastebank_employee/reports' }
      ],
      collector: [
        { label: 'Dashboard', path: '/dashboard/collector' },
        { label: 'My Assignments', path: '/dashboard/collector/assignments' },
        { label: 'Update Collection', path: '/dashboard/collector/update-collection' },
        { label: 'Routes', path: '/dashboard/collector/routes' }
      ],
      customer: [
        { label: 'Dashboard', path: '/dashboard/customer' },
        { label: 'Schedule Pickup', path: '/dashboard/customer/schedule' },
        { label: 'Track Pickup', path: '/dashboard/customer/track' },
        { label: 'Rewards', path: '/dashboard/customer/rewards' },
        { label: 'History', path: '/dashboard/customer/history' },
        { label: 'Waste Detector', path: '/dashboard/customer/detect' }
      ],
      government: [
        { label: 'Dashboard', path: '/dashboard/government' },
        { label: 'Monitoring', path: '/dashboard/government/monitoring' },
        { label: 'Analytics', path: '/dashboard/government/analytics' },
        { label: 'Reports', path: '/dashboard/government/wastebank-reports' }
      ],
      industry: [
        { label: 'Dashboard', path: '/dashboard/industry' },
        { label: 'Recycling Hub', path: '/dashboard/industry/recycledhub' },
        // { label: 'Carbon Management', path: '/dashboard/industry/carbon' },
        // { label: 'Marketplace', path: '/dashboard/industry/marketplace' },
        { label: 'Offset Planner', path: '/dashboard/industry/offset-planner' }
      ]
    };
    return menuConfigs[role] || [];
  };

  const menuItems = getMenuItems(role);

  const handleLogout = async () => {
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
        setIsLoggingOut(true);
        await signOut(auth);
        
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
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside 
      className={`bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <span className="text-lg font-semibold text-emerald-600">WasteTrack</span>
        )}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            onCollapse && onCollapse(!isCollapsed);
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight
            size={20}
            className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={index}
              to={item.path}
              className={`group flex items-center gap-3 p-3 rounded-lg transition-all
                ${isActive 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'}
                ${isCollapsed ? 'justify-center' : ''}`}
            >
              {getIcon(item.label)}
              {!isCollapsed && (
                <span className="text-sm font-medium transition-colors group-hover:text-emerald-600">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center gap-3 p-3 rounded-lg
            text-gray-600 hover:bg-red-50 hover:text-red-600 
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut size={20} />
          )}
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;