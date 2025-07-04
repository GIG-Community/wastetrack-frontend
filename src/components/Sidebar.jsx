import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
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
  CircleDollarSign,
  Award,
  History,
  PieChart,
  Recycle,
  Factory,
  Store,
  ChevronRight,
  LogOut,
  Loader2,
  AreaChart,
  Package,
  ShoppingCart,
  LineChart,
  Gift,
  Scale,
  DollarSign,
  FileText,
  Wallet,
  FactoryIcon,
  Warehouse
} from 'lucide-react';

const Sidebar = ({ role, onCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Icon mapping for menu items
  const getIcon = (label) => {
    const iconProps = { size: 20, className: "group-hover:text-emerald-400 transition-colors" };
    const icons = {
      // Original English labels
      'Dashboard': <LayoutDashboard {...iconProps} />,
      'User Management': <Users {...iconProps} />,
      'Waste Bank Management': <Building2 {...iconProps} />,
      'System Settings': <Settings {...iconProps} />,
      'Reports': <FileBarChart {...iconProps} />,
      'Collector Management': <UserCog {...iconProps} />,
      'Transactions': <Receipt {...iconProps} />,
      'Warehouse Storage': <Building {...iconProps} />,
      'Process Transactions': <Receipt {...iconProps} />,
      'Manage Waste': <Trash2 {...iconProps} />,
      'Daily Reports': <ClipboardList {...iconProps} />,
      'My Assignments': <Truck {...iconProps} />,
      'Collections': <Scale {...iconProps} />,
      'Update Collection': <ClipboardList {...iconProps} />,
      'Routes': <MapPin {...iconProps} />,
      'History': <History {...iconProps} />,
      'Monitoring': <PieChart {...iconProps} />,
      'Recycle Management': <PieChart {...iconProps} />,
      'Recycling Hub': <Recycle {...iconProps} />,
      'Carbon Management': <Factory {...iconProps} />,
      'Analytics': <AreaChart {...iconProps} />,
      'Products': <Package {...iconProps} />,
      'Orders': <ShoppingCart {...iconProps} />,
      'Waste Detector': <Recycle {...iconProps} />,
      'Recycled Hub': <Recycle {...iconProps} />,
      'Schedule Pickup': <Calendar {...iconProps} />,
      'Track Pickup': <Truck {...iconProps} />,
      'Rewards': <Gift {...iconProps} />,
      'Collectors': <Users {...iconProps} />,
      'Settings': <Settings {...iconProps} />,
      'Marketplace': <ShoppingCart {...iconProps} />,
      'Request Induk': <Truck {...iconProps} />,
      'Salary': <Wallet {...iconProps} />,
      'Profile': <Users {...iconProps} />,
      'Price Management': <CircleDollarSign {...iconProps} />,

      // Indonesian translations
      'Dasbor': <LayoutDashboard {...iconProps} />,
      'Manajemen Pengguna': <Users {...iconProps} />,
      'Manajemen Bank Sampah': <Building2 {...iconProps} />,
      'Pengaturan Sistem': <Settings {...iconProps} />,
      'Laporan': <FileBarChart {...iconProps} />,
      'Manajemen Kolektor': <UserCog {...iconProps} />,
      'Transaksi': <Receipt {...iconProps} />,
      'Penyimpanan Gudang': <Building {...iconProps} />,
      'Proses Transaksi': <Receipt {...iconProps} />,
      'Kelola Sampah': <Trash2 {...iconProps} />,
      'Laporan Harian': <ClipboardList {...iconProps} />,
      'Tugas Saya': <Truck {...iconProps} />,
      'Koleksi': <Scale {...iconProps} />,
      'Perbarui Koleksi': <ClipboardList {...iconProps} />,
      'Rute': <MapPin {...iconProps} />,
      'Riwayat': <History {...iconProps} />,
      'Pemantauan': <PieChart {...iconProps} />,
      'Perencana Offset': <PieChart {...iconProps} />,
      'Manajemen Daur Ulang': <PieChart {...iconProps} />,
      'Penyimpanan Industri': <Warehouse {...iconProps} />,
      'Waste Hub': <Recycle {...iconProps} />,
      'Laporan ESG': <FileText {...iconProps} />,
      'Manajemen Karbon': <Factory {...iconProps} />,
      'Analitik': <AreaChart {...iconProps} />,
      'Produk': <Package {...iconProps} />,
      'Pesanan': <ShoppingCart {...iconProps} />,
      'Detektor Sampah': <Recycle {...iconProps} />,
      'Jadwal Pengambilan': <Calendar {...iconProps} />,
      'Lacak Pengambilan': <Truck {...iconProps} />,
      'Penghargaan': <Gift {...iconProps} />,
      'Kolektor': <Users {...iconProps} />,
      'Pengaturan': <Settings {...iconProps} />,
      'Pasar': <ShoppingCart {...iconProps} />,
      'Permintaan Induk': <Truck {...iconProps} />,
      'Gaji': <Wallet {...iconProps} />,
      'Manajemen Gaji': <Wallet {...iconProps} />,
      'Profil': <Users {...iconProps} />,
      'Manajemen Harga': <CircleDollarSign {...iconProps} />
    };
    return icons[label] || <ChevronRight {...iconProps} />;
  };

  // Menu items configuration based on role
  const getMenuItems = (role) => {
    const menuConfigs = {
      super_admin: [
        { label: 'Dasbor', path: '/dashboard/super-admin' },
        { label: 'Manajemen Pengguna', path: '/dashboard/super-admin/users' },
        { label: 'Manajemen Bank Sampah', path: '/dashboard/super-admin/wastebanks' },
        { label: 'Pengaturan Sistem', path: '/dashboard/super-admin/settings' },
        { label: 'Laporan', path: '/dashboard/super-admin/reports' }
      ],
      wastebank_admin: [
        { label: 'Dasbor', path: '/dashboard/wastebank' },
        { label: 'Manajemen Kolektor', path: '/dashboard/wastebank/employees' },
        { label: 'Manajemen Harga', path: '/dashboard/wastebank/price' },
        { label: 'Transaksi', path: '/dashboard/wastebank/transactions' },
        { label: 'Penyimpanan Gudang', path: '/dashboard/wastebank/warehouse-storage' },
        { label: 'Gaji', path: '/dashboard/wastebank/salary' },
        { label: 'Permintaan Induk', path: '/dashboard/wastebank/request-induk' },
        { label: 'Laporan', path: '/dashboard/wastebank/reports' },
      ],
      collector: [
        { label: 'Dasbor', path: '/dashboard/collector' },
        { label: 'Tugas Saya', path: '/dashboard/collector/assignments' },
        { label: 'Koleksi', path: '/dashboard/collector/collections' },
        { label: 'Rute', path: '/dashboard/collector/routes' }
      ],
      customer: [
        { label: 'Dasbor', path: '/dashboard/customer' },
        { label: 'Jadwal Pengambilan', path: '/dashboard/customer/schedule' },
        { label: 'Lacak Pengambilan', path: '/dashboard/customer/track' },
        { label: 'Pasar', path: '/dashboard/customer/marketplace' },
        { label: 'Riwayat', path: '/dashboard/customer/history' },
        { label: 'Detektor Sampah', path: '/dashboard/customer/detect' }
      ],
      government: [
        { label: 'Dasbor', path: '/dashboard/government' },
        { label: 'Pemantauan', path: '/dashboard/government/monitoring' },
        { label: 'Analitik', path: '/dashboard/government/analytics' },
        { label: 'Laporan', path: '/dashboard/government/wastebank-reports' }
      ],
      industry: [
        { label: 'Dasbor', path: '/dashboard/industry' },
        { label: 'Waste Hub', path: '/dashboard/industry/recycledhub' },
        { label: 'Recycle Management', path: '/dashboard/industry/recycle-management' },
        { label: 'Penyimpanan Industri', path: '/dashboard/industry/warehouse' },
        { label: 'Manajemen Gaji', path: '/dashboard/industry/salary' },
        { label: 'Laporan ESG', path: '/dashboard/industry/reports' },

      ],
      marketplace: [
        { label: 'Dasbor', path: '/dashboard/marketplace' },
        { label: 'Produk', path: '/dashboard/marketplace/products' },
        { label: 'Pesanan', path: '/dashboard/marketplace/orders' },
        { label: 'Analitik', path: '/dashboard/marketplace/analytics' }
      ],
      wastebank_master: [
        { label: 'Dasbor', path: '/dashboard/wastebank-master' },
        { label: 'Manajemen Kolektor', path: '/dashboard/wastebank-master/collectors' },
        { label: 'Manajemen Harga', path: '/dashboard/wastebank-master/price' },
        { label: 'Transaksi', path: '/dashboard/wastebank-master/transactions' },
        { label: 'Penyimpanan Gudang', path: '/dashboard/wastebank-master/warehouse' },
        { label: 'Gaji', path: '/dashboard/wastebank-master/salary' },
        { label: 'Permintaan Induk', path: '/dashboard/wastebank-master/requests' },
        { label: 'Laporan', path: '/dashboard/wastebank-master/reports' },
      ],
      wastebank_master_collector: [
        { label: 'Dasbor', path: '/dashboard/collector-master' },
        { label: 'Tugas Saya', path: '/dashboard/collector-master/assignments' },
        { label: 'Koleksi', path: '/dashboard/collector-master/collections' },
        { label: 'Rute', path: '/dashboard/collector-master/routes' }
      ]
    };
    return menuConfigs[role] || [];
  };

  const menuItems = getMenuItems(role);

  const handleLogout = async () => {
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
        setIsLoggingOut(true);
        await signOut(auth);

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
        ${isCollapsed ? 'w-20' : 'w-72'} h-screen fixed left-0 top-0`}
    >      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <img
              src="/web-logo.svg"
              alt="WasteTrack Logo"
              className="h-10 w-10 mr-2"
            />
            <span className="text-md font-semibold text-emerald-600">WasteTrack</span>
          </div>
        )}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            onCollapse && onCollapse(!isCollapsed);
          }}
          className="p-2 transition-colors rounded-lg hover:bg-gray-100"
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
      <div className="absolute left-0 right-0 px-4 bottom-4">
        <Link
          to={`/dashboard/${role === 'super_admin' ? 'super-admin' :
            role === 'wastebank_admin' ? 'wastebank' :
              role === 'wastebank_master' ? 'wastebank-master' :
                role === 'wastebank_master_collector' ? 'collector-master' :
                  role}/profile`}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2
    ${location.pathname.includes('/profile')
              ? 'bg-emerald-50 text-emerald-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'}
    transition-all ${isCollapsed ? 'justify-center' : ''}`}
        >
          {!isCollapsed ? (
            <>
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {userData?.profile?.institution ?
                    userData.profile.institution.substring(0, 2).toUpperCase() :
                    '?'}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {userData?.profile?.institution || userData?.profile?.institutionName || 'Institution'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {userData?.email || 'user@email.com'}
                </div>
              </div>
            </>) : (
            <Users size={20} className={location.pathname.includes('/profile') ? 'text-emerald-600' : ''} />
          )}
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center gap-3 p-3 rounded-lg
            text-gray-600 hover:bg-red-50 hover:text-red-600 
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
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