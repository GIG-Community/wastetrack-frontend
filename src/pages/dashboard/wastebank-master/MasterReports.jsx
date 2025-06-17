import React, { useState, useEffect } from 'react';
import { 
  BarChart2,
  TreesIcon,
  DropletIcon,
  Recycle,
  Package,
  Download,
  Calendar,
  Filter,
  Users,
  TrendingUp,
  MapPin,
  Loader2,
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  DollarSign,
  Scale,
  Wallet,
  Info,
  TreePine
} from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
  Bar,
  BarChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import moment from 'moment';
import 'moment/locale/id'; // Import Indonesian locale
import AiReportButton from '../../../components/AiReportButton';
import { emissionFactors } from '../../../lib/carbonConstants';
import { calculateDistance } from '../../../lib/utils/distanceCalculator';
import { calculateEmissions, emissionFactorTransport, truckCapacity } from '../../../lib/utils/emissionCalculator';

// Set moment to use Indonesian locale
moment.locale('id');

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Base Components
const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      hover:border-emerald-500/50
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none bg-no-repeat bg-[right_1rem_center]
      ${className}`}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`
    }}
    {...props}
  />
);

const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, trendSuffix = '%', tooltip }) => (
  <div className="p-6 transition-all bg-white border shadow-sm rounded-xl border-zinc-200 hover:shadow-md group hover:border-emerald-200">
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-emerald-50 rounded-lg w-fit group-hover:bg-emerald-100 transition-colors">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-600">{label}</p>
            {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
          </div>
          <p className="mt-1 text-2xl font-semibold transition-colors text-zinc-800 group-hover:text-emerald-600">
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-sm text-zinc-500">{subValue}</p>
          )}
        </div>
      </div>
      {trend && trendValue !== undefined && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium
          ${Number(trendValue) >= 0 
            ? 'bg-emerald-50 text-emerald-600' 
            : 'bg-red-50 text-red-600'}`}
        >
          {Number(trendValue) >= 0 ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(Number(trendValue)).toFixed(1)}{trendSuffix}
        </div>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, description, children, className = "", tooltip }) => (
  <div className={`bg-white p-6 rounded-xl border border-zinc-200 shadow-sm ${className}`}>
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-800">{title}</h2>
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="relative inline-block group">
    <HelpCircle className="w-4 h-4 transition-colors text-zinc-400 hover:text-zinc-600" />
    <div className="absolute z-10 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {children}
      <div className="absolute -mt-1 -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800" />
    </div>
  </div>
);

// Information panel component
const InfoPanel = ({ title, children }) => (
  <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
    <div className="flex gap-3">
      <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
      <div>
        <h3 className="mb-1 text-sm font-medium text-blue-800">{title}</h3>
        <div className="text-sm text-blue-700">{children}</div>
      </div>
    </div>
  </div>
);

const formatCarbonValue = (value) => {
  if (Math.abs(value) < 0.001) {
    return `${(value * 1000).toFixed(2)} g CO₂e`;
  }
  return `${value.toFixed(4)} kg CO₂e`;
};

const MasterReports = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'details', 'waste-types'
  const [reports, setReports] = useState({
    collectionStats: {
      totalPickups: 0,
      totalWeight: 0,
      totalEarnings: 0,
      completedPickups: 0
    },
    financialStats: {
      totalRevenue: 0,
      lastMonthRevenue: 0,
      thisMonthRevenue: 0,
      revenueGrowth: 0,
      averagePerKg: 0
    },
    impactStats: {
      carbonReduced: 0,
      wasteManagementEmission: 0,
      recyclingSavings: 0,
      totalEmission: 0
    },
    wasteTypeDistribution: [],
    monthlyTrends: [],
    wasteTypeEmissions: [],
    revenueByWasteType: [],
    requestsData: [] // Add to store complete request data for details view
  });

  useEffect(() => {
    let unsubscribe;
    
    if (currentUser?.uid) {
      unsubscribe = setupReportDataListener();
    }
    
    // Cleanup function to unsubscribe when component unmounts or deps change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dateRange, currentUser?.uid]);

  const setupReportDataListener = () => {
    if (!currentUser?.uid) {
      setError("ID Pengguna tidak ditemukan");
      return () => {};
    }

    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const requestsQuery = query(
        collection(db, 'masterBankRequests'),
        where('masterBankId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        (requestsSnapshot) => {
          const requestsData = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).filter(p => {
            if (!p.completedAt) return false;
            const completedDate = new Date(p.completedAt.seconds * 1000);
            return completedDate >= startDate && completedDate <= now;
          });

          let totalEmissionsSum = 0;
          let totalWeight = 0;
          let totalRevenue = 0;
          let totalWasteManagementEmission = 0;
          let totalRecyclingSavings = 0;
          const wasteTypeStats = {};
          const monthlyData = {};

          requestsData.forEach(request => {
            let distance = 5; 
            
            if (request.coordinates && request.location && request.location.coordinates) {
              distance = calculateDistance(
                request.location.coordinates.lat, 
                request.location.coordinates.lng,
                request.coordinates.lat, 
                request.coordinates.lng
              );
            }
            
            let emissions = {
              wasteManagementEmission: 0,
              transportEmission: 0,
              recyclingSavings: 0,
              totalEmission: 0,
              totalWeight: 0
            };
            
            if (request.wastes) {
              emissions = calculateEmissions(request, distance);
              totalWeight += emissions.totalWeight;
              totalEmissionsSum += emissions.totalEmission;
              totalWasteManagementEmission += emissions.wasteManagementEmission;
              totalRecyclingSavings += emissions.recyclingSavings;
              
              Object.entries(request.wastes).forEach(([type, data]) => {
                const value = data.value || 0;
                totalRevenue += value;
                
                if (!wasteTypeStats[type]) {
                  wasteTypeStats[type] = {
                    name: type.replace(/-/g, ' '),
                    weight: 0,
                    emissions: 0,
                    savings: 0,
                    revenue: 0
                  };
                }
                
                const weight = data.weight || 0;
                const emissionFactor = emissionFactors[type] || 0.001;
                
                wasteTypeStats[type].weight += weight;
                wasteTypeStats[type].revenue += value;
                
                if (emissionFactor >= 0) {
                  wasteTypeStats[type].emissions += emissionFactor * weight;
                } else {
                  wasteTypeStats[type].savings += Math.abs(emissionFactor * weight);
                }
              });
            }
            
            if (request.completedAt) {
              const date = new Date(request.completedAt.seconds * 1000);
              const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
              
              if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = {
                  month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
                  year: date.getFullYear(),
                  emissions: 0,
                  savings: 0,
                  totalWeight: 0,
                  count: 0,
                  revenue: 0,
                  carbon: 0
                };
              }
              
              monthlyData[monthYear].emissions += emissions.wasteManagementEmission + emissions.transportEmission;
              monthlyData[monthYear].savings += emissions.recyclingSavings;
              monthlyData[monthYear].totalWeight += emissions.totalWeight;
              monthlyData[monthYear].count += 1;
              monthlyData[monthYear].carbon += emissions.totalEmission;
              
              if (request.wastes) {
                Object.values(request.wastes).forEach(data => {
                  monthlyData[monthYear].revenue += data.value || 0;
                });
              }
            }
          });

          const wasteTypeArray = Object.values(wasteTypeStats)
            .map(type => ({
              ...type,
              netEmission: type.emissions - type.savings,
              averagePrice: type.weight > 0 ? type.revenue / type.weight : 0
            }))
            .sort((a, b) => b.weight - a.weight);
            
          const monthlyDataArray = Object.values(monthlyData)
            .map(month => ({
              ...month,
              netEmissions: month.emissions - month.savings,
              label: `${month.month} ${month.year}`,
              weight: month.totalWeight,
              pickups: month.count
            }))
            .sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month.localeCompare(b.month);
            });

          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const thisMonthRevenue = monthlyDataArray
            .filter(m => m.year === thisYear && m.month === new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(thisYear, thisMonth, 1)))
            .reduce((sum, m) => sum + m.revenue, 0);
            
          const lastMonthDate = new Date(now);
          lastMonthDate.setMonth(now.getMonth() - 1);
          const lastMonthStr = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(lastMonthDate);
          const lastMonthRevenue = monthlyDataArray
            .filter(m => m.year === lastMonthDate.getFullYear() && m.month === lastMonthStr)
            .reduce((sum, m) => sum + m.revenue, 0);
            
          const revenueGrowth = lastMonthRevenue ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : (thisMonthRevenue > 0 ? 100 : 0);

          setReports({
            collectionStats: {
              totalPickups: requestsData.length,
              totalWeight,
              completedPickups: requestsData.length
            },
            financialStats: {
              totalRevenue,
              lastMonthRevenue,
              thisMonthRevenue,
              revenueGrowth,
              averagePerKg: totalWeight > 0 ? totalRevenue / totalWeight : 0
            },
            impactStats: {
              carbonReduced: totalRecyclingSavings,
              wasteManagementEmission: totalWasteManagementEmission,
              recyclingSavings: totalRecyclingSavings,
              totalEmission: totalEmissionsSum
            },
            wasteTypeDistribution: wasteTypeArray,
            monthlyTrends: monthlyDataArray,
            wasteTypeEmissions: wasteTypeArray.map(type => ({
              name: type.name,
              emission: type.emissions,
              saving: type.savings,
              netEmission: type.netEmission
            })),
            revenueByWasteType: wasteTypeArray.map(type => ({
              name: type.name,
              revenue: type.revenue,
              weight: type.weight,
              averagePrice: type.averagePrice
            })),
            requestsData: requestsData
          });

          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('Error mengambil data laporan:', error);
          setError('Gagal memuat data laporan');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener data laporan:', error);
      setError('Gagal memuat data laporan');
      setLoading(false);
      return () => {};
    }
  };

  const translateWasteType = (type) => {
    const translations = {
      'kardus-bagus': 'Kardus Bagus',
      'kardus-jelek': 'Kardus Jelek',
      'koran': 'Koran',
      'majalah': 'Majalah',
      'botol-bening': 'Botol Bening',
      'pet-bening': 'PET Bening',
      'plastik-bening': 'Plastik Bening',
    };
    
    return translations[type] || type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50/50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
          <p className="text-zinc-600">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50/50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{error}</h3>
          <button
            onClick={setupReportDataListener}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Coba Lagi
          </button>
        </div>
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
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
              <TreePine className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Laporan Emisi Karbon</h1>
              <p className="text-sm text-zinc-500">
                Analisis dampak lingkungan dari kegiatan pengelolaan sampah induk
              </p>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-4">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-44"
              >
                <option value="month">Bulan Terakhir</option>
                <option value="quarter">Kuartal Terakhir</option>
                <option value="year">Tahun Terakhir</option>
              </Select>
              
              <AiReportButton 
                reportData={{
                  chartDescriptions: [
                    {
                      title: "Emisi Karbon Bulanan",
                      description: `Dampak karbon per bulan dari kegiatan daur ulang`
                    },
                    {
                      title: "Emisi per Jenis Sampah",
                      description: `Dampak lingkungan berdasarkan jenis material`
                    }
                  ],
                  displayedMetrics: [
                    {
                      name: "Total Dampak Karbon",
                      value: formatCarbonValue(reports.impactStats.totalEmission),
                      description: `${reports.collectionStats.totalPickups} total transaksi`
                    },
                    {
                      name: "Total Berat Sampah",
                      value: `${reports.collectionStats.totalWeight.toFixed(2)} kg`,
                      description: `${reports.wasteTypeDistribution.length} jenis sampah`
                    },
                    {
                      name: "Total Pendapatan",
                      value: `Rp ${reports.financialStats.totalRevenue.toLocaleString('id-ID')}`,
                      description: "Total pemasukan dari seluruh transaksi"
                    },
                    {
                      name: "Penghematan Daur Ulang",
                      value: formatCarbonValue(reports.impactStats.recyclingSavings),
                      description: "Karbon yang diselamatkan melalui daur ulang"
                    }
                  ],
                  wasteDistribution: reports.wasteTypeDistribution.map(type => ({
                    name: type.name,
                    weight: type.weight,
                    impact: type.netEmission
                  })),
                  mapData: {
                    wasteBankLocations: reports.collectionStats.completedPickups,
                    masterBankLocations: 1,
                    totalTransactions: reports.collectionStats.totalPickups
                  },
                  performanceTrends: {
                    timePeriod: dateRange,
                    monthlyData: reports.monthlyTrends.length,
                    emissionTrend: reports.monthlyTrends.length > 1 ?
                      (reports.monthlyTrends[reports.monthlyTrends.length-1].netEmissions <
                      reports.monthlyTrends[0].netEmissions ? "membaik" : "meningkat") : "stabil"
                  }
                }}
                role="wastebank_master"
              />
            </div>
          </div>

          <InfoPanel title="Tentang Laporan Emisi Karbon" defaultExpanded={true}>
            <p>
              Laporan ini menghitung dampak lingkungan dari kegiatan pengelolaan sampah dalam bentuk emisi karbon.
              Perhitungan mempertimbangkan dua faktor utama:
            </p>
            <ol className="mt-2 ml-6 list-decimal">
              <li className="mb-1"><strong>Emisi Pengolahan</strong> - Karbon yang dihasilkan atau diselamatkan melalui proses daur ulang berbagai jenis sampah</li>
              <li className="mb-1"><strong>Penghematan Karbon</strong> - Emisi yang berhasil dicegah melalui aktivitas daur ulang dibandingkan dengan produksi baru</li>
            </ol>
            <p className="mt-2">
              Nilai negatif menunjukkan <strong className="text-emerald-700">penghematan karbon</strong> (dampak positif bagi lingkungan),
              sementara nilai positif menunjukkan <strong className="text-red-700">penambahan emisi</strong>.
            </p>
          </InfoPanel>

          <div className="flex mb-6 border-b border-zinc-200">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Ringkasan
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'details'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Detail Permintaan
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'waste-types'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
              }`}
              onClick={() => setActiveTab('waste-types')}
            >
              Jenis Sampah
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={TreePine}
                  label="Total Dampak Karbon"
                  value={formatCarbonValue(reports.impactStats.totalEmission)}
                  variant={reports.impactStats.totalEmission < 0 ? 'success' : 'danger'}
                  subValue={`${reports.collectionStats.completedPickups} transaksi selesai`}
                  tooltip="Jumlah emisi karbon bersih dari semua aktivitas. Nilai negatif menunjukkan penghematan karbon."
                />
                
                <StatCard
                  icon={Scale}
                  label="Total Berat Sampah"
                  value={`${reports.collectionStats.totalWeight.toFixed(2)} kg`}
                  subValue={`${reports.wasteTypeDistribution.length} jenis sampah`}
                  tooltip="Total berat sampah yang telah diproses"
                />
                
                <StatCard
                  icon={Wallet}
                  label="Total Pendapatan"
                  value={`Rp ${reports.financialStats.totalRevenue.toLocaleString('id-ID')}`}
                  subValue="Total pemasukan"
                  variant={reports.financialStats.revenueGrowth >= 0 ? 'success' : 'danger'}
                  tooltip="Total pendapatan dari transaksi daur ulang"
                />
                
                <StatCard
                  icon={Recycle}
                  label="Penghematan Daur Ulang"
                  value={formatCarbonValue(reports.impactStats.recyclingSavings)}
                  subValue={`${(reports.impactStats.recyclingSavings / 20).toFixed(1)} pohon setara`}
                  variant="success"
                  tooltip="Total karbon yang diselamatkan melalui daur ulang"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="p-6 bg-white border rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-800">Emisi Bulanan</h2>
                      <p className="text-sm text-zinc-500">Dampak karbon per bulan</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <BarChart2 className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="h-80">
                    {reports.monthlyTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reports.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                          <XAxis 
                            dataKey="label" 
                            stroke="#71717A"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#71717A"
                            fontSize={12}
                            tickFormatter={(value) => 
                              Math.abs(value) < 0.01 ? 
                                `${(value * 1000).toFixed(0)}g` : 
                                `${value.toFixed(2)}kg`
                            }
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'emissions') return [`${value.toFixed(4)} kg CO₂e`, 'Emisi'];
                              if (name === 'savings') return [`${value.toFixed(4)} kg CO₂e`, 'Penghematan'];
                              return [value, name];
                            }}
                          />
                          <Bar 
                            name="emissions" 
                            dataKey="emissions" 
                            fill="#EF4444" 
                            stackId="a"
                          />
                          <Bar 
                            name="savings" 
                            dataKey="savings" 
                            fill="#10B981" 
                            stackId="a"
                          />
                          <Legend formatter={(value) => value === 'emissions' ? 'Emisi Karbon' : 'Penghematan Karbon'} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <TreePine className="w-12 h-12 mb-2 text-zinc-300" />
                        <p className="text-zinc-500">Belum ada data emisi bulanan</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-white border rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-800">Emisi per Jenis Sampah</h2>
                      <p className="text-sm text-zinc-500">Dampak lingkungan berdasarkan jenis material</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <Recycle className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="h-80">
                    {reports.wasteTypeEmissions.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={reports.wasteTypeEmissions.slice(0, 8)} 
                          layout="vertical"
                          margin={{ left: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal={false} />
                          <XAxis 
                            type="number"
                            stroke="#71717A"
                            fontSize={12}
                            tickFormatter={(value) => 
                              Math.abs(value) < 0.01 ? 
                                `${(value * 1000).toFixed(0)}g` : 
                                `${value.toFixed(2)}kg`
                            }
                          />
                          <YAxis 
                            type="category"
                            dataKey="name" 
                            stroke="#71717A"
                            fontSize={12}
                            width={80}
                            tickFormatter={(value) => translateWasteType(value)}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              return [`${Math.abs(value) < 0.01 ? (value * 1000).toFixed(2) + ' g CO₂e' : value.toFixed(4) + ' kg CO₂e'}`, 
                              name === 'netEmission' ? 'Dampak Bersih' : name];
                            }}
                          />
                          <Bar 
                            name="netEmission" 
                            dataKey="netEmission" 
                            fill={(entry) => entry.netEmission < 0 ? "#10B981" : "#EF4444"}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Recycle className="w-12 h-12 mb-2 text-zinc-300" />
                        <p className="text-zinc-500">Belum ada data jenis sampah</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 mt-6 bg-white border rounded-xl border-zinc-200">
                <h2 className="mb-4 text-lg font-semibold text-zinc-800">Cara Perhitungan Emisi Karbon</h2>
                
                <div className="p-4 mb-4 border rounded-lg border-emerald-100 bg-emerald-50">
                  <h3 className="text-sm font-medium text-emerald-800">Rumus Perhitungan Emisi Pengolahan Sampah:</h3>
                  <p className="mt-2 font-mono text-emerald-700">
                    Emisi Pengolahan = Σ (EFSi × Berat Sampah)
                  </p>
                  <p className="mt-2 text-sm text-emerald-600">
                    Dimana:<br />
                    - EFSi = Faktor emisi untuk jenis sampah tertentu (kg CO₂e/kg)<br />
                    - Berat Sampah = Berat jenis sampah tertentu (kg)
                  </p>
                  <p className="mt-2 text-sm text-emerald-700">
                    <strong>Catatan:</strong> Nilai EFSi bisa positif (menghasilkan emisi) atau negatif (mengurangi emisi).
                  </p>
                </div>
                
                <div className="p-4 border border-purple-100 rounded-lg bg-purple-50">
                  <h3 className="text-sm font-medium text-purple-800">Rumus Perhitungan Total Dampak:</h3>
                  <p className="mt-2 font-mono text-purple-700">
                    Total Dampak = Emisi Pengolahan + Emisi Transportasi
                  </p>
                  <p className="mt-2 text-sm text-purple-600">
                    Nilai negatif berarti aktivitas daur ulang sampah secara keseluruhan mengurangi emisi karbon.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <div className="bg-white border rounded-xl border-zinc-200">
              <div className="p-6 border-b border-zinc-200">
                <h2 className="text-lg font-semibold text-zinc-800">Detail Permintaan Sampah</h2>
                <p className="text-sm text-zinc-500">Dampak lingkungan dari setiap permintaan</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Tanggal</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Bank Sampah</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Jenis Sampah</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Berat (kg)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Emisi (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Penghematan (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Dampak Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200">
                    {reports.requestsData.map((request) => {
                      let emissions = { wasteManagementEmission: 0, recyclingSavings: 0, totalEmission: 0 };
                      let totalWeight = 0;
                      
                      if (request.wastes) {
                        Object.entries(request.wastes).forEach(([type, data]) => {
                          const weight = data.weight || 0;
                          totalWeight += weight;
                          
                          const emissionFactor = emissionFactors[type] || 0.001;
                          if (emissionFactor >= 0) {
                            emissions.wasteManagementEmission += emissionFactor * weight;
                          } else {
                            emissions.recyclingSavings += Math.abs(emissionFactor * weight);
                          }
                        });
                      }
                      
                      emissions.totalEmission = emissions.wasteManagementEmission - emissions.recyclingSavings;
                      
                      return (
                        <tr key={request.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm text-zinc-900 whitespace-nowrap">
                            {request.completedAt ? moment(new Date(request.completedAt.seconds * 1000)).format('DD MMM YYYY') : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-900 whitespace-nowrap">
                            {request.wasteBankName}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500">
                            <div className="flex flex-wrap gap-1">
                              {request.wastes && Object.keys(request.wastes).map((type, i) => (
                                <span 
                                  key={i} 
                                  className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700"
                                >
                                  {translateWasteType(type)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-zinc-900 whitespace-nowrap">
                            {totalWeight.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-red-600 whitespace-nowrap">
                            {emissions.wasteManagementEmission.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-emerald-600 whitespace-nowrap">
                            {emissions.recyclingSavings.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap"
                            style={{
                              color: emissions.totalEmission < 0 ? '#10B981' : 
                                    emissions.totalEmission > 0 ? '#EF4444' : '#71717A'
                            }}
                          >
                            {emissions.totalEmission.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {reports.requestsData.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <h3 className="text-lg font-medium text-zinc-800">Belum Ada Permintaan</h3>
                  <p className="mt-1 text-zinc-500">Permintaan sampah yang telah selesai akan muncul di sini</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'waste-types' && (
            <div className="p-6 bg-white border rounded-xl border-zinc-200">
              <h2 className="mb-6 text-lg font-semibold text-zinc-800">Dampak Lingkungan per Jenis Sampah</h2>
              
              <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
                <div className="flex items-start gap-3">
                  <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Memahami Dampak Jenis Sampah</h3>
                    <p className="mt-1 text-sm text-blue-600">
                      Tabel di bawah menunjukkan faktor emisi dan penghematan karbon untuk setiap jenis sampah.
                      Nilai negatif (hijau) menunjukkan jenis sampah yang mendukung pengurangan emisi karbon,
                      sementara nilai positif (merah) menunjukkan jenis sampah yang menghasilkan emisi bersih.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Jenis Sampah</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Total Berat (kg)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Faktor Emisi (kg CO₂e/kg)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Emisi (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Penghematan (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Dampak Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200">
                    {reports.wasteTypeDistribution.map((type, index) => {
                      const emissionFactor = emissionFactors[type.name.replace(/ /g, '-').toLowerCase()] || 0;
                      
                      return (
                        <tr key={index} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900 whitespace-nowrap">
                            {translateWasteType(type.name)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-zinc-900 whitespace-nowrap">
                            {type.weight.toFixed(2)}
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-right whitespace-nowrap"
                            style={{
                              color: emissionFactor < 0 ? '#10B981' : 
                                    emissionFactor > 0 ? '#EF4444' : '#71717A'
                            }}
                          >
                            {emissionFactor.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-red-600 whitespace-nowrap">
                            {type.emissions.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-emerald-600 whitespace-nowrap">
                            {type.savings.toFixed(4)}
                          </td>
                          <td 
                            className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap"
                            style={{
                              color: type.netEmission < 0 ? '#10B981' : 
                                    type.netEmission > 0 ? '#EF4444' : '#71717A'
                            }}
                          >
                            {type.netEmission.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {reports.wasteTypeDistribution.length === 0 && (
                <div className="p-8 text-center">
                  <Recycle className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <h3 className="text-lg font-medium text-zinc-800">Belum Ada Data Jenis Sampah</h3>
                  <p className="mt-1 text-zinc-500">Data jenis sampah akan muncul di sini setelah permintaan selesai</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MasterReports;