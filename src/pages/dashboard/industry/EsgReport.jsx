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
  AlertTriangle
} from 'lucide-react';

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
        const requestsQuery = query(
          collection(db, 'industryRequests'), 
          where('industryId', '==', currentUser.uid)
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
        await fetchSocialImpactData();
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, db]);
  
  useEffect(() => {
    if (requests.length > 0 || collections.length > 0) {
      processData(requests, collections);
    }
  }, [timeframe, requests, collections]);
  
  const fetchSocialImpactData = async () => {
    try {
      const roles = ['wastebank_master', 'wastebank_master_collector', 'collector', 'wastebank_admin'];
      
      const socialImpactData = {
        wasteBankMasters: 0,
        wasteBankCollectors: 0,
        collectors: 0,
        wasteBankAdmins: 0,
        totalParticipants: 0,
        jobsCreated: 0,
        communityEngagement: []
      };
      
      for (const role of roles) {
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', role)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const count = usersSnapshot.docs.length;
        
        switch(role) {
          case 'wastebank_master':
            socialImpactData.wasteBankMasters = count;
            break;
          case 'wastebank_master_collector':
            socialImpactData.wasteBankCollectors = count;
            break;
          case 'collector':
            socialImpactData.collectors = count;
            break;
          case 'wastebank_admin':
            socialImpactData.wasteBankAdmins = count;
            break;
        }
        
        socialImpactData.totalParticipants += count;
      }
      
      socialImpactData.jobsCreated = socialImpactData.wasteBankCollectors + socialImpactData.collectors;
      
      const eventsQuery = query(
        collection(db, 'collectionEvents'),
        limit(50)
      );
      
      try {
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => doc.data());
        
        const eventTypes = eventsData.reduce((acc, event) => {
          const type = event.type || 'Collection Event';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        socialImpactData.communityEngagement = Object.entries(eventTypes).map(([name, count]) => ({
          name,
          count
        }));
        
        if (socialImpactData.communityEngagement.length === 0) {
          socialImpactData.communityEngagement = [
            { name: 'Collection Events', count: collections.length }
          ];
        }
      } catch (error) {
        console.error('Error fetching community events:', error);
        socialImpactData.communityEngagement = [
          { name: 'Collection Events', count: collections.length }
        ];
      }
      
      setSocialImpact(socialImpactData);
      
    } catch (error) {
      console.error('Error fetching social impact data:', error);
    }
  };
  
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
      const reqDate = req.date?.toDate ? req.date.toDate() : null;
      return reqDate && reqDate >= startDate;
    });
    
    const filteredCollections = collectionsData.filter(col => {
      const colDate = col.createdAt?.toDate ? col.createdAt.toDate() : null;
      return colDate && colDate >= startDate;
    });
    
    const totalWeight = filteredRequests.reduce((sum, req) => {
      if (!req.wasteWeights) return sum;
      return sum + Object.values(req.wasteWeights).reduce((w, weight) => w + (parseFloat(weight) || 0), 0);
    }, 0);
    
    const recyclableWeight = filteredCollections.reduce((sum, col) => sum + (parseFloat(col.totalInputWeight) || 0), 0);
    
    const recycledWeight = filteredCollections.reduce((sum, col) => {
      if (!col.recycledWeights) return sum;
      return sum + Object.values(col.recycledWeights).reduce((w, item) => {
        return w + (parseFloat(item.weight) || 0);
      }, 0);
    }, 0);
    
    const pendingRequests = filteredRequests.filter(req => req.status !== 'completed').length;
    const completedRequests = filteredRequests.filter(req => req.status === 'completed').length;
    
    const recyclingEfficiencyRate = recyclableWeight > 0 
      ? Math.round((recycledWeight / recyclableWeight) * 100) 
      : 0;
    
    setSummaryStats({
      totalWeight: parseFloat(totalWeight) || 0,
      recyclableWeight: parseFloat(recyclableWeight) || 0,
      recycledWeight: parseFloat(recycledWeight) || 0,
      pendingRequests,
      completedRequests,
      recyclingEfficiencyRate
    });
    
    const wasteTypes = {};
    filteredRequests.forEach(req => {
      if (req.wasteWeights) {
        Object.entries(req.wasteWeights).forEach(([type, weight]) => {
          wasteTypes[type] = (wasteTypes[type] || 0) + (parseFloat(weight) || 0);
        });
      }
    });
    
    const wasteDistributionData = Object.entries(wasteTypes).map(([name, value]) => ({
      name,
      value
    }));
    
    setWasteDistribution(wasteDistributionData);
    
    const recyclingData = [];
    const wasteRecyclingMap = {};
    
    filteredCollections.forEach(col => {
      if (col.originalWastes && col.recycledWeights) {
        Object.keys(col.originalWastes).forEach(wasteType => {
          const original = parseFloat(col.originalWastes[wasteType]?.weight) || 0;
          const recycled = parseFloat(col.recycledWeights[wasteType]?.weight) || 0;
          
          if (!wasteRecyclingMap[wasteType]) {
            wasteRecyclingMap[wasteType] = { original: 0, recycled: 0 };
          }
          
          wasteRecyclingMap[wasteType].original += original;
          wasteRecyclingMap[wasteType].recycled += recycled;
        });
      }
    });
    
    Object.entries(wasteRecyclingMap).forEach(([wasteType, data]) => {
      recyclingData.push({
        name: wasteType,
        original: data.original,
        recycled: data.recycled,
        efficiency: data.original > 0 ? Math.round((data.recycled / data.original) * 100) : 0
      });
    });
    
    setRecyclingEfficiency(recyclingData);
    
    const weightMonthly = {};
    
    filteredRequests.forEach(req => {
      if (!req.date?.toDate) return;
      
      const date = req.date.toDate();
      const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (req.wasteWeights) {
        weightMonthly[month] = (weightMonthly[month] || 0) + 
          Object.values(req.wasteWeights).reduce((sum, weight) => sum + (parseFloat(weight) || 0), 0);
      }
    });
    
    const weightData = Object.entries(weightMonthly).map(([month, weight]) => {
      const [year, monthNum] = month.split('-');
      return {
        month: new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        weight
      };
    }).sort((a, b) => new Date(a.month) - new Date(b.month));
    
    setWeightByMonth(weightData);

    const safeRecycledWeight = parseFloat(recycledWeight) || 0;
    
    const environmentalMetrics = {
      co2Reduction: safeRecycledWeight * ENV_CONVERSION.CO2_PER_KG,
      waterSaved: safeRecycledWeight * ENV_CONVERSION.WATER_PER_KG,
      energyConserved: safeRecycledWeight * ENV_CONVERSION.ENERGY_PER_KG,
      landfillReduced: safeRecycledWeight,
      treesPreserved: Math.round(safeRecycledWeight * ENV_CONVERSION.TREES_PER_KG)
    };
    
    setEnvironmentalImpact(environmentalMetrics);
    
    const pendingRequestsCount = summaryStats.pendingRequests || 0;
    const completedRequestsCount = summaryStats.completedRequests || 0;
    const totalRequests = pendingRequestsCount + completedRequestsCount;
    
    let complianceStatus = 'Non-compliant';
    let sustainabilityScore = 50;
    
    if (safeRecycledWeight > 0) {
      sustainabilityScore += Math.min(safeRecycledWeight / 2, 30);
      const efficiencyBonus = Math.min(summaryStats.recyclingEfficiencyRate / 2, 20);
      sustainabilityScore += efficiencyBonus;
      
      if (sustainabilityScore >= 80) {
        complianceStatus = 'Compliant';
      } else if (sustainabilityScore >= 60) {
        complianceStatus = 'Partial';
      }
    }
    
    let lastAuditDate = null;
    if (collectionsData.length > 0) {
      const sortedCollections = [...collectionsData]
        .filter(col => col.recycledAt)
        .sort((a, b) => {
          const dateA = a.recycledAt?.toDate?.() || new Date(a.recycledAt);
          const dateB = b.recycledAt?.toDate?.() || new Date(b.recycledAt);
          return dateB - dateA;
        });
      
      if (sortedCollections.length > 0) {
        lastAuditDate = sortedCollections[0].recycledAt?.toDate?.() || 
                         new Date(sortedCollections[0].recycledAt);
      }
    }
    
    setGovernanceCompliance({
      regulatoryCompliance: complianceStatus,
      reportingFrequency: totalRequests >= 12 ? 'Monthly' : totalRequests >= 4 ? 'Quarterly' : 'Annually',
      sustainabilityScore: Math.round(sustainabilityScore),
      pendingIssues: pendingRequestsCount,
      lastAuditDate
    });
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return timestamp.toDate().toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar 
          role={userData?.role}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
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
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          
          {/* Improved header with more intuitive description */}
          <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Laporan ESG</h1>
              <p className="mt-1 text-gray-500">
                Pengukuran dampak lingkungan, sosial, dan tata kelola dari aktivitas daur ulang Anda
              </p>
            </div>
            
            {/* Timeframe selector for filtering data */}
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
          
          {/* Improved tab selector */}
          <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Summary metrics visible in all tabs */}
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
                  label="Reduksi Emisi CO2"
                  count={`${(typeof environmentalImpact.co2Reduction === 'number' ? environmentalImpact.co2Reduction.toFixed(1) : '0')} kg`}
                  icon={Leaf}
                  description="Mengurangi gas rumah kaca di atmosfer"
                  color="primary"
                />
                
                <StatusCard
                  label="Air Bersih Terselamatkan"
                  count={`${(typeof environmentalImpact.waterSaved === 'number' ? environmentalImpact.waterSaved.toLocaleString('id-ID') : '0')} L`}
                  icon={Droplets}
                  description="Air yang tidak terpakai dalam produksi baru"
                  color="secondary"
                />
                
                <StatusCard
                  label="Energi Terhemat"
                  count={`${(typeof environmentalImpact.energyConserved === 'number' ? environmentalImpact.energyConserved.toFixed(1) : '0')} kWh`}
                  icon={Zap}
                  description={`Setara ${Math.round((typeof environmentalImpact.energyConserved === 'number' ? environmentalImpact.energyConserved : 0) / 3.5)} jam penggunaan AC`}
                  color="accent"
                />
              </div>
              
              {/* Charts section with improved descriptions */}
              <ChartContainer 
                title="Distribusi Jenis Sampah" 
                icon={PieChartIcon}
                hint="Menampilkan komposisi sampah berdasarkan jenisnya"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={wasteDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {wasteDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value.toFixed(2)} kg`, 'Berat']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              
              <div className="grid gap-6 mt-6 lg:grid-cols-2">
                <ChartContainer 
                  title="Efisiensi Daur Ulang per Jenis" 
                  icon={BarChart2}
                  hint="Perbandingan sampah asli dengan hasil daur ulang"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={recyclingEfficiency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toFixed(2)} kg`, 'Berat']} />
                      <Legend />
                      <Bar name="Sampah Original" dataKey="original" fill="#8884d8" />
                      <Bar name="Sampah Didaur Ulang" dataKey="recycled" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer 
                  title="Tren Berat Sampah" 
                  icon={BarChart2}
                  hint="Perkembangan jumlah sampah yang dikelola setiap bulan"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={weightByMonth}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toFixed(2)} kg`, 'Berat']} />
                      <Line type="monotone" dataKey="weight" stroke="#82ca9d" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              
              <div className="p-6 mt-6 border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-emerald-800">Dampak Lingkungan Positif</h3>
                    <p className="mt-2 text-emerald-700">
                      Berdasarkan {(typeof summaryStats.recycledWeight === 'number' ? summaryStats.recycledWeight.toFixed(1) : '0')} kg sampah yang berhasil didaur ulang, 
                      industri Anda telah berkontribusi secara signifikan terhadap pelestarian lingkungan.
                    </p>
                    <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Pengurangan Landfill</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">
                          {(typeof environmentalImpact.landfillReduced === 'number' ? environmentalImpact.landfillReduced.toFixed(1) : '0')} kg
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">Sampah tidak berakhir di TPA</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Pohon Terselamatkan</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{environmentalImpact.treesPreserved || 0}</p>
                        <p className="mt-1 text-xs text-emerald-600">Estimasi berdasarkan kertas terdaur ulang</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Pengurangan Gas Rumah Kaca</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">
                          {(typeof environmentalImpact.co2Reduction === 'number' ? environmentalImpact.co2Reduction.toFixed(1) : '0')} kg
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">
                          Setara dengan {(typeof environmentalImpact.co2Reduction === 'number' ? (environmentalImpact.co2Reduction / 0.12).toFixed(0) : '0')} km berkendara
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'social' && (
            <>
              {/* Improved social impact section with better explanations */}
              <div className="grid gap-5 mb-6">
                <div className="p-6 border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
                  <h3 className="flex items-center gap-2 text-lg font-medium text-indigo-800">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Dampak Sosial dari Program Daur Ulang
                  </h3>
                  <p className="mt-2 text-indigo-700">
                    Program daur ulang tidak hanya bermanfaat bagi lingkungan, tetapi juga menciptakan dampak sosial positif melalui 
                    pemberdayaan masyarakat. Berikut adalah dampak sosial dari aktivitas daur ulang industri Anda.
                  </p>
                </div>
              
                <div className="grid grid-cols-1 gap-5 mb-6 md:grid-cols-2">
                  <SocialImpactCard
                    title="Penciptaan Lapangan Kerja"
                    count={socialImpact.jobsCreated}
                    description={`${socialImpact.jobsCreated} pekerja aktif terlibat dalam pengumpulan dan pemrosesan sampah, menciptakan peluang ekonomi dan mengurangi pengangguran di komunitas sekitar.`}
                    icon={UserCheck}
                    color="bg-blue-50"
                  />
                  
                  <SocialImpactCard
                    title="Jaringan Bank Sampah"
                    count={socialImpact.wasteBankMasters}
                    description={`${socialImpact.wasteBankMasters} bank sampah terhubung dengan program Anda, membantu masyarakat dalam mengelola sampah dan meningkatkan kesadaran lingkungan di berbagai komunitas.`}
                    icon={Building}
                    color="bg-amber-50"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-5 mb-6 md:grid-cols-2">
                  <SocialImpactCard
                    title="Total Partisipan Aktif"
                    count={socialImpact.totalParticipants}
                    description={`${socialImpact.totalParticipants} individu secara aktif berpartisipasi dalam proses pengumpulan, pemilahan, dan pendistribusian sampah daur ulang.`}
                    icon={Users}
                    color="bg-emerald-50"
                  />
                  
                  <SocialImpactCard
                    title="Petugas Pengumpul Sampah"
                    count={socialImpact.collectors + socialImpact.wasteBankCollectors}
                    description={`${socialImpact.collectors + socialImpact.wasteBankCollectors} petugas pengumpul aktif bekerja di lapangan untuk mengumpulkan sampah dari berbagai sumber dan memastikan sampah diproses dengan benar.`}
                    icon={Recycle}
                    color="bg-indigo-50"
                  />
                </div>
              </div>
              
              <ChartContainer 
                title="Distribusi Peran dalam Daur Ulang" 
                icon={UserCheck}
                hint="Perbandingan jumlah partisipan berdasarkan peran"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pengelola Bank Sampah', value: socialImpact.wasteBankMasters },
                        { name: 'Pengumpul Bank Sampah', value: socialImpact.wasteBankCollectors },
                        { name: 'Pengumpul Independen', value: socialImpact.collectors },
                        { name: 'Admin Bank Sampah', value: socialImpact.wasteBankAdmins }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                    >
                      {[0, 1, 2, 3].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Jumlah']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              
              {/* Enhanced social impact explanation */}
              <div className="p-6 mt-6 border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Pemberdayaan Komunitas
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      Program daur ulang Anda telah memberdayakan komunitas melalui pendidikan dan pelatihan pengelolaan sampah.
                      Sebanyak {socialImpact.wasteBankMasters} bank sampah aktif menjadi pusat edukasi lingkungan bagi warga sekitar.
                    </p>
                    <div className="p-3 mt-3 rounded-lg bg-indigo-50">
                      <p className="text-xs text-indigo-700">
                        <strong>Dampak:</strong> Peningkatan kesadaran lingkungan dan praktik pengelolaan sampah berkelanjutan di komunitas
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                      <Wallet className="w-4 h-4 text-indigo-600" />
                      Peningkatan Ekonomi Lokal
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      Dengan {socialImpact.jobsCreated} lapangan kerja yang tercipta, program ini memberikan dampak ekonomi langsung.
                      Para pekerja mendapatkan penghasilan dari aktivitas pengumpulan, pemilahan, dan pemrosesan sampah.
                    </p>
                    <div className="p-3 mt-3 rounded-lg bg-indigo-50">
                      <p className="text-xs text-indigo-700">
                        <strong>Dampak:</strong> Peningkatan pendapatan keluarga dan penurunan tingkat pengangguran di komunitas sekitar
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'governance' && (
            <>
              <div className="grid grid-cols-1 gap-5 mb-6 md:grid-cols-2 lg:grid-cols-3">
                <StatusCard
                  label="Status Kepatuhan"
                  count={governanceCompliance.regulatoryCompliance}
                  icon={Shield}
                  description="Terhadap regulasi lingkungan"
                  color={governanceCompliance.regulatoryCompliance === 'Compliant' ? 'primary' : 'warning'}
                />
                
                <StatusCard
                  label="Skor Keberlanjutan"
                  count={`${governanceCompliance.sustainabilityScore}/100`}
                  icon={FileCheck}
                  description="Berdasarkan kinerja aktual"
                  color={governanceCompliance.sustainabilityScore >= 80 ? 'primary' : 'secondary'}
                />
                
                <StatusCard
                  label="Permintaan Tertunda"
                  count={governanceCompliance.pendingIssues}
                  icon={AlertTriangle}
                  description="Perlu perhatian segera"
                  color={governanceCompliance.pendingIssues === 0 ? 'primary' : 'warning'}
                />
              </div>
              
              <ChartContainer title="Kepatuhan Regulasi" icon={Shield}>
                <div className="p-6">
                  <div className="w-full h-4 mb-6 bg-gray-200 rounded-full">
                    <div
                      className="h-4 rounded-full bg-emerald-500"
                      style={{ width: `${governanceCompliance.sustainabilityScore}%` }}
                    ></div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="mb-2 text-sm font-medium text-gray-700">Aspek Kepatuhan</h3>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="p-1 rounded-full bg-emerald-100">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-gray-600">Pengelolaan Limbah Terdaftar</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="p-1 rounded-full bg-emerald-100">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-gray-600">Pelaporan Daur Ulang</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`p-1 rounded-full ${summaryStats.recyclingEfficiencyRate >= 60 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {summaryStats.recyclingEfficiencyRate >= 60 ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <span className="text-sm text-gray-600">Target Efisiensi Daur Ulang (Min. 60%)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="mb-2 text-sm font-medium text-gray-700">Detail Pelaporan</h3>
                      <p className="mb-4 text-sm text-gray-600">
                        Frekuensi: {governanceCompliance.reportingFrequency}
                      </p>
                      <p className="mb-4 text-sm text-gray-600">
                        Pembaruan Terakhir: {governanceCompliance.lastAuditDate?.toLocaleDateString('id-ID') || 'Belum ada'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Permintaan Tertunda: {governanceCompliance.pendingIssues} permintaan
                      </p>
                    </div>
                  </div>
                </div>
              </ChartContainer>
              
              <div className="p-6 mt-6 border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-800">Kepatuhan & Tata Kelola</h3>
                    <p className="mt-2 text-blue-700">
                      {(typeof summaryStats.recycledWeight === 'number' && summaryStats.recycledWeight > 0) ? (
                        `Operasi daur ulang industri Anda telah memproses ${summaryStats.recycledWeight.toFixed(1)} kg sampah dengan 
                        efisiensi ${summaryStats.recyclingEfficiencyRate}%, menghasilkan skor keberlanjutan ${governanceCompliance.sustainabilityScore}/100.`
                      ) : (
                        "Belum ada data daur ulang yang tercatat. Mulailah melakukan pendauran ulang untuk meningkatkan skor keberlanjutan Anda."
                      )}
                    </p>
                    <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <h4 className="text-sm font-medium text-blue-700">Peraturan Yang Relevan</h4>
                        <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          <li>• PP No. 22/2021 tentang Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup</li>
                          <li>• UU No. 18/2008 tentang Pengelolaan Sampah</li>
                          <li>• Peraturan Daerah tentang Pengelolaan Sampah</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <h4 className="text-sm font-medium text-blue-700">Rekomendasi Peningkatan</h4>
                        <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          {governanceCompliance.regulatoryCompliance !== 'Compliant' && (
                            <li>• Tingkatkan efisiensi daur ulang ke minimal 60%</li>
                          )}
                          {governanceCompliance.pendingIssues > 0 && (
                            <li>• Selesaikan {governanceCompliance.pendingIssues} permintaan tertunda</li>
                          )}
                          <li>• Lakukan audit rutin terhadap proses daur ulang</li>
                          {summaryStats.recycledWeight === 0 && (
                            <li>• Mulai melakukan aktivitas daur ulang sampah</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Improved action buttons with clearer purposes */}

// Gantikan action buttons di bagian bawah halaman
// Temukan bagian ini dalam komponen:
<div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2 lg:grid-cols-4">
  <ActionButton 
    icon={Download} 
    label="Unduh Laporan PDF" 
    variant="primary" 
    onClick={() => {/*...*/}} 
  />
  <ActionButton 
    icon={Calendar} 
    label="Jadwalkan Audit ESG" 
    variant="default" 
    onClick={() => {/*...*/}} 
  />
  <ActionButton 
    icon={GlobeIcon} 
    label="Bagikan ke Media Sosial" 
    variant="secondary" 
    onClick={() => {/*...*/}} 
  />
  
  {/* Ganti tombol "Laporan ESG Lengkap" dengan AiReportButton */}
  <AiReportButton 
    reportData={{
      chartDescriptions: [
        {
          title: "Distribusi Jenis Sampah",
          description: `Diagram menunjukkan komposisi sampah berdasarkan jenisnya`
        },
        {
          title: "Tren Berat Sampah",
          description: `Grafik perkembangan jumlah sampah yang dikelola setiap bulan`
        }
      ],
      displayedMetrics: [
        {
          name: "Reduksi Emisi CO2",
          value: `${(typeof environmentalImpact.co2Reduction === 'number' ? environmentalImpact.co2Reduction.toFixed(1) : '0')} kg`,
          description: "Mengurangi gas rumah kaca di atmosfer"
        },
        {
          name: "Air Bersih Terselamatkan",
          value: `${(typeof environmentalImpact.waterSaved === 'number' ? environmentalImpact.waterSaved.toLocaleString('id-ID') : '0')} L`,
          description: "Air yang tidak terpakai dalam produksi baru"
        },
        {
          name: "Energi Terhemat",
          value: `${(typeof environmentalImpact.energyConserved === 'number' ? environmentalImpact.energyConserved.toFixed(1) : '0')} kWh`,
          description: "Energi yang dihemat melalui daur ulang"
        },
        {
          name: "Total Sampah Dikelola",
          value: `${summaryStats.totalWeight.toFixed(2)} kg`,
          description: "Jumlah sampah yang telah diproses"
        }
      ],
      wasteDistribution: wasteDistribution.map(type => ({
        name: type.name,
        weight: type.value,
        impact: type.value * 0.5 // estimasi dampak karbon
      })),
      mapData: {
        wasteBankLocations: socialImpact.wasteBankMasters || 0,
        industryLocations: 1,
        totalLocations: (socialImpact.totalParticipants || 0) + 1
      },
      performanceTrends: {
        timePeriod: timeframe,
        recyclingEfficiency: `${summaryStats.recyclingEfficiencyRate}%`,
        sustainabilityScore: governanceCompliance.sustainabilityScore
      }
    }}
    role="industry"
  />
</div>

          {/* More informative footer */}
          <div className="p-4 mt-8 text-sm text-center text-gray-500 border-t border-gray-200">
            <p>Data ESG terakhir diperbarui: {new Date().toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}</p>
            <p className="mt-1">Laporan ESG ini sesuai dengan standar Global Reporting Initiative (GRI) - WasteTrack v1.0</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EsgReport;