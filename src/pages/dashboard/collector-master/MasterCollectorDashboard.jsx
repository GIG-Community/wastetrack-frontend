import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Clock,
  DollarSign,
  Recycle,
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

// Menghitung jumlah pengambilan berdasarkan status
const getStatusCounts = (pickups) => ({
  pending: pickups.filter(p => p.status === 'pending').length,
  assigned: pickups.filter(p => p.status === 'assigned').length,
  completed: pickups.filter(p => p.status === 'completed').length
});

const MasterCollectorDashboard = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(null);
  const [stats, setStats] = useState({
    totalPickups: 0,
    totalWaste: 0,
    totalEarnings: 0,
    pendingPickups: 0,
    assignedPickups: 0,
    completedPickups: 0,
    thisMonthWaste: 0,
    lastMonthWaste: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0
  });
  const [pickupTrends, setPickupTrends] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [recentPickups, setRecentPickups] = useState([]);
  const [unsubscribes, setUnsubscribes] = useState([]);

  // Membersihkan subscription ketika komponen unmount
  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [unsubscribes]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser?.uid]);

  // Fungsi untuk menghitung pendapatan kolektor (10% dari total nilai)
  const calculateCollectorEarnings = (value) => {
    return value * 0.1;
  };

  const fetchDashboardData = async () => {
    if (!currentUser?.uid) {
      setError("ID pengguna tidak ditemukan");
      return;
    }

    setLoading(true);
    try {
      // Bersihkan subscription sebelumnya jika ada
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes = [];

      // Buat query untuk mendapatkan semua pengambilan untuk kolektor ini
      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('collectorId', '==', currentUser.uid)
      );
      
      // Buat subscription untuk mendapatkan update real-time
      const unsubscribePickups = onSnapshot(
        pickupsQuery, 
        (pickupsSnapshot) => {
          const pickupsData = pickupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          processDashboardData(pickupsData);
        },
        (error) => {
          console.error('Error fetching pickups:', error);
          setError('Gagal memuat data pengambilan');
        }
      );
      
      newUnsubscribes.push(unsubscribePickups);
      setUnsubscribes(newUnsubscribes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };

  // Fungsi untuk memproses data dashboard
  const processDashboardData = (pickupsData) => {
    try {
      // Hitung statistik bulanan
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      // Fungsi untuk memeriksa apakah tanggal ada dalam bulan tertentu
      const isInMonth = (timestamp, month, year) => {
        if (!timestamp) return false;
        const date = new Date(timestamp.seconds * 1000);
        return date.getMonth() === month && date.getFullYear() === year;
      };

      const thisMonthPickups = pickupsData.filter(p => 
        isInMonth(p.createdAt || p.date, thisMonth, thisYear)
      );

      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthPickups = pickupsData.filter(p => 
        isInMonth(p.createdAt || p.date, lastMonth, lastMonthYear)
      );

      // Hitung total dengan dukungan untuk format wastes dan wasteQuantities
      const calculateTotals = (pickups) => {
        return pickups.reduce((acc, pickup) => {
          let weight = 0;
          if (pickup.wastes) {
            // Format baru dengan berat sebenarnya
            weight = Object.values(pickup.wastes).reduce((sum, waste) => 
              sum + (waste.weight || 0), 0);
          } else if (pickup.wasteQuantities) {
            // Format lama hanya dengan kuantitas (perkiraan 5kg per kantong)
            weight = Object.values(pickup.wasteQuantities).reduce((sum, quantity) => 
              sum + (quantity * 5), 0);
          }
          
          return {
            weight: acc.weight + weight,
            earnings: acc.earnings + calculateCollectorEarnings(pickup.totalValue || 0)
          };
        }, { weight: 0, earnings: 0 });
      };

      const thisMonthTotals = calculateTotals(thisMonthPickups);
      const lastMonthTotals = calculateTotals(lastMonthPickups);
      const allTimeTotals = calculateTotals(pickupsData);

      const statusCounts = getStatusCounts(pickupsData);

      setStats({
        totalPickups: pickupsData.length,
        totalWaste: allTimeTotals.weight,
        totalEarnings: allTimeTotals.earnings,
        pendingPickups: statusCounts.pending,
        assignedPickups: statusCounts.assigned,
        completedPickups: statusCounts.completed,
        thisMonthWaste: thisMonthTotals.weight,
        lastMonthWaste: lastMonthTotals.weight,
        thisMonthEarnings: thisMonthTotals.earnings,
        lastMonthEarnings: lastMonthTotals.earnings
      });

      // Proses data tren
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const dayPickups = pickupsData.filter(p => {
          if (!p.createdAt && !p.date) return false;
          const pickupDate = new Date((p.createdAt?.seconds || p.date?.seconds) * 1000);
          return pickupDate >= date && pickupDate < nextDay;
        });

        const dayTotals = calculateTotals(dayPickups);

        // Terjemahkan nama hari ke Bahasa Indonesia
        last7Days.push({
          date: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          waste: dayTotals.weight,
          earnings: dayTotals.earnings
        });
      }
      setPickupTrends(last7Days);

      // Proses data jenis sampah
      const wasteTypeTotals = {};
      pickupsData.forEach(pickup => {
        if (pickup.wastes) {
          // Tangani format baru dengan berat sebenarnya
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            if (!wasteTypeTotals[type]) {
              const icon = WASTE_ICONS[type.toLowerCase()] || '📦';
              wasteTypeTotals[type] = { 
                name: type,
                weight: 0, 
                value: 0,
                icon
              };
            }
            wasteTypeTotals[type].weight += data.weight || 0;
            wasteTypeTotals[type].value += calculateCollectorEarnings(data.value || 0);
          });
        } else if (pickup.wasteQuantities) {
          // Tangani format lama dengan kuantitas
          Object.entries(pickup.wasteQuantities).forEach(([type, quantity]) => {
            if (!wasteTypeTotals[type]) {
              const icon = WASTE_ICONS[type.toLowerCase()] || '📦';
              wasteTypeTotals[type] = { 
                name: type,
                weight: 0, 
                value: 0,
                icon
              };
            }
            const estimatedWeight = quantity * 5; // Perkiraan 5kg per kantong
            wasteTypeTotals[type].weight += estimatedWeight;
            // Catatan: Tidak dapat menghitung nilai yang akurat untuk format lama
          });
        }
      });

      // Terjemahkan jenis sampah ke Bahasa Indonesia
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

      const wasteTypeData = Object.values(wasteTypeTotals)
        .map(type => ({
          ...type,
          name: translateWasteType(type.name)
        }))
        .sort((a, b) => b.weight - a.weight);
        
      setWasteTypes(wasteTypeData);

      // Set pengambilan terbaru
      const processedRecentPickups = pickupsData
        .filter(p => p.status === 'completed')
        .sort((a, b) => b.completedAt?.seconds - a.completedAt?.seconds)
        .slice(0, 5)
        .map(pickup => ({
          ...pickup,
          collectorEarnings: calculateCollectorEarnings(pickup.totalValue || 0)
        }));
      setRecentPickups(processedRecentPickups);

      setLoading(false);
    } catch (error) {
      console.error('Error processing dashboard data:', error);
      setError('Gagal memproses data dashboard');
      setLoading(false);
    }
  };

  // Komponen dasar
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

  const StatCard = ({ icon: Icon, label, value, trend, trend_value, variant = "success", className = "", infoText }) => (
    <div className={`bg-white rounded-xl p-6 border border-zinc-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-zinc-100 rounded-lg w-fit">
              <Icon className="w-6 h-6 text-zinc-600" />
            </div>
            {infoText && (
              <div className="relative">
                <button 
                  onClick={() => setShowInfoTooltip(infoText !== showInfoTooltip ? infoText : null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                >
                  <Info className="w-4 h-4" />
                </button>
                {showInfoTooltip === infoText && (
                  <div className="absolute z-10 p-3 text-sm text-white bg-zinc-800 rounded-lg shadow-lg min-w-[200px] max-w-[280px] top-full left-0 mt-1">
                    {infoText}
                    <div className="absolute w-2 h-2 rotate-45 bg-zinc-800 -top-1 left-3"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-600">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-800">{value}</p>
          </div>
        </div>
        {trend && (
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
        )}
      </div>
      {trend && (
        <p className="mt-2 text-sm text-zinc-500">{trend}</p>
      )}
    </div>
  );

  // Tooltip kustom untuk diagram pie
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);
      const percentage = ((data.weight / totalWeight) * 100).toFixed(1);
      
      return (
        <div className="p-3 bg-white border rounded-lg shadow-lg border-zinc-200">
          <p className="flex items-center gap-1.5 font-medium">
            <span>{data.icon}</span>
            <span>{data.name}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">Berat:</span> {data.weight.toFixed(1)} kg ({percentage}%)
          </p>
          <p className="mt-0.5 text-sm">
            <span className="font-medium">Nilai:</span> Rp {data.value.toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        >
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-zinc-600">Memuat data dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        >
          <div className="p-8">
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Ringkasan Pengumpulan Saya</h1>
              <p className="text-sm text-zinc-500">Metrik pengumpulan sampah pribadi</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex gap-3">
              <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
              <div>
                <h3 className="font-medium text-blue-800">Data Realtime</h3>
                <p className="text-sm text-blue-600">
                  Dashboard ini menampilkan data secara realtime. Perubahan pada data pengambilan
                  akan segera terlihat pada dashboard ini tanpa perlu memuat ulang halaman.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Earnings Card */}
            <StatCard
              icon={DollarSign}
              label="Total Penghasilan"
              value={`Rp ${stats.totalEarnings.toLocaleString('id-ID')}`}
              trend="vs bulan lalu"
              trend_value={`${((stats.thisMonthEarnings - stats.lastMonthEarnings) / Math.max(stats.lastMonthEarnings, 1) * 100 || 0).toFixed(1)}%`}
              variant={stats.thisMonthEarnings >= stats.lastMonthEarnings ? 'success' : 'danger'}
              infoText="Penghasilan yang Anda dapatkan dari seluruh aktivitas pengumpulan sampah (10% dari nilai total sampah)"
            />
            
            {/* Waste Collection Card */}
            <StatCard
              icon={Scale}
              label="Total Sampah Terkumpul"
              value={`${stats.totalWaste.toFixed(1)} kg`}
              trend="vs bulan lalu"
              trend_value={`${((stats.thisMonthWaste - stats.lastMonthWaste) / Math.max(stats.lastMonthWaste, 1) * 100 || 0).toFixed(1)}%`}
              variant={stats.thisMonthWaste >= stats.lastMonthWaste ? 'success' : 'danger'}
              infoText="Total berat semua sampah yang telah Anda kumpulkan"
            />

            {/* Pickups Status Card */}
            <StatCard
              icon={Package}
              label="Status Pengambilan"
              value={stats.completedPickups}
              trend="Pengambilan saat ini"
              trend_value={`${stats.pendingPickups} tertunda`}
              variant={stats.pendingPickups === 0 ? 'success' : 'danger'}
              infoText="Jumlah pengambilan yang telah selesai dan yang masih dalam proses"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Pickup Trends */}
            <div className="p-6 bg-white border lg:col-span-2 rounded-xl border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Tren Pengumpulan</h2>
                  <p className="text-sm text-zinc-500">Statistik pengumpulan harian</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              
              <div className="p-3 mb-3 text-sm text-blue-700 border border-blue-100 rounded-lg bg-blue-50">
                <p><strong>Cara Membaca Grafik:</strong> Garis biru menunjukkan berat sampah (kg), garis hijau menunjukkan penghasilan (Rp). Data ditampilkan untuk 7 hari terakhir.</p>
              </div>
              
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
                      stroke="#71717A"
                      fontSize={12}
                      label={{ value: 'Berat (kg)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#10B981"
                      fontSize={12}
                      label={{ value: 'Penghasilan (Rp)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'waste' ? `${value} kg` : `Rp ${value.toLocaleString('id-ID')}`,
                        name === 'waste' ? 'Berat' : 'Penghasilan'
                      ]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="waste" 
                      name="Berat"
                      stroke="#6366F1" 
                      strokeWidth={2}
                      dot={{ stroke: '#6366F1', fill: '#fff', strokeWidth: 2, r: 4 }}
                      activeDot={{ stroke: '#6366F1', fill: '#6366F1', strokeWidth: 0, r: 6 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="earnings" 
                      name="Penghasilan"
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ stroke: '#10B981', fill: '#fff', strokeWidth: 2, r: 4 }}
                      activeDot={{ stroke: '#10B981', fill: '#10B981', strokeWidth: 0, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste Distribution - Improved visualization */}
            <div className="p-6 bg-white border rounded-xl border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Distribusi Sampah</h2>
                  <p className="text-sm text-zinc-500">Berdasarkan jenis yang dikumpulkan</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Recycle className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              
              <div className="p-3 mb-3 text-sm text-blue-700 border border-blue-100 rounded-lg bg-blue-50">
                <p><strong>Cara Membaca Grafik:</strong> Diagram menunjukkan proporsi jenis sampah yang telah dikumpulkan berdasarkan berat.</p>
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
                          paddingAngle={5}
                          dataKey="weight"
                          nameKey="name"
                          label={(entry) => {
                            // Hanya tampilkan label untuk segmen yang setidaknya 15% dari total
                            const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);
                            const percentage = (entry.weight / totalWeight) * 100;
                            return percentage >= 15 ? `${entry.icon} ${entry.name}` : '';
                          }}
                          labelLine={false}
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
                  <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto pr-2">
                    {wasteTypes.map((entry, index) => {
                      const totalWeight = wasteTypes.reduce((sum, type) => sum + type.weight, 0);
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
                              {entry.icon} {entry.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-zinc-800">
                              {entry.weight.toFixed(1)} kg
                            </p>
                            <p className="text-xs text-zinc-500">
                              {percentage}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Pickups */}
          <div className="bg-white border rounded-xl border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Pengambilan Terbaru</h2>
                  <p className="text-sm text-zinc-500">Daftar pengambilan yang telah selesai</p>
                </div>
                <Button variant="secondary" size="sm">
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
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="font-medium text-zinc-800">
                          Pengambilan #{pickup.id.slice(-6)}
                        </h3>
                        <p className="text-sm text-zinc-500">
                          {pickup.completedAt 
                            ? new Date(pickup.completedAt.seconds * 1000).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })
                            : 'Tanggal tidak tersedia'
                          }
                        </p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">
                        Rp {pickup.collectorEarnings.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {pickup.wastes && Object.entries(pickup.wastes).map(([type, data]) => {
                        // Terjemahkan jenis sampah
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
                        
                        const typeDisplay = translations[type.toLowerCase()] || 
                          type.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                        
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm text-zinc-600">
                              {typeDisplay}: {data.weight}kg
                            </span>
                          </div>
                        );
                      })}
                      {pickup.wasteQuantities && Object.entries(pickup.wasteQuantities).map(([type, quantity]) => {
                        // Terjemahkan jenis sampah
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
                        
                        const typeDisplay = translations[type.toLowerCase()] || 
                          type.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                        
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm text-zinc-600">
                              {typeDisplay}: {quantity * 5}kg (perkiraan)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterCollectorDashboard;
