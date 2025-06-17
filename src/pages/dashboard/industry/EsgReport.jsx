import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, limit } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import AiReportButton from '../../../components/AiReportButton';
import Sidebar from '../../../components/Sidebar';
import { 
  PieChart, Pie, 
  BarChart, Bar, 
  LineChart, Line, 
  AreaChart, Area,
  XAxis, YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell, 
  ResponsiveContainer,
  PieChart as PieChartIcon
} from 'recharts';
import { 
  BarChart2, 
  Download, 
  Calendar, 
  Globe as GlobeIcon,
  Loader2,
  Scale,
  Wallet,
  Recycle,
  CheckCircle,
  Leaf, 
  Droplets, 
  Zap, 
  Users, 
  Building, 
  UserCheck, 
  FileCheck, 
  Shield, 
  AlertTriangle,
  TreePine, 
  Package
} from 'lucide-react';
import { emissionFactors } from '../../../lib/carbonConstants';
import { calculateDistance } from '../../../lib/utils/distanceCalculator';
import { calculateEmissions, emissionFactorTransport, truckCapacity } from '../../../lib/utils/emissionCalculator';

// Enhanced UI components for better UX
const InfoPanel = ({ title, children }) => (
  <div className="p-5 mb-6 transition-all duration-300 border border-blue-100 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md">
    <h3 className="mb-3 text-lg font-semibold text-blue-800">{title}</h3>
    {children}
  </div>
);

