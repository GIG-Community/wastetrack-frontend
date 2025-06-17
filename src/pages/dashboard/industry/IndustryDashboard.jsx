import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
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
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Recycle, 
  Scale, 
  Droplets, 
  Zap, 
  BarChart2, 
  PieChart as PieChartIcon,
  Calendar, 
  Download, 
  Edit, 
  Plus,
  Info,
  Archive,
  Filter,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Leaf,
  Wallet
} from 'lucide-react';

// Enhanced color palette with more vibrant and complementary colors
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  recycled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  assigned: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200'
};

// Improved InfoPanel with better animations and styling
const InfoPanel = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="p-5 mb-6 transition-all duration-300 border border-blue-100 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div 
            className="flex items-center justify-between cursor-pointer group" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <h3 className="text-sm font-medium text-blue-800 group-hover:text-blue-600">
              {title}
            </h3>
            <div className={`p-1 rounded-full transition-all duration-300 group-hover:bg-blue-100 ${isExpanded ? 'bg-blue-100' : ''}`}>
              <svg 
                className={`w-4 h-4 text-blue-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className={`mt-2 text-sm text-blue-700 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced StatusCard with improved animations and hover effects
const StatusCard = ({ label, count, icon: Icon, description, className = "", trend, color = "default" }) => {
  const colors = {
    default: "group-hover:text-gray-700 group-hover:bg-gray-50",
    primary: "group-hover:text-emerald-700 group-hover:bg-emerald-50",
    secondary: "group-hover:text-blue-700 group-hover:bg-blue-50",
    accent: "group-hover:text-indigo-700 group-hover:bg-indigo-50",
    warning: "group-hover:text-amber-700 group-hover:bg-amber-50"
  };
  
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 group ${className}`}>
      <div className="flex items-start justify-between">
        <div className="w-full">
          <div className={`p-3 bg-gray-50 rounded-lg w-fit transition-colors duration-300 ${colors[color]}`}>
            <Icon className={`w-5 h-5 text-gray-600 transition-colors duration-300 ${color === 'primary' ? 'group-hover:text-emerald-600' : 
              color === 'secondary' ? 'group-hover:text-blue-600' : 
              color === 'accent' ? 'group-hover:text-indigo-600' : 
              color === 'warning' ? 'group-hover:text-amber-600' : 
              'group-hover:text-gray-800'}`} />
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            {trend && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                trend.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {trend.value}% {trend.positive ? 
                  <TrendingUp className="w-3 h-3 ml-0.5" /> : 
                  <TrendingDown className="w-3 h-3 ml-0.5" />}
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-800 transition-colors duration-300 group-hover:text-black">{typeof count === 'number' ? count.toLocaleString('id-ID') : count}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Improved ActionButton with better visual feedback
const ActionButton = ({ icon: Icon, label, onClick, variant = "default" }) => {
  const variants = {
    default: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    primary: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    secondary: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    danger: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium 
        transition-all duration-300 hover:shadow-md border ${variants[variant]}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
};

// Enhanced ChartContainer with better responsiveness and visual aesthetics
const ChartContainer = ({ title, children, icon: Icon, className = "", action }) => (
  <div className={`p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 ${className}`}>
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-gray-50">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      {action && (
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-600 hover:bg-blue-50 transition-all duration-300">
          {action.label}
          {action.icon}
        </button>
      )}
    </div>
    {children}
  </div>
);

const IndustryDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [collections, setCollections] = useState([]);
  const [timeframe, setTimeframe] = useState('month'); // 'week', 'month', 'year'
  const [summaryStats, setSummaryStats] = useState({
    totalValue: 0,
    totalWeight: 0,
    recyclableWeight: 0,
    recycledWeight: 0,
    pendingRequests: 0,
    completedRequests: 0,
    recyclingEfficiencyRate: 0
  });
  const [userBalance, setUserBalance] = useState(0);
  const [wasteDistribution, setWasteDistribution] = useState([]);
  const [recyclingEfficiency, setRecyclingEfficiency] = useState([]);
  const [valueByMonth, setValueByMonth] = useState([]);
  const [weightByMonth, setWeightByMonth] = useState([]);
  const [recycledCategories, setRecycledCategories] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'details', 'environmental'

  const { userData, currentUser } = useAuth();
  const db = getFirestore();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        // Set up real-time listener for user balance
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            setUserBalance(userData.balance || 0);
          }
        }, (error) => {
          console.error('Error listening to user document:', error);
        });
        
        // Fetch industry requests
        const requestsQuery = query(
          collection(db, 'industryRequests'), 
          where('industryId', '==', currentUser.uid)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(requestsData);
        
        // Fetch industry collections
        const collectionsQuery = query(
          collection(db, 'industryCollections'), 
          where('industryId', '==', currentUser.uid)
        );
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const collectionsData = collectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCollections(collectionsData);
        
        // Process data for summary statistics and charts
        processData(requestsData, collectionsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = fetchData();
    
    // Clean up listeners when component unmounts
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser?.uid, db]);
  
  useEffect(() => {
    // Re-process data when timeframe changes
    if (requests.length > 0 || collections.length > 0) {
      processData(requests, collections);
    }
  }, [timeframe, requests, collections]);
  
  const processData = (requestsData, collectionsData) => {
    // Filter data based on selected timeframe
    const now = new Date();
    let startDate = new Date();
    
    switch(timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const filteredRequests = requestsData.filter(req => {
      const reqDate = req.date?.toDate?.() || new Date(req.date);
      return reqDate >= startDate;
    });
    
    const filteredCollections = collectionsData.filter(col => {
      const colDate = col.createdAt?.toDate?.() || new Date(col.createdAt);
      return colDate >= startDate;
    });

    // Calculate input waste by type with better accuracy
    const inputWasteByType = {};
    filteredRequests.forEach(req => {
      if (!req.wasteWeights) return;
      Object.entries(req.wasteWeights).forEach(([type, weight]) => {
        if (!inputWasteByType[type]) {
          inputWasteByType[type] = {
            totalWeight: 0,
            totalValue: 0,
            count: 0
          };
        }
        inputWasteByType[type].totalWeight += weight;
        inputWasteByType[type].totalValue += req.wastes?.[type]?.value || 0;
        inputWasteByType[type].count++;
      });
    });

    // Process recycled categories
    const recycledByCategory = {};
    filteredCollections.forEach(col => {
      if (!col.recycledWeights) return;
      Object.entries(col.recycledWeights).forEach(([type, data]) => {
        const categoryId = data.categoryId || 'uncategorized';
        if (!recycledByCategory[categoryId]) {
          recycledByCategory[categoryId] = {
            weight: 0,
            count: 0,
            originalTypes: new Set()
          };
        }
        recycledByCategory[categoryId].weight += data.weight || 0;
        recycledByCategory[categoryId].count++;
        recycledByCategory[categoryId].originalTypes.add(type);
      });
    });

    // Transform for pie chart
    const recycledCategoriesData = Object.entries(recycledByCategory).map(([category, data]) => ({
      name: category,
      weight: data.weight,
      count: data.count,
      percentage: 0, // Will be calculated below
      originalTypes: Array.from(data.originalTypes)
    }));

    const totalRecycledWeight = recycledCategoriesData.reduce((sum, cat) => sum + cat.weight, 0);
    recycledCategoriesData.forEach(cat => {
      cat.percentage = totalRecycledWeight > 0 ? (cat.weight / totalRecycledWeight) * 100 : 0;
    });

    setRecycledCategories(recycledCategoriesData);

    // Update waste distribution with total input weights
    const wasteDistributionData = Object.entries(inputWasteByType).map(([type, data]) => ({
      name: type,
      weight: data.totalWeight,
      value: data.totalValue,
      count: data.count,
      percentage: (data.totalWeight / Object.values(inputWasteByType)
        .reduce((sum, d) => sum + d.totalWeight, 0)) * 100
    }));

    setWasteDistribution(wasteDistributionData);

    // Calculate accurate waste statistics
    const totalWasteStats = filteredRequests.reduce((acc, req) => {
      if (!req.wastes || !req.wasteWeights) return acc;
      
      Object.entries(req.wasteWeights).forEach(([type, weight]) => {
        if (!acc.wasteTypes[type]) {
          acc.wasteTypes[type] = {
            totalWeight: 0,
            processedWeight: 0,
            value: 0,
            count: 0
          };
        }
        acc.wasteTypes[type].totalWeight += weight;
        acc.wasteTypes[type].value += req.wastes[type]?.value || 0;
        acc.wasteTypes[type].count += req.wasteQuantities?.[type] || 0;
        acc.totalWeight += weight;
        acc.totalValue += req.wastes[type]?.value || 0;
      });
      return acc;
    }, { totalWeight: 0, totalValue: 0, wasteTypes: {} });

    // Calculate processed/recycled waste accurately
    const processedWasteStats = filteredCollections.reduce((acc, col) => {
      if (!col.originalWastes || !col.recycledWeights) return acc;

      Object.entries(col.originalWastes).forEach(([type, data]) => {
        if (!acc.wasteTypes[type]) {
          acc.wasteTypes[type] = {
            inputWeight: 0,
            outputWeight: 0,
            count: 0
          };
        }
        
        const recycledData = col.recycledWeights[type] || { weight: 0 };
        acc.wasteTypes[type].inputWeight += data.weight || 0;
        acc.wasteTypes[type].outputWeight += recycledData.weight || 0;
        acc.wasteTypes[type].count++;
        
        acc.totalInputWeight += data.weight || 0;
        acc.totalOutputWeight += recycledData.weight || 0;
      });
      return acc;
    }, { totalInputWeight: 0, totalOutputWeight: 0, wasteTypes: {} });

    // Combine waste statistics for comprehensive analysis
    const wasteDistribution = Object.entries(totalWasteStats.wasteTypes).map(([type, data]) => {
      const processedData = processedWasteStats.wasteTypes[type] || {
        inputWeight: 0,
        outputWeight: 0,
        count: 0
      };

      return {
        name: type,
        weight: data.totalWeight,
        value: data.value,
        count: data.count,
        averageValue: data.count ? data.value / data.count : 0,
        processedWeight: processedData.inputWeight,
        recycledWeight: processedData.outputWeight,
        efficiency: processedData.inputWeight > 0 
          ? (processedData.outputWeight / processedData.inputWeight) * 100 
          : 0
      };
    });

    // Update summary stats with more accurate calculations
    setSummaryStats({
      totalValue: totalWasteStats.totalValue,
      totalWeight: totalWasteStats.totalWeight,
      recyclableWeight: processedWasteStats.totalInputWeight,
      recycledWeight: processedWasteStats.totalOutputWeight,
      pendingRequests: filteredRequests.filter(req => 
        ['pending', 'assigned', 'in_progress'].includes(req.status)).length,
      completedRequests: filteredRequests.filter(req => 
        req.status === 'completed').length,
      recyclingEfficiencyRate: processedWasteStats.totalInputWeight > 0 
        ? Math.round((processedWasteStats.totalOutputWeight / processedWasteStats.totalInputWeight) * 100) 
        : 0
    });

    setWasteDistribution(wasteDistribution);

    // Update recycling efficiency with more detailed data
    const recyclingEfficiencyData = Object.entries(processedWasteStats.wasteTypes)
      .map(([type, data]) => ({
        name: type,
        original: data.inputWeight,
        recycled: data.outputWeight,
        collections: data.count,
        efficiency: data.inputWeight > 0 
          ? Math.round((data.outputWeight / data.inputWeight) * 100)
          : 0,
        lossWeight: data.inputWeight - data.outputWeight,
        lossPercentage: data.inputWeight > 0
          ? Math.round(((data.inputWeight - data.outputWeight) / data.inputWeight) * 100)
          : 0
      }));

    setRecyclingEfficiency(recyclingEfficiencyData);

    // Process monthly trends with proper date handling
    const { valueData, weightData } = processMonthlyTrends(filteredRequests);
    setValueByMonth(valueData);
    setWeightByMonth(weightData);
  };

  const processMonthlyTrends = (requests) => {
    const monthlyData = requests.reduce((acc, req) => {
      const date = req.date?.toDate?.() || new Date(req.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          value: 0,
          weight: 0,
          requests: 0
        };
      }

      acc[monthKey].value += Object.values(req.wastes || {}).reduce((sum, waste) => 
        sum + (waste.value || 0), 0);
      acc[monthKey].weight += Object.values(req.wasteWeights || {}).reduce((sum, weight) => 
        sum + weight, 0);
      acc[monthKey].requests++;

      return acc;
    }, {});

    const sortedMonths = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b));

    return {
      valueData: sortedMonths.map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        value: data.value,
        requests: data.requests
      })),
      weightData: sortedMonths.map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        weight: data.weight,
        requests: data.requests
      }))
    };
  };

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('id-ID', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    });
  };
  
  // Enhanced loading state with animation
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          role={userData?.role}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="max-w-md p-8 text-center bg-white border border-gray-100 shadow-lg rounded-xl">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 rounded-full border-t-emerald-500 border-emerald-200 animate-spin"></div>
                <Recycle className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 text-emerald-600" />
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-800">Memuat Dashboard</h3>
              <p className="mt-2 text-gray-500">Sedang mengambil data terbaru</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-6">
                <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex flex-col justify-between gap-4 mb-8 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 shadow bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Recycle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Industri Daur Ulang</h1>
                <p className="mt-1 text-gray-500">
                  Analisis dan manajemen data daur ulang limbah industri
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
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
                    Mingguan
                  </button>
                  <button 
                    onClick={() => setTimeframe('month')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                      timeframe === 'month' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button 
                    onClick={() => setTimeframe('year')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                      timeframe === 'year' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Tahunan
                  </button>
                </div>
              </div>
              
              <button className="p-2 text-gray-600 transition-all duration-300 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="p-1 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex flex-wrap">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'overview' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Ikhtisar</span>
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'details' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Detail Permintaan</span>
              </button>
              <button
                onClick={() => setActiveTab('environmental')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'environmental' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Leaf className="w-4 h-4" />
                <span>Dampak Lingkungan</span>
              </button>
            </div>
          </div>

          <InfoPanel title="Statistik dan Analitik Daur Ulang">
            <p className="leading-relaxed">
              Dashboard ini menampilkan analisis komprehensif dari aktivitas daur ulang industri Anda, termasuk tren pengumpulan sampah, 
              efisiensi daur ulang, dan distribusi jenis sampah. Gunakan data ini untuk memahami performa dan mengidentifikasi area peningkatan.
            </p>
            <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
              <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <h4 className="mb-1 text-xs font-medium text-gray-500 uppercase">Periode Saat Ini</h4>
                <p className="text-sm font-medium text-gray-800">{timeframe === 'week' ? '7 hari terakhir' : timeframe === 'month' ? '30 hari terakhir' : '12 bulan terakhir'}</p>
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <h4 className="mb-1 text-xs font-medium text-gray-500 uppercase">Total Permintaan</h4>
                <p className="text-sm font-medium text-gray-800">{summaryStats.completedRequests + summaryStats.pendingRequests} permintaan</p>
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <h4 className="mb-1 text-xs font-medium text-gray-500 uppercase">Terakhir Diperbarui</h4>
                <p className="text-sm font-medium text-gray-800">{new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
            </div>
          </InfoPanel>
          
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-2 lg:grid-cols-4">
                <StatusCard
                  label="Saldo"
                  count={`Rp ${userBalance.toLocaleString('id-ID')}`}
                  icon={Wallet}
                  description="Saldo tersedia untuk transaksi"
                  className="border-purple-200"
                  color="accent"
                />
                
                <StatusCard
                  label="Total Sampah"
                  count={`${summaryStats.totalWeight.toFixed(1)} kg`}
                  icon={Scale}
                  description={`${summaryStats.recyclableWeight.toFixed(1)} kg telah diproses`}
                  trend={summaryStats.totalWeight > 0 ? {
                    positive: summaryStats.recyclingEfficiencyRate >= 75,
                    value: Math.round((summaryStats.recyclableWeight / summaryStats.totalWeight) * 100)
                  } : null}
                  color="warning"
                />
                
                <StatusCard
                  label="Material Didaur Ulang"
                  count={`${summaryStats.recycledWeight.toFixed(1)} kg`}
                  icon={Recycle}
                  description="Sampah berhasil didaur ulang"
                  trend={{ positive: true, value: 8 }}
                  className="border-emerald-200"
                  color="primary"
                />
                
                <StatusCard
                  label="Efisiensi Daur Ulang"
                  count={`${summaryStats.recyclingEfficiencyRate}%`}
                  icon={TrendingUp}
                  description="Didaur ulang / Total sampah"
                  className="border-blue-200"
                  color="secondary"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid gap-5 mb-8">
                {/* Waste Distribution Grid - Two Columns */}
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Input Waste Distribution */}
                  <ChartContainer 
                    title="Distribusi Sampah Masuk" 
                    icon={PieChartIcon}
                    className="h-full"
                  >
                    <div className="flex flex-col lg:flex-row lg:gap-4">
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={wasteDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="weight"
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {wasteDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value.toFixed(1)} kg`, 'Berat']}
                              contentStyle={{ 
                                borderRadius: '0.5rem', 
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full mt-4 lg:w-64 lg:mt-0">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Detail Kategori</h4>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                          {wasteDistribution.map((item, index) => (
                            <div key={index} className="flex items-center p-2 transition-colors duration-200 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100">
                              <div 
                                className="w-3 h-3 mr-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                                <div className="flex justify-between mt-1">
                                  <span className="text-xs text-gray-500">{item.weight.toFixed(1)} kg</span>
                                  <span className="text-xs font-medium text-gray-600">
                                    {((item.weight / summaryStats.totalWeight) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {wasteDistribution.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>Tidak ada data kategori sampah</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </ChartContainer>

                  {/* Output Waste Categories */}
                  <ChartContainer 
                    title="Hasil Daur Ulang" 
                    icon={Recycle}
                    className="h-full"
                  >
                    <div className="flex flex-col lg:flex-row lg:gap-4">
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={recycledCategories}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="weight"
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {recycledCategories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [
                                `${value.toFixed(1)} kg`,
                                name === 'uncategorized' ? 'Belum Dikategorikan' : name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full mt-4 lg:w-64 lg:mt-0">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Detail Hasil</h4>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                          {recycledCategories.map((item, index) => (
                            <div key={index} className="p-3 bg-white border border-gray-100 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <p className="text-sm font-medium text-gray-700">
                                  {item.name === 'uncategorized' ? 'Belum Dikategorikan' : item.name}
                                </p>
                              </div>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500">
                                  Berat: {item.weight.toFixed(1)} kg
                                  <span className="ml-2 text-gray-400">
                                    ({item.percentage.toFixed(1)}%)
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  Dari: {item.originalTypes.join(', ')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ChartContainer>
                </div>

                {/* Processing Analysis Grid - Two Columns */}
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Waste Weight Trends */}
                  <ChartContainer 
                    title="Tren Berat Sampah" 
                    icon={Scale}
                  >
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={weightByMonth}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="month"
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis 
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }}
                            tickFormatter={(value) => `${value} kg`}
                          />
                          <Tooltip 
                            formatter={(value) => [`${value} kg`, 'Berat']}
                            contentStyle={{ 
                              borderRadius: '0.5rem', 
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                          />
                          <Bar dataKey="weight" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartContainer>

                  {/* Recycling Efficiency */}
                  <ChartContainer 
                    title="Efisiensi Daur Ulang" 
                    icon={Recycle}
                  >
                    <div className="flex flex-col lg:flex-row lg:gap-4">
                      <div className="flex-1 min-w-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={recyclingEfficiency}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="name"
                              tick={{ fill: '#6b7280' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis 
                              tick={{ fill: '#6b7280' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={{ stroke: '#e5e7eb' }}
                              tickFormatter={(value) => `${value} kg`}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} kg`, 'Berat']}
                              contentStyle={{ 
                                borderRadius: '0.5rem', 
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                              }}
                            />
                            <Legend />
                            <Bar dataKey="original" name="Sampah Asli" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="recycled" name="Didaur Ulang" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:w-64 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Efisiensi per Kategori</h4>
                        <div className="space-y-3">
                          {recyclingEfficiency.map((item, index) => (
                            <div key={index} className="p-3 transition-colors duration-200 bg-white border border-gray-100 rounded-lg hover:shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">{item.name}</p>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  item.efficiency >= 75 ? 'bg-emerald-100 text-emerald-700' : 
                                  item.efficiency >= 50 ? 'bg-amber-100 text-amber-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {item.efficiency}%
                                </span>
                              </div>
                              <div className="w-full h-2 mb-2 overflow-hidden bg-gray-200 rounded-full">
                                <div 
                                  className={`h-full ${
                                    item.efficiency >= 75 ? 'bg-emerald-500' : 
                                    item.efficiency >= 50 ? 'bg-amber-500' : 
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${item.efficiency}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Input: {item.original.toFixed(1)} kg</span>
                                <span>Output: {item.recycled.toFixed(1)} kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {recyclingEfficiency.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>Tidak ada data efisiensi daur ulang</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </ChartContainer>
                </div>

                {/* Quick Actions - Bottom */}
                {/* <div className="grid gap-4 p-6 bg-white shadow-sm rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-800">Aksi Cepat</h3>
                  <div className="flex flex-wrap gap-3">
                    <ActionButton 
                      icon={Plus} 
                      label="Permintaan Baru" 
                      variant="primary" 
                      onClick={() => {}} 
                    />
                    <ActionButton 
                      icon={Download} 
                      label="Ekspor Data" 
                      variant="secondary" 
                      onClick={() => {}} 
                    />
                    <ActionButton 
                      icon={Calendar} 
                      label="Jadwal Pengumpulan" 
                      variant="purple" 
                      onClick={() => {}} 
                    />
                    <ActionButton 
                      icon={Filter} 
                      label="Filter Data" 
                      variant="default" 
                      onClick={() => {}} 
                    />
                  </div>
                </div> */}
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl">
                <h2 className="mb-6 text-lg font-semibold text-gray-800">Permintaan Pengumpulan Terbaru</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ID</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Jenis Sampah</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Berat (kg)</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requests.slice(0, 5).map((request) => {
                        const totalWeight = request.wasteWeights ? 
                          Object.values(request.wasteWeights).reduce((sum, weight) => sum + weight, 0) : 0;
                        
                        const wasteTypes = request.wasteWeights ? 
                          Object.keys(request.wasteWeights).join(', ') : '-';
                        
                        return (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{request.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(request.date)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{wasteTypes}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{totalWeight.toFixed(1)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full 
                                ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                              Rp {request.totalValue ? request.totalValue.toLocaleString('id-ID') : 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {requests.length === 0 && (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada permintaan</h3>
                      <p className="mt-1 text-gray-500">Belum ada permintaan pengumpulan sampah yang terdaftar.</p>
                    </div>
                  )}
                </div>
                
                {requests.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 transition-colors duration-300 border border-blue-200 rounded-lg hover:bg-blue-50">
                      Lihat Semua Permintaan
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl">
                <h2 className="mb-6 text-lg font-semibold text-gray-800">Aktivitas Pengumpulan Terbaru</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ID</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Input (kg)</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Output (kg)</th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Efisiensi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {collections.slice(0, 5).map((collection) => {
                        const inputWeight = collection.totalInputWeight || 0;
                        
                        const outputWeight = collection.recycledWeights ?
                          Object.values(collection.recycledWeights).reduce(
                            (sum, item) => sum + (item.weight || 0), 0
                          ) : 0;
                        
                        const efficiency = inputWeight > 0 
                          ? Math.round((outputWeight / inputWeight) * 100)
                          : 0;
                        
                        return (
                          <tr key={collection.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{collection.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(collection.createdAt)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{inputWeight.toFixed(1)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{outputWeight.toFixed(1)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 h-2 mr-2 overflow-hidden bg-gray-200 rounded-full">
                                  <div 
                                    className={`h-full rounded-full ${
                                      efficiency >= 75 ? 'bg-emerald-500' : 
                                      efficiency >= 50 ? 'bg-amber-500' : 
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${efficiency}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-700">{efficiency}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {collections.length === 0 && (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada pengumpulan</h3>
                      <p className="mt-1 text-gray-500">Belum ada data pengumpulan yang terdaftar.</p>
                    </div>
                  )}
                </div>
                
                {collections.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 transition-colors duration-300 border border-blue-200 rounded-lg hover:bg-blue-50">
                      Lihat Semua Pengumpulan
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'environmental' && (
            <>
              <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-2 lg:grid-cols-3">
                <StatusCard
                  label="Total CO2 Terhindarkan"
                  count={`${(summaryStats.recycledWeight * 2.5).toFixed(1)} kg`}
                  icon={Leaf}
                  description="Berdasarkan sampah terdaur ulang"
                  color="primary"
                />
                
                <StatusCard
                  label="Pohon Terselamatkan"
                  count={Math.round(summaryStats.recycledWeight / 20)}
                  icon={Droplets}
                  description="Estimasi berdasarkan kertas terdaur ulang"
                  color="secondary"
                />
                
                <StatusCard
                  label="Energi Terhemat"
                  count={`${(summaryStats.recycledWeight * 10).toFixed(1)} kWh`}
                  icon={Zap}
                  description="Dibandingkan produksi baru"
                  color="accent"
                />
              </div>

              <ChartContainer 
                title="Dampak Lingkungan Berdasarkan Jenis Sampah" 
                icon={Leaf}
                className="mb-8"
              >
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={recyclingEfficiency.map(item => ({
                        ...item,
                        co2Saved: item.recycled * 2.5,
                        energySaved: item.recycled * 10,
                        waterSaved: item.recycled * 5000
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" label={{ value: 'CO2 (kg)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Energi (kWh)', angle: 90, position: 'insideRight' }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'co2Saved') return [`${value.toFixed(1)} kg`, 'CO2 Terhindarkan'];
                          if (name === 'energySaved') return [`${value.toFixed(1)} kWh`, 'Energi Terhemat'];
                          if (name === 'waterSaved') return [`${value.toFixed(1)} L`, 'Air Terhemat'];
                          return [value, name];
                        }}
                        contentStyle={{ 
                          borderRadius: '0.5rem', 
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="co2Saved" name="CO2 Terhindarkan (kg)" fill="#10b981" />
                      <Bar yAxisId="right" dataKey="energySaved" name="Energi Terhemat (kWh)" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              <div className="p-6 mb-8 border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-emerald-800">Dampak Lingkungan Positif</h3>
                    <p className="mt-2 text-emerald-700">
                      Berdasarkan jumlah sampah yang berhasil didaur ulang, industri Anda telah berkontribusi secara signifikan 
                      terhadap pelestarian lingkungan. Angka-angka di atas menunjukkan estimasi dampak positif dari aktivitas 
                      daur ulang yang telah dilakukan.
                    </p>
                    <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Pengurangan Landfill</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{summaryStats.recycledWeight.toFixed(1)} kg</p>
                        <p className="mt-1 text-xs text-emerald-600">Sampah tidak berakhir di TPA</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Air Bersih Terhemat</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{(summaryStats.recycledWeight * 5000).toLocaleString('id-ID')} L</p>
                        <p className="mt-1 text-xs text-emerald-600">Dibanding produksi baru</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <h4 className="text-xs font-medium uppercase text-emerald-600">Bahan Baku Terhemat</h4>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{(summaryStats.recycledWeight * 1.2).toFixed(1)} kg</p>
                        <p className="mt-1 text-xs text-emerald-600">Sumber daya alam</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default IndustryDashboard;