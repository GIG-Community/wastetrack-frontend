import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';
import { 
  Building2, 
  TreePine, 
  Info, 
  BarChart3, 
  Truck, 
  HelpCircle,
  Recycle,
  Scale,
  ChevronRight,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { emissionFactors } from '../../../lib/carbonConstants';
import { calculateDistance } from '../../../lib/utils/distanceCalculator';
import { calculateEmissions, emissionFactorTransport, truckCapacity } from '../../../lib/utils/emissionCalculator';
import AiReportButton from '../../../components/AiReportButton';
import 'jspdf-autotable';
import 'moment/locale/id'; // Import Indonesian locale;
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';


// Constants
const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Reusable components
const HoverTooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-50 invisible w-64 px-3 py-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

const InfoPanel = ({ title, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <h3 className="text-sm font-medium text-blue-800">{title}</h3>
            <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
          {isExpanded && (
            <div className="mt-2 text-sm text-blue-700">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, trendValue, variant = "success", className = "", infoText }) => (
  <div className={`bg-white rounded-xl p-6 border border-zinc-200 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-zinc-100 rounded-lg">
            <Icon className="w-6 h-6 text-zinc-600" />
          </div>
          {infoText && (
            <HoverTooltip content={infoText}>
              <HelpCircle className="w-4 h-4 text-zinc-400" />
            </HoverTooltip>
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
          {trendValue}
        </div>
      )}
    </div>
    {trend && (
      <p className="mt-2 text-sm text-zinc-500">{trend}</p>
    )}
  </div>
);

const Reports = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [totalEmissions, setTotalEmissions] = useState(0);
  const [wasteBankLocation, setWasteBankLocation] = useState(null);
  const [wasteTypeData, setWasteTypeData] = useState([]);
  const [monthlyEmissionsData, setMonthlyEmissionsData] = useState([]);
  const [wasteTypeEmissions, setWasteTypeEmissions] = useState([]);
  const [totalWasteWeight, setTotalWasteWeight] = useState(0);
  const [totalDistanceCovered, setTotalDistanceCovered] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'details', 'waste-types'

  // Fetch waste bank location from users collection
  const fetchWasteBankLocation = async (wasteBankId) => {
    try {
      // Modify query to only fetch current user's data
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", "wastebank_admin"),
        where("id", "==", currentUser.uid)  // Add this condition
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        
        // Check for coordinates in location field
        if (userData.location?.coordinates) {
          return {
            lat: userData.location.coordinates.latitude || userData.location.coordinates.lat,
            lng: userData.location.coordinates.longitude || userData.location.coordinates.lng
          };
        }
        
        // Check for coordinates in profile.location field
        if (userData.profile?.location?.coordinates) {
          return {
            lat: userData.profile.location.coordinates.latitude || userData.profile.location.coordinates.lat,
            lng: userData.profile.location.coordinates.longitude || userData.profile.location.coordinates.lng
          };
        }
      }
      
      console.log("Tidak ditemukan koordinat bank sampah");
      return null;
    } catch (error) {
      console.error("Error saat mengambil koordinat bank sampah:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchPickups = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        
        // Get waste bank ID from userData if available
        let wasteBankId;
        
        if (userData && userData.id) {
          wasteBankId = userData.id;
        } else {
          // Query for waste bank ID
          const wasteBankQuery = query(
            collection(db, "wasteBanks"), 
            where("ownerId", "==", currentUser.uid)
          );
          const wasteBankSnapshot = await getDocs(wasteBankQuery);
          
          if (wasteBankSnapshot.empty) {
            setLoading(false);
            return;
          }
          
          wasteBankId = wasteBankSnapshot.docs[0].id;
        }

        // Fetch waste bank location
        const bankLocation = await fetchWasteBankLocation(wasteBankId);
        setWasteBankLocation(bankLocation);
        
        // Fetch completed pickups for this waste bank
        const pickupsQuery = query(
          collection(db, "pickups"), 
          where('wasteBankId', '==', wasteBankId),
          where("status", "==", "completed")
        );
        
        const pickupsSnapshot = await getDocs(pickupsQuery);
        
        const pickupsData = [];
        let totalEmissionsSum = 0;
        let totalWeight = 0;
        let totalDistance = 0;
        
        // Data for waste types
        const wasteTypeStats = {};
        
        // Data for monthly emissions
        const monthlyData = {};
        
        // Process each pickup
        for (const doc of pickupsSnapshot.docs) {
          const pickupData = { id: doc.id, ...doc.data() };
          
          let distance = 5; // Default distance in km if locations not available
          
          // Calculate distance if coordinates are available
          if (pickupData.coordinates && bankLocation) {
            distance = calculateDistance(
              bankLocation.lat, bankLocation.lng,
              pickupData.coordinates.lat, pickupData.coordinates.lng
            );
          }
          
          totalDistance += distance;
          
          // Calculate emissions
          const emissions = calculateEmissions(pickupData, distance);
          totalWeight += emissions.totalWeight;
          
          // Process waste type data for charts
          if (pickupData.wastes) {
            Object.entries(pickupData.wastes).forEach(([wasteType, data]) => {
              if (!wasteTypeStats[wasteType]) {
                wasteTypeStats[wasteType] = {
                  name: wasteType.replace(/-/g, ' '),
                  weight: 0,
                  emissions: 0,
                  savings: 0
                };
              }
              
              const weight = data.weight || 0;
              const emissionFactor = emissionFactors[wasteType] || 0.001;
              
              wasteTypeStats[wasteType].weight += weight;
              
              if (emissionFactor >= 0) {
                wasteTypeStats[wasteType].emissions += emissionFactor * weight;
              } else {
                wasteTypeStats[wasteType].savings += Math.abs(emissionFactor * weight);
              }
            });
          }
          
          // Process monthly data
          if (pickupData.completedAt) {
            const date = new Date(pickupData.completedAt.seconds * 1000);
            const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
            
            if (!monthlyData[monthYear]) {
              monthlyData[monthYear] = {
                month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
                year: date.getFullYear(),
                emissions: 0,
                savings: 0,
                totalWeight: 0,
                count: 0
              };
            }
            
            monthlyData[monthYear].emissions += emissions.wasteManagementEmission + emissions.transportEmission;
            monthlyData[monthYear].savings += emissions.recyclingSavings;
            monthlyData[monthYear].totalWeight += emissions.totalWeight;
            monthlyData[monthYear].count += 1;
          }
          
          pickupsData.push({
            ...pickupData,
            distance,
            emissions
          });
          
          totalEmissionsSum += emissions.totalEmission;
        }
        
        // Convert wasteTypeStats to array and sort by weight
        const wasteTypeArray = Object.values(wasteTypeStats)
          .map(type => ({
            ...type,
            netEmission: type.emissions - type.savings
          }))
          .sort((a, b) => b.weight - a.weight);
        
        // Convert monthlyData to array and sort by date
        const monthlyDataArray = Object.values(monthlyData)
          .map(month => ({
            ...month,
            netEmissions: month.emissions - month.savings,
            label: `${month.month} ${month.year}`
          }))
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month.localeCompare(b.month);
          });
        
        setPickups(pickupsData);
        setTotalEmissions(totalEmissionsSum);
        setWasteTypeData(wasteTypeArray);
        setMonthlyEmissionsData(monthlyDataArray);
        setTotalWasteWeight(totalWeight);
        setTotalDistanceCovered(totalDistance);
        
        // Calculate emissions by waste type for bar chart
        const wasteTypeEmissionsData = wasteTypeArray.map(type => ({
          name: type.name,
          emission: type.emissions,
          saving: type.savings,
          netEmission: type.netEmission
        }));
        
        setWasteTypeEmissions(wasteTypeEmissionsData);
        
        setLoading(false);
      } catch (error) {
        console.error("Error saat mengambil data pengumpulan:", error);
        setLoading(false);
      }
    };

    fetchPickups();
  }, [currentUser, userData]);

  const formatCarbonValue = (value) => {
    if (Math.abs(value) < 0.001) {
      return `${(value * 1000).toFixed(2)} g CO₂e`;
    }
    return `${value.toFixed(4)} kg CO₂e`;
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
      // Add more translations as needed
    };
    
    return translations[type] || type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 mb-4 text-emerald-500 animate-spin" />
          <p className="text-lg text-gray-700">Memuat data emisi karbon...</p>
        </div>
      </div>
    );
  }

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white border rounded-lg shadow-lg border-zinc-200">
          <p className="font-medium text-zinc-800">{payload[0].payload.name || payload[0].payload.label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mt-1 text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value < 0.01 && entry.value > -0.01 ? 
                `${(entry.value * 1000).toFixed(2)} g CO₂e` : 
                `${entry.value.toFixed(4)} kg CO₂e`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-6">
          {/* Header */}
<div className="flex items-center gap-4 mb-8">
  <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
    <TreePine className="w-6 h-6 text-emerald-500" />
  </div>
  <div>
    <h1 className="text-2xl font-semibold text-zinc-800">Laporan Emisi Karbon</h1>
    <p className="text-sm text-zinc-500">
      Analisis dampak lingkungan dari kegiatan pengumpulan sampah
    </p>
  </div>
</div>

{/* Tambahkan tombol AI Report setelah header */}
<div className="flex justify-end mb-4">
  <AiReportButton 
    reportData={{
      chartDescriptions: [
        {
          title: "Emisi Bulanan",
          description: `Dampak karbon per bulan dari kegiatan pengumpulan`
        },
        {
          title: "Emisi per Jenis Sampah",
          description: `Dampak lingkungan berdasarkan jenis material`
        }
      ],
      displayedMetrics: [
        {
          name: "Total Dampak Karbon",
          value: totalEmissions < 0.001 ? 
                 `${(totalEmissions * 1000).toFixed(2)} g CO₂e` : 
                 `${totalEmissions.toFixed(4)} kg CO₂e`,
          description: `${pickups.length} total pengumpulan`
        },
        {
          name: "Total Berat Sampah",
          value: `${totalWasteWeight.toFixed(2)} kg`,
          description: `${wasteTypeData.length} jenis sampah`
        },
        {
          name: "Total Jarak Tempuh",
          value: `${totalDistanceCovered.toFixed(2)} km`,
          description: "Jarak yang ditempuh untuk pengumpulan"
        },
        {
          name: "Penghematan Daur Ulang",
          value: formatCarbonValue(pickups.reduce((sum, p) => sum + p.emissions.recyclingSavings, 0)),
          description: "Karbon yang diselamatkan melalui daur ulang"
        }
      ],
      wasteDistribution: wasteTypeData.map(type => ({
        name: type.name,
        weight: type.weight,
        impact: type.netEmission
      })),
      mapData: {
        wasteBankLocations: 1, // ini adalah satu bank sampah unit
        pickupLocations: pickups.length,
        totalTransactions: pickups.length
      },
      performanceTrends: {
        timePeriod: "all",
        monthlyData: monthlyEmissionsData.length,
        emissionTrend: monthlyEmissionsData.length > 1 ?
          (monthlyEmissionsData[monthlyEmissionsData.length-1].netEmissions <
           monthlyEmissionsData[0].netEmissions ? "membaik" : "meningkat") : "stabil"
      }
    }}
    role="wastebank_admin"
  />
</div>


          {/* Info Panel */}
          <InfoPanel title="Tentang Laporan Emisi Karbon" defaultExpanded={true}>
            <p>
              Laporan ini menghitung dampak lingkungan dari kegiatan pengumpulan sampah dalam bentuk emisi karbon.
              Perhitungan mempertimbangkan dua faktor utama:
            </p>
            <ol className="mt-2 ml-6 list-decimal">
              <li className="mb-1"><strong>Emisi Transportasi</strong> - Karbon yang dihasilkan saat mengangkut sampah (berdasarkan jarak tempuh dan berat sampah)</li>
              <li className="mb-1"><strong>Emisi Pengolahan</strong> - Karbon yang dihasilkan atau diselamatkan melalui proses daur ulang berbagai jenis sampah</li>
            </ol>
            <p className="mt-2">
              Nilai negatif menunjukkan <strong className="text-emerald-700">penghematan karbon</strong> (dampak positif bagi lingkungan),
              sementara nilai positif menunjukkan <strong className="text-red-700">penambahan emisi</strong>.
            </p>
          </InfoPanel>

          {/* Tab Navigation */}
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
              Detail Pengumpulan
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

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={TreePine}
                  label="Total Dampak Karbon"
                  value={formatCarbonValue(totalEmissions)}
                  variant={totalEmissions < 0 ? 'success' : 'danger'}
                  trend="Total Pengumpulan"
                  trendValue={`${pickups.length} pengumpulan`}
                  infoText="Jumlah emisi karbon bersih dari semua aktivitas pengumpulan. Nilai negatif menunjukkan penghematan karbon."
                />
                
                <StatCard
                  icon={Scale}
                  label="Total Berat Sampah"
                  value={`${totalWasteWeight.toFixed(2)} kg`}
                  trend="Jenis Sampah"
                  trendValue={`${wasteTypeData.length} jenis`}
                  infoText="Total berat sampah yang telah dikumpulkan dari semua pengambilan"
                />
                
                <StatCard
                  icon={Truck}
                  label="Total Jarak Tempuh"
                  value={`${totalDistanceCovered.toFixed(2)} km`}
                  trend="Emisi Transportasi"
                  trendValue={`${(pickups.reduce((sum, p) => sum + p.emissions.transportEmission, 0)).toFixed(4)} kg CO₂e`}
                  infoText="Total jarak yang ditempuh untuk semua pengumpulan sampah"
                />
                
                <StatCard
                  icon={Recycle}
                  label="Penghematan Daur Ulang"
                  value={formatCarbonValue(pickups.reduce((sum, p) => sum + p.emissions.recyclingSavings, 0))}
                  trend="Efektivitas Pengumpulan"
                  trendValue={`${(pickups.length ? (pickups.reduce((sum, p) => sum + p.emissions.recyclingSavings, 0) / pickups.length).toFixed(2) : 0)} kg CO₂e/pengumpulan`}
                  variant="success"
                  infoText="Total karbon yang diselamatkan melalui daur ulang"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Monthly Emissions Chart */}
                <div className="p-6 bg-white border rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-800">Emisi Bulanan</h2>
                      <p className="text-sm text-zinc-500">Dampak karbon per bulan</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="h-80">
                    {monthlyEmissionsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyEmissionsData}>
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
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar 
                            name="Emisi" 
                            dataKey="emissions" 
                            fill="#EF4444" 
                            stackId="a"
                          />
                          <Bar 
                            name="Penghematan" 
                            dataKey="savings" 
                            fill="#10B981" 
                            stackId="a"
                          />
                          <RechartsTooltip />
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

                {/* Waste Type Distribution */}
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
                    {wasteTypeEmissions.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={wasteTypeEmissions.slice(0, 8)} 
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
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar 
                            name="Dampak Bersih" 
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

              {/* Carbon Calculation Formula Explanation */}
              <div className="p-6 mt-6 bg-white border rounded-xl border-zinc-200">
                <h2 className="mb-4 text-lg font-semibold text-zinc-800">Cara Perhitungan Emisi Karbon</h2>
                
                <div className="p-4 mb-4 border border-blue-100 rounded-lg bg-blue-50">
                  <h3 className="text-sm font-medium text-blue-800">Rumus Perhitungan Emisi Transportasi:</h3>
                  <p className="mt-2 font-mono text-blue-700">
                    Emisi Transportasi = EFSt × (Berat / Kapasitas) × Jarak
                  </p>
                  <p className="mt-2 text-sm text-blue-600">
                    Dimana:<br />
                    - EFSt = Faktor emisi transportasi ({emissionFactorTransport} kg CO₂e/kg-km)<br />
                    - Berat = Total berat sampah yang diangkut (kg)<br />
                    - Kapasitas = Kapasitas kendaraan ({truckCapacity} kg)<br />
                    - Jarak = Jarak tempuh (km)
                  </p>
                </div>
                
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
                    Total Dampak = Emisi Pengolahan + Emisi Transportasi - Penghematan Daur Ulang
                  </p>
                  <p className="mt-2 text-sm text-purple-600">
                    Nilai negatif berarti aktivitas pengumpulan sampah secara keseluruhan mengurangi emisi karbon.
                  </p>
                </div>

              </div>
            </>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="bg-white border rounded-xl border-zinc-200">
              <div className="p-6 border-b border-zinc-200">
                <h2 className="text-lg font-semibold text-zinc-800">Detail Pengumpulan Sampah</h2>
                <p className="text-sm text-zinc-500">Dampak lingkungan dari setiap pengumpulan</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Tanggal</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Pelanggan</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-zinc-500">Jenis Sampah</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Berat (kg)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Jarak (km)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Emisi (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Penghematan (kg CO₂e)</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-zinc-500">Dampak Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200">
                    {pickups.map((pickup) => {
                      // Calculate total weight
                      let totalWeight = 0;
                      if (pickup.wastes) {
                        totalWeight = Object.values(pickup.wastes).reduce((sum, data) => sum + (data.weight || 0), 0);
                      } else if (pickup.wasteQuantities) {
                        totalWeight = Object.values(pickup.wasteQuantities).reduce((sum, weight) => sum + weight, 0);
                      }
                      
                      const emissionsValue = pickup.emissions.wasteManagementEmission + pickup.emissions.transportEmission;
                      const savingsValue = pickup.emissions.recyclingSavings;
                      
                      return (
                        <tr key={pickup.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm text-zinc-900 whitespace-nowrap">
                            {format(pickup.date.toDate(), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-900 whitespace-nowrap">
                            {pickup.userName}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500">
                            <div className="flex flex-wrap gap-1">
                              {(pickup.wasteTypes || []).map((type, i) => (
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
                          <td className="px-6 py-4 text-sm text-right text-zinc-900 whitespace-nowrap">
                            {pickup.distance.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-red-600 whitespace-nowrap">
                            {emissionsValue.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-emerald-600 whitespace-nowrap">
                            {savingsValue.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap"
                            style={{
                              color: pickup.emissions.totalEmission < 0 ? '#10B981' : 
                                    pickup.emissions.totalEmission > 0 ? '#EF4444' : '#71717A'
                            }}
                          >
                            {pickup.emissions.totalEmission.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {pickups.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <h3 className="text-lg font-medium text-zinc-800">Belum Ada Pengumpulan</h3>
                  <p className="mt-1 text-zinc-500">Pengumpulan sampah yang telah selesai akan muncul di sini</p>
                </div>
              )}
            </div>
          )}

          {/* Waste Types Tab */}
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
                    {wasteTypeData.map((type, index) => {
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
              
              {wasteTypeData.length === 0 && (
                <div className="p-8 text-center">
                  <Recycle className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <h3 className="text-lg font-medium text-zinc-800">Belum Ada Data Jenis Sampah</h3>
                  <p className="mt-1 text-zinc-500">Data jenis sampah akan muncul di sini setelah pengumpulan selesai</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;