const StatusCard = ({ label, count, icon: Icon, description = '', color = 'default' }) => {
  const colors = {
    default: 'bg-white',
    primary: 'bg-emerald-50 hover:bg-emerald-100',
    secondary: 'bg-blue-50 hover:bg-blue-100',
    accent: 'bg-indigo-50 hover:bg-indigo-100',
    warning: 'bg-amber-50 hover:bg-amber-100'
  };
  
  return (
    <div className={`${colors[color]} p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg bg-opacity-60">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-semibold text-gray-800">{count}</p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
    </div>
  );
};

const ChartContainer = ({ title, children, icon: Icon, hint = null }) => (
  <div className="p-6 transition-all duration-300 bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
    <div className="flex items-center gap-3 mb-4">
      {Icon && <Icon className="w-5 h-5 text-gray-600" />}
      <div>
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
    {children}
  </div>
);

// Improved action button with visual feedback
const ActionButton = ({ icon: Icon, label, variant = 'default', onClick }) => {
  const variants = {
    default: 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    primary: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800',
    secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
  };
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transform hover:scale-105 active:scale-95 transition-all duration-300 ${variants[variant]}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
};

// More intuitive tab selector
const TabSelector = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'environmental', label: 'Lingkungan', icon: Leaf },
    { id: 'social', label: 'Sosial', icon: Users },
    { id: 'governance', label: 'Tata Kelola', icon: Shield }
  ];
  
  return (
    <div className="p-1 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
      <div className="flex flex-wrap">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Social impact explainer component
const SocialImpactCard = ({ title, count, description, icon: Icon, color }) => (
  <div className={`p-5 rounded-xl ${color} border border-gray-200 shadow-sm`}>
    <div className="flex items-start gap-3">
      <div className="p-2 bg-white bg-opacity-50 rounded-lg">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-gray-800">{title}</h4>
        <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
        <p className="mt-1 text-sm text-gray-700">{description}</p>
      </div>
    </div>
  </div>
);

// Color palette for charts - Fixing undefined COLORS error
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  recycled: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800'
};

const formatCarbonValue = (value) => {
  if (Math.abs(value) < 0.001) {
    return `${(value * 1000).toFixed(2)} g CO₂e`;
  }
  return `${value.toFixed(4)} kg CO₂e`;
};

const EsgReport = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [collections, setCollections] = useState([]);
  const [timeframe, setTimeframe] = useState('month'); // 'week', 'month', 'year'
  const [summaryStats, setSummaryStats] = useState({
    totalWeight: 0,
    recyclableWeight: 0,
    recycledWeight: 0,
    pendingRequests: 0,
    completedRequests: 0,
    recyclingEfficiencyRate: 0
  });
  const [wasteDistribution, setWasteDistribution] = useState([]);
  const [recyclingEfficiency, setRecyclingEfficiency] = useState([]);
  const [weightByMonth, setWeightByMonth] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [environmentalImpact, setEnvironmentalImpact] = useState({
    co2Reduction: 0,
    waterSaved: 0,
    energyConserved: 0,
    landfillReduced: 0,
    treesPreserved: 0
  });

  const [socialImpact, setSocialImpact] = useState({
    wasteBankMasters: 0,
    wasteBankCollectors: 0,
    collectors: 0,
    wasteBankAdmins: 0,
    totalParticipants: 0,
    jobsCreated: 0,
    communityEngagement: []
  });

  const [governanceCompliance, setGovernanceCompliance] = useState({
    regulatoryCompliance: 'Non-compliant',
    reportingFrequency: 'Annually',
    sustainabilityScore: 50,
    pendingIssues: 0,
    lastAuditDate: null
  });

  const [activeTab, setActiveTab] = useState('environmental');
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [totalWasteWeight, setTotalWasteWeight] = useState(0);
  const [wasteTypeEmissions, setWasteTypeEmissions] = useState([]);
  const [monthlyEmissionsData, setMonthlyEmissionsData] = useState([]);

  const { userData, currentUser } = useAuth();
  const db = getFirestore();

  const ENV_CONVERSION = {
    CO2_PER_KG: 2.5,
    WATER_PER_KG: 1000,
    ENERGY_PER_KG: 5.3,
    TREES_PER_KG: 0.05
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        const requestsQuery = query(
          collection(db, 'industryRequests'), 
          where('industryId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(requestsData);
        
        const collectionsQuery = query(
          collection(db, 'industryCollections'), 
          where('industryId', '==', currentUser.uid)
        );
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const collectionsData = collectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCollections(collectionsData);
        
        processData(requestsData, collectionsData);
        
        try {
          const socialImpactData = {
            wasteBankMasters: 0,
            wasteBankCollectors: 0,
            collectors: 0,
            wasteBankAdmins: 0,
            totalParticipants: 0,
            jobsCreated: 0,
            communityEngagement: []
          };
          
          socialImpactData.communityEngagement = [
            { name: 'Collection Events', count: collectionsData.length }
          ];
          
          setSocialImpact(socialImpactData);
        } catch (error) {
          console.error('Error fetching social impact data:', error);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, db]);
  
  const processData = (requestsData, collectionsData) => {
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    const filteredRequests = requestsData.filter(req => {
      const reqDate = req.date?.toDate ? req.date.toDate() : 
                     req.date ? new Date(req.date) : null;
      return reqDate && reqDate >= startDate;
    });
    
    let totalEmissionsSum = 0;
    let totalWasteSum = 0;
    const wasteTypeStats = {};
    const monthlyData = {};
    
    filteredRequests.forEach(request => {
      let wastes = request.wastes || {};
      let emissions = {
        wasteManagementEmission: 0,
        transportEmission: 0,
        recyclingSavings: 0,
        totalEmission: 0,
        totalWeight: 0
      };
      
      if (request.wastes && request.wasteWeights) {
        const distance = 5;
        
        emissions = calculateEmissions(request, distance);
        totalWasteSum += emissions.totalWeight;
        totalEmissionsSum += emissions.totalEmission;
        
        Object.entries(request.wasteWeights).forEach(([wasteType, weight]) => {
          if (!wasteTypeStats[wasteType]) {
            wasteTypeStats[wasteType] = {
              name: wasteType.replace(/-/g, ' '),
              weight: 0,
              emissions: 0,
              savings: 0
            };
          }
          
          const emissionFactor = emissionFactors[wasteType] || 0.001;
          wasteTypeStats[wasteType].weight += parseFloat(weight) || 0;
          
          if (emissionFactor >= 0) {
            wasteTypeStats[wasteType].emissions += emissionFactor * parseFloat(weight);
          } else {
            wasteTypeStats[wasteType].savings += Math.abs(emissionFactor * parseFloat(weight));
          }
        });
        
        if (request.completedAt) {
          const date = request.completedAt.toDate ? request.completedAt.toDate() : 
                      new Date(request.completedAt);
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
          
          monthlyData[monthYear].emissions += emissions.wasteManagementEmission;
          monthlyData[monthYear].savings += emissions.recyclingSavings;
          monthlyData[monthYear].totalWeight += emissions.totalWeight;
          monthlyData[monthYear].count += 1;
        }
      }
    });
    
    setTotalEmissions(totalEmissionsSum);
    setTotalWasteWeight(totalWasteSum);
    
    const wasteTypeArray = Object.values(wasteTypeStats)
      .map(type => ({
        ...type,
        netEmission: type.emissions - type.savings
      }))
      .sort((a, b) => b.weight - a.weight);
    
    const wasteTypeEmissionsData = wasteTypeArray.map(type => ({
      name: type.name,
      emission: type.emissions,
      saving: type.savings,
      netEmission: type.netEmission
    }));
    
    setWasteTypeEmissions(wasteTypeEmissionsData);
    
    const monthlyEmissionsArray = Object.values(monthlyData)
      .map(month => ({
        ...month,
        netEmissions: month.emissions - month.savings,
        label: `${month.month} ${month.year}`
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month.localeCompare(b.month);
      });
    
    setMonthlyEmissionsData(monthlyEmissionsArray);
    
    const totalWeight = filteredRequests.reduce((sum, req) => {
      if (!req.wasteWeights) return sum;
      return sum + Object.values(req.wasteWeights).reduce((w, weight) => w + (parseFloat(weight) || 0), 0);
    }, 0);
    
    const environmentalMetrics = {
      co2Reduction: Math.abs(totalEmissionsSum),
      waterSaved: totalWeight * ENV_CONVERSION.WATER_PER_KG,
      energyConserved: totalWeight * ENV_CONVERSION.ENERGY_PER_KG,
      landfillReduced: totalWeight,
      treesPreserved: Math.round(totalWeight * ENV_CONVERSION.TREES_PER_KG)
    };
    
    setEnvironmentalImpact(environmentalMetrics);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar 
          role={userData?.role}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-emerald-500" />
              <p className="mt-4 text-gray-600">Memuat data ESG...</p>
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
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Laporan ESG</h1>
              <p className="mt-1 text-gray-500">
                Pengukuran dampak lingkungan, sosial, dan tata kelola dari aktivitas daur ulang Anda
              </p>
            </div>
            
            <div className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex">
                <button 
                  onClick={() => setTimeframe('week')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                    timeframe === 'week' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Minggu Ini
                </button>
                <button 
                  onClick={() => setTimeframe('month')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                    timeframe === 'month' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Bulan Ini
                </button>
                <button 
                  onClick={() => setTimeframe('year')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                    timeframe === 'year' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tahun Ini
                </button>
              </div>
            </div>
          </div>
          
          <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <InfoPanel title="Ringkasan Kinerja ESG">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatusCard 
                label="Total Sampah Dikelola" 
                count={`${summaryStats.totalWeight.toFixed(2)} kg`} 
                icon={Scale} 
                color="warning"
                description="Jumlah sampah yang telah diproses"
              />
              <StatusCard 
                label="Efisiensi Daur Ulang" 
                count={`${summaryStats.recyclingEfficiencyRate}%`} 
                icon={Recycle} 
                color="primary"
                description="Persentase sampah yang berhasil didaur ulang"
              />
              <StatusCard 
                label="Permintaan Selesai" 
                count={summaryStats.completedRequests} 
                icon={CheckCircle} 
                color="secondary"
                description="Jumlah permintaan yang telah diselesaikan"
              />
            </div>
          </InfoPanel>
          
          {activeTab === 'environmental' && (
            <>
              <div className="grid grid-cols-1 gap-5 mb-6 md:grid-cols-3">
                <StatusCard
                  label="Total Dampak Karbon"
                  count={formatCarbonValue(totalEmissions)}
                  icon={TreePine}
                  description="Dari semua aktivitas pengolahan sampah"
                  color="primary"
                />
                
                <StatusCard
                  label="Total Berat Sampah"
                  count={`${totalWasteWeight.toFixed(2)} kg`}
                  icon={Scale}
                  description={`${wasteTypeEmissions.length} jenis sampah terproses`}
                  color="secondary"
                />
                
                <StatusCard
                  label="Penghematan Daur Ulang"
                  count={formatCarbonValue(Math.abs(environmentalImpact.co2Reduction))}
                  icon={Recycle}
                  description="Karbon yang diselamatkan melalui daur ulang"
                  color="accent"
                />
              </div>
              
              <ChartContainer 
                title="Emisi Karbon Bulanan" 
                icon={BarChart2}
                hint="Dampak karbon per bulan dari kegiatan daur ulang"
              >
                <div className="h-[300px]">
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
              </ChartContainer>
              
              <ChartContainer 
                title="Emisi per Jenis Sampah" 
                icon={Recycle}
                hint="Dampak lingkungan berdasarkan jenis material"
              >
                <div className="h-[300px]">
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
                      <Package className="w-12 h-12 mb-2 text-zinc-300" />
                      <p className="text-zinc-500">Belum ada data jenis sampah</p>
                    </div>
                  )}
                </div>
              </ChartContainer>
            </>
          )}
          
          <div className="flex justify-end mt-8">
            <AiReportButton 
              reportData={{
                chartDescriptions: [
                  {
                    title: "Emisi Karbon Bulanan",
                    description: `Dampak karbon per bulan dari kegiatan pengolahan sampah industri`
                  },
                  {
                    title: "Emisi per Jenis Sampah",
                    description: `Dampak lingkungan berdasarkan jenis material`
                  }
                ],
                displayedMetrics: [
                  {
                    name: "Total Dampak Karbon",
                    value: formatCarbonValue(totalEmissions),
                    description: `${requests.length} total pengolahan`
                  },
                  {
                    name: "Total Berat Sampah",
                    value: `${totalWasteWeight.toFixed(2)} kg`,
                    description: `${wasteTypeEmissions.length} jenis sampah`
                  },
                  {
                    name: "Air Bersih Terselamatkan",
                    value: `${(typeof environmentalImpact.waterSaved === 'number' ? environmentalImpact.waterSaved.toLocaleString('id-ID') : '0')} L`,
                    description: "Air yang tidak terpakai dalam produksi baru"
                  },
                  {
                    name: "Penghematan Daur Ulang",
                    value: formatCarbonValue(Math.abs(environmentalImpact.co2Reduction)),
                    description: "Karbon yang diselamatkan melalui daur ulang"
                  }
                ],
                wasteDistribution: wasteTypeEmissions.map(type => ({
                  name: type.name,
                  weight: type.weight || 0,
                  impact: type.netEmission
                })),
                mapData: {
                  wasteBankLocations: socialImpact.wasteBankMasters || 0,
                  industryLocations: 1,
                  totalLocations: (socialImpact.totalParticipants || 0) + 1
                },
                performanceTrends: {
                  timePeriod: timeframe,
                  emissionTrend: monthlyEmissionsData.length > 1 ?
                    (monthlyEmissionsData[monthlyEmissionsData.length-1].netEmissions <
                    monthlyEmissionsData[0].netEmissions ? "membaik" : "meningkat") : "stabil"
                }
              }}
              role="industry"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EsgReport;