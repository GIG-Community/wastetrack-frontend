import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Recycle,
  Scale,
  Clock,
  DollarSign,
  Info,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

// Constants
const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const WASTE_ICONS = {
  'plastic': '♳',
  'paper': '📄',
  'organic': '🌱',
  'metal': '🔧',
  'glass': '🥛',
  'electronic': '💻',
  'fabric': '👕',
  'others': '📦'
};

// Utility functions
const formatWeight = (weight) => `${weight.toFixed(1)} kg`;

const translateWasteType = (type) => {
  const translations = {
    'plastic': 'Plastik',
    'paper': 'Kertas',
    'organic': 'Organik',
    'metal': 'Logam',
    'glass': 'Kaca',
    'electronic': 'Elektronik',
    'fabric': 'Kain',
    'others': 'Lainnya'
  };

  const lowerType = type.toLowerCase();
  return translations[lowerType] || type.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Tooltip component for providing additional information
const TooltipCustom = ({ children, content }) => (
  <div className="relative flex items-start group">
    {children}
    <div className="absolute z-50 invisible w-48 p-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      <div className="text-left">{content}</div>
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

const WastebankDashboard = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  // State hooks
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(null);
  const [unsubscribes, setUnsubscribes] = useState([]);

  // Data state
  const [stats, setStats] = useState({
    totalCollectors: 0,
    activeCollectors: 0,
    totalPickups: 0,
    totalWaste: 0,
    totalEarnings: 0,
    pendingPickups: 0,
    assignedPickups: 0,
    completedPickups: 0,
    thisMonthWaste: 0,
    lastMonthWaste: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    balance: 0,
    pendingPayments: 0,
    institutionName: '',
    location: {
      address: '',
      city: '',
      province: ''
    }
  });
  const [pickupTrends, setPickupTrends] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [recentPickups, setRecentPickups] = useState([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [unsubscribes]);

  // Fetch data when user ID is available
  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser?.uid]);

  // Main data fetching function
  const fetchDashboardData = async () => {
    if (!currentUser?.uid) {
      setError("ID pengguna tidak ditemukan");
      return;
    }

    setLoading(true);
    try {
      // Clear existing subscriptions
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes = [];

      // User data subscription
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribeUser = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStats(prevStats => ({
            ...prevStats,
            balance: userData?.balance || 0,
            pendingPayments: userData?.pendingPayments || 0,
            institutionName: userData.profile?.institutionName || '',
            location: userData.location || {}
          }));
        }
      }, (error) => {
        console.error('Error fetching user data:', error);
        setError('Gagal memuat data pengguna');
      });
      newUnsubscribes.push(unsubscribeUser);

      // Collectors data subscription
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'collector'),
        where('profile.institution', '==', currentUser.uid)
      );

      const unsubscribeCollectors = onSnapshot(collectorsQuery, (collectorsSnapshot) => {
        const collectorsData = collectorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        updateStatsWithCollectors(collectorsData);
      }, (error) => {
        console.error('Error fetching collectors:', error);
        setError('Gagal memuat data kolektor');
      });
      newUnsubscribes.push(unsubscribeCollectors);

      // Pickups data subscription
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid)
      );

      const unsubscribePickups = onSnapshot(pickupsQuery, (pickupsSnapshot) => {
        const pickupsData = pickupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        processPickupData(pickupsData);
      });
      newUnsubscribes.push(unsubscribePickups);

      // Save all subscriptions
      setUnsubscribes(newUnsubscribes);
    } catch (error) {
      console.error('Error setting up dashboard subscriptions:', error);
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };

  // Process collectors data
  const updateStatsWithCollectors = (collectorsData) => {
    setStats(prevStats => ({
      ...prevStats,
      totalCollectors: collectorsData.length,
      activeCollectors: collectorsData.filter(c => c.status === 'active').length,
    }));
  };

  // Process pickup data
  const processPickupData = (pickupsData) => {
    try {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      // Helper to check if a timestamp is in a specific month and year
      const isInMonth = (timestamp, month, year) => {
        if (!timestamp) return false;
        const date = new Date(timestamp.seconds * 1000);
        return date.getMonth() === month && date.getFullYear() === year;
      };

      // Filter pickups by month
      const thisMonthPickups = pickupsData.filter(p =>
        isInMonth(p.completedAt, thisMonth, thisYear)
      );

      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthPickups = pickupsData.filter(p =>
        isInMonth(p.completedAt, lastMonth, lastMonthYear)
      );

      // Calculate totals helper function
      const calculateTotals = (pickups) => {
        return pickups.reduce((acc, pickup) => {
          let weight = 0;
          let customerPayment = 0;

          if (pickup.wastes) {
            Object.values(pickup.wastes).forEach(waste => {
              weight += waste.weight || 0;
              customerPayment += waste.value || 0;
            });
          } else if (pickup.wasteQuantities) {
            Object.entries(pickup.wasteQuantities).forEach(([type, quantity]) => {
              weight += (pickup.wasteWeights?.[type] || quantity * 5);
            });
          }

          return {
            weight: acc.weight + weight,
            customerPayment: acc.customerPayment + customerPayment
          };
        }, { weight: 0, customerPayment: 0 });
      };

      // Calculate totals for different periods
      const thisMonthTotals = calculateTotals(thisMonthPickups);
      const lastMonthTotals = calculateTotals(lastMonthPickups);
      const allTimeTotals = calculateTotals(pickupsData);

      // Count pickups by status
      const pendingPickups = pickupsData.filter(p => p.status === 'pending').length;
      const assignedPickups = pickupsData.filter(p => p.status === 'assigned').length;
      const completedPickups = pickupsData.filter(p => p.status === 'completed').length;

      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        totalPickups: pickupsData.length,
        totalWaste: allTimeTotals.weight,
        totalEarnings: allTimeTotals.customerPayment,
        pendingPickups,
        assignedPickups,
        completedPickups,
        thisMonthWaste: thisMonthTotals.weight,
        lastMonthWaste: lastMonthTotals.weight,
        thisMonthEarnings: thisMonthTotals.customerPayment,
        lastMonthEarnings: lastMonthTotals.customerPayment
      }));

      // Process last 7 days data for trend chart
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const dayPickups = pickupsData.filter(p => {
          const pickupDate = new Date((p.completedAt?.seconds || p.date?.seconds) * 1000);
          return pickupDate >= date && pickupDate < nextDay;
        });

        const dayTotals = calculateTotals(dayPickups);

        last7Days.push({
          date: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          weight: dayTotals.weight,
          customerPayment: dayTotals.customerPayment
        });
      }
      setPickupTrends(last7Days);

      // Process waste types data for pie chart
      const wasteTypeTotals = {};
      pickupsData.forEach(pickup => {
        if (pickup.wastes) {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            if (!wasteTypeTotals[type]) {
              const icon = WASTE_ICONS[type.toLowerCase()] || '📦';

              wasteTypeTotals[type] = {
                name: type.replace(/-/g, ' '),
                weight: 0,
                value: 0,
                icon
              };
            }
            wasteTypeTotals[type].weight += data.weight || 0;
            wasteTypeTotals[type].value += data.value || 0;
          });
        }
      });

      const wasteTypeData = Object.values(wasteTypeTotals)
        .map(type => ({
          ...type,
          name: translateWasteType(type.name)
        }))
        .sort((a, b) => b.weight - a.weight);

      setWasteTypes(wasteTypeData);

      // Get recent pickups for the list
      setRecentPickups(
        pickupsData
          .filter(p => p.status === 'completed')
          .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
          .slice(0, 5)
      );

      setLoading(false);
    } catch (error) {
      console.error('Error processing pickup data:', error);
      setError('Gagal memproses data');
      setLoading(false);
    }
  };

  // Information panel component - modified with collapsible behavior
  const InfoPanel = ({ title, children }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="text-left p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <h3 className="mb-1 font-medium text-blue-800">{title}</h3>
              <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            {isExpanded && (
              <div className="text-sm text-blue-700">{children}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Component for buttons
  const Button = ({
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...props
  }) => {
    const variants = {
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
      secondary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-700",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5",
      lg: "px-6 py-3"
    };

    return (
      <button
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg
          transition duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  };

  // Component for stat cards
  const StatCard = ({ icon: Icon, label, value, trend, trend_value, variant = "success", className = "", infoText, tooltipCustom = "" }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div className={`bg-white rounded-xl text-left p-4 border border-zinc-200 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-gray-50 rounded-full">
                <Icon className="w-5 h-5 text-zinc-600" />
              </div>
              {tooltipCustom && (
                <TooltipCustom content={tooltipCustom}>
                  <HelpCircle className="h-3.5 w-3.5 text-zinc-400" />
                </TooltipCustom>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">{label}</p>
              <p className="mt-2 text-2xl text-left font-semibold text-zinc-800">{value}</p>
            </div>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
              ${variant === 'success' ? 'bg-emerald-50 text-emerald-600' :
              variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-600'}`}
          >
            {variant === 'success' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trend_value}
          </div>

        </div>
        {/* {trend && (
          <p className="mt-2 text-xs text-zinc-500">{trend}</p>
        )} */}
      </div>
    );
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);
      const percentage = ((data.weight / totalWeight) * 100).toFixed(1);

      return (
        <div className="text-left p-3 bg-white border rounded-lg shadow-lg border-zinc-200">
          <p className="flex items-center gap-1.5 font-medium">
            <span>{data.icon}</span>
            <span>{data.name}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">Berat:</span> {formatWeight(data.weight)} ({percentage}%)
          </p>
          <p className="mt-0.5 text-sm">
            <span className="font-medium">Nilai:</span> Rp {data.value.toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  // Pie chart legend component
  const renderLegend = () => {
    const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);

    return (
      <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2">
        {wasteTypes.map((entry, index) => {
          const percentage = ((entry.weight / totalWeight) * 100).toFixed(1);
          return (
            <div key={`legend-${index}`}
              className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex-shrink-0 w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex items-center gap-1 text-sm truncate text-zinc-700">
                  {entry.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-800">
                  {formatWeight(entry.weight)}
                </p>
                <p className="text-xs text-zinc-500">
                  {percentage}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Main render
  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      {/* Sidebar */}
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Dasbor Bank Sampah</h1>
              <p className="text-sm text-zinc-500">Analisis dan metrik kinerja pengelolaan sampah</p>
            </div>
          </div>

          {/* Information Panel */}
          <InfoPanel title="Informasi">
            <p className="text-sm text-blue-600">
              <li>Dashboard ini menampilkan data secara realtime dan langsung memperbarui perubahan tanpa perlu memuat ulang halaman.</li>
              <li><span className="font-semibold">Tren Pengumpulan Sampah</span>: Diagram menunjukkan tren harian pengumpulan sampah dan pembayaran customer selama 7 hari terakhir.</li>
              <li><span className="font-semibold">Distribusi Sampah</span>: Diagram menunjukkan proporsi jenis sampah yang telah dikumpulkan berdasarkan berat.</li>
            </p>
          </InfoPanel>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-zinc-600">Memuat data dashboard...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-6 mb-8 border border-red-200 bg-red-50 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="flex-shrink-0 w-6 h-6 mt-0.5 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-800">Terjadi Kesalahan</h3>
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={fetchDashboardData}
                  >
                    Coba Lagi
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard content */}
          {!loading && !error && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={DollarSign}
                  label="Saldo Saat Ini"
                  value={`Rp ${stats.balance.toLocaleString('id-ID')}`}
                  // trend="Pembayaran tertunda"
                  trend_value={`Rp ${stats.pendingPayments.toLocaleString('id-ID')}`}
                  variant={stats.pendingPayments === 0 ? 'success' : 'danger'}
                  infoText="Saldo yang tersedia di akun bank sampah Anda."
                  tooltipCustom="Saldo yang tersedia di akun bank sampah Anda."
                />

                <StatCard
                  icon={Scale}
                  label="Total Berat Terkumpul"
                  value={formatWeight(stats.totalWaste)}
                  // trend="vs bulan lalu"
                  trend_value={`${((stats.thisMonthWaste - stats.lastMonthWaste) / Math.max(stats.lastMonthWaste, 1) * 100).toFixed(1)}%`}
                  variant={stats.thisMonthWaste >= stats.lastMonthWaste ? 'success' : 'danger'}
                  infoText="Total berat sampah yang telah dikumpulkan dengan perbandingan jumlah bulan lalu."
                  tooltipCustom="Total berat sampah yang telah dikumpulkan dengan perbandingan jumlah bulan lalu."
                />

                <StatCard
                  icon={Package}
                  label="Status Pengambilan"
                  value={stats.completedPickups}
                  // trend="Pengambilan saat ini"
                  trend_value={`${stats.pendingPickups} tertunda`}
                  variant={stats.pendingPickups === 0 ? 'danger' : 'success'}
                  infoText="Jumlah pengambilan sampah yang telah selesai."
                  tooltipCustom="Jumlah pengambilan sampah yang telah selesai."
                />

                <StatCard
                  icon={Users}
                  label="Kolektor"
                  value={stats.totalCollectors}
                  trend="Kolektor aktif"
                  trend_value={`${stats.activeCollectors} aktif`}
                  variant={stats.activeCollectors === stats.totalCollectors ? 'success' : 'danger'}
                  infoText="Jumlah total kolektor yang terdaftar di bank sampah Anda. Kolektor aktif adalah mereka yang siap menerima tugas pengambilan."
                  tooltipCustom="Jumlah total kolektor yang terdaftar di bank sampah Anda."
                />
              </div>

              {/* Charts section */}
              <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
                {/* Line chart - Trend */}
                <div className="p-6 bg-white border lg:col-span-2 rounded-xl border-zinc-200">
                  <div className="text-left flex items-center mb-6">
                    <div className="p-3 rounded-lg bg-emerald-50">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="items-center ml-4">
                      <h2 className="text-lg font-semibold text-zinc-800">Tren Pengumpulan</h2>
                      <p className="text-sm text-zinc-500">Statistik pengumpulan sampah harian</p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mb-3 text-sm text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-medium">Statistik 7 Hari Terakhir</p>
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50">
                          <div className="w-3 h-3 rounded-full bg-[#6366F1]" />
                          <span className="text-xs text-indigo-700">Berat Sampah (Kg)</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50">
                          <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                          <span className="text-xs text-emerald-700">Pembayaran Customer (Rp)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pickupTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                        <XAxis
                          dataKey="date"
                          stroke="#71717A"
                          fontSize={12}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#6366F1"
                          fontSize={12}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#10B981"
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            padding: '0.75rem'
                          }}
                          formatter={(value, name) => {
                            switch (name) {
                              case 'weight':
                                return [formatWeight(value), 'Berat Sampah'];
                              case 'customerPayment':
                                return [`Rp ${value.toLocaleString('id-ID')}`, 'Pembayaran Customer'];
                              default:
                                return [value, name];
                            }
                          }}
                          labelStyle={{
                            color: '#374151',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem'
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="weight"
                          name="Berat"
                          stroke="#6366F1"
                          strokeWidth={2}
                          dot={{ stroke: '#6366F1', fill: '#fff', strokeWidth: 2, r: 4 }}
                          activeDot={{ stroke: '#6366F1', fill: '#6366F1', strokeWidth: 0, r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="customerPayment"
                          name="Pembayaran"
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={{ stroke: '#10B981', fill: '#fff', strokeWidth: 2, r: 4 }}
                          activeDot={{ stroke: '#10B981', fill: '#10B981', strokeWidth: 0, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">
                      Hari
                    </p>
                  </div>
                </div>

                {/* Pie chart - Waste distribution */}
                <div className="p-6 bg-white border rounded-xl border-zinc-200">
                  <div className="flex items-center mb-6">
                    <div className="p-3 rounded-lg bg-emerald-50">
                      <Recycle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-left items-center ml-4">
                      <h2 className="text-lg font-semibold text-zinc-800">Distribusi Sampah</h2>
                      <p className="text-sm text-zinc-500">Berdasarkan berat yang terkumpul</p>
                    </div>
                  </div>

                  <div className="h-80">
                    <div className="h-[60%]">
                      {wasteTypes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <Recycle className="w-12 h-12 mb-2 text-zinc-300" />
                          <p className="text-zinc-500">Belum ada data sampah</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={wasteTypes}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={0}
                              dataKey="weight"
                              nameKey="name"
                              // label={(entry) => {
                              //   const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);
                              //   const percentage = (entry.weight / totalWeight) * 100;
                              //   return percentage >= 15 ? `${entry.icon} ${entry.name}` : '';
                              // }}
                              labelLine={false}
                              stroke="none"
                            >
                              {wasteTypes.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-zinc-100">
                      {wasteTypes.length > 0 && (
                        <div className="flex justify-between mb-2 text-xs font-medium text-zinc-500">
                          <span>JENIS SAMPAH</span>
                          <span>BERAT & PERSENTASE</span>
                        </div>
                      )}
                      {renderLegend()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent pickups section */}
              <div className="bg-white border rounded-xl border-zinc-200">
                <div className="p-6 border-b border-zinc-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-3 rounded-lg bg-emerald-50 mr-4">
                        <Clock className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-zinc-800">Pengambilan Terbaru</h2>
                        <p className="text-sm text-zinc-500">Daftar pengambilan sampah yang telah selesai</p>
                      </div>
                    </div >
                    <Button variant="secondary" size="sm" className="hidden">
                      Lihat Semua
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200">
                  {recentPickups.length === 0 ? (
                    <div className="p-6 text-center">
                      <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                      <h3 className="text-sm font-medium text-zinc-800">Belum Ada Pengambilan Terbaru</h3>
                      <p className="mt-1 text-sm text-zinc-500">Pengambilan yang selesai akan muncul di sini</p>
                    </div>
                  ) : (
                    recentPickups.map((pickup) => (
                      <div key={pickup.id} className="p-6 hover:bg-zinc-50/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100">
                              <span className="font-medium text-zinc-600">
                                {pickup?.userName?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 max-w-[1200px]">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-zinc-800">
                                  {pickup.userName || 'Unknown User'}
                                </h3>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  {pickup.status || 'Tidak ada status'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-sm text-zinc-600">
                                <Clock className="w-4 h-4" />
                                {pickup.completedAt && pickup.completedAt.seconds
                                  ? new Date(pickup.completedAt.seconds * 1000).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                  : 'Tanggal tidak tersedia'}
                              </div>

                              <div className="mt-3">
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(pickup.wastes || {}).map(([type, data]) => {
                                    const typeDisplay = translateWasteType(type);

                                    return (
                                      <span
                                        key={type}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-700"
                                      >
                                        {typeDisplay}: {formatWeight(data.weight || 0)}
                                        <span className="text-zinc-400">•</span>
                                        <span className="min-w-16 text-right">Rp {(data.value || 0).toLocaleString('id-ID')}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium text-emerald-600 min-w-40">
                              Rp {(pickup.totalValue || 0).toLocaleString('id-ID')}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Total Harga
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main >
    </div >
  );
};

export default WastebankDashboard;