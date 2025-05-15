import React, { useState, useEffect, Suspense } from 'react';
import { 
  Building2, 
  PackageOpen,
  AlertTriangle,
  Scale,
  ArrowUpCircle,
  Box,
  AlertCircle,
  AlertOctagon,
  Info,
  Recycle,
  BarChart4,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { collection, doc, query, where, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import WarehouseVisualization3D from '../../../components/WarehouseVisualization3D';

// Constants
const VOLUME_CONVERSION_FACTOR = 0.2;
const WASTE_HEIGHT_FACTOR = 0.5;
const WASTE_WAREHOUSE_TYPE = 'waste';
const RECYCLE_WAREHOUSE_TYPE = 'recycle';

// Reusable Components
const Card = ({ className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-zinc-200 ${className}`}
    {...props}
  />
);

const SectionHeader = ({ icon: Icon, title, subtitle, actions }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      {Icon && <div className="p-2 text-white rounded-lg bg-emerald-500">
        <Icon className="w-5 h-5" />
      </div>}
      <div>
        <h2 className="text-lg font-semibold text-zinc-800">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>
    </div>
    {actions}
  </div>
);

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-6 overflow-hidden bg-white border rounded-xl border-zinc-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-emerald-500" />}
          <h3 className="text-base font-medium text-zinc-800">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, unit, icon: Icon, trend, info, color = "emerald" }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-zinc-500">{title}</p>
        <div className="flex items-end gap-1 mt-1">
          <p className={`text-xl font-semibold text-${color}-600`}>{value}</p>
          {unit && <p className="mb-0.5 text-sm text-zinc-500">{unit}</p>}
        </div>
        {info && <p className="mt-1 text-xs text-zinc-400">{info}</p>}
      </div>
      {Icon && <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon className={`w-5 h-5 text-${color}-500`} />
      </div>}
    </div>
    {trend && (
      <div className="flex items-center mt-2 text-xs">
        <TrendingUp className={`w-3 h-3 mr-1 ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
        <span className={trend > 0 ? 'text-emerald-500' : 'text-rose-500'}>
          {trend > 0 ? '+' : ''}{trend}% dari bulan lalu
        </span>
      </div>
    )}
  </Card>
);

const ProgressBar = ({ current, total, percentage, colorClass = "bg-emerald-500" }) => (
  <div className="mt-2">
    <div className="flex justify-between mb-1 text-xs text-zinc-500">
      <span>{current} m³ digunakan</span>
      <span>{percentage}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
      <div 
        className={`h-full rounded-full transition-all ${
          percentage >= 90 ? 'bg-red-500' :
          percentage >= 75 ? 'bg-amber-500' : colorClass
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
    <span className="text-xs text-zinc-400">
      Kapasitas total: {total} m³
    </span>
  </div>
);

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg ${
      active 
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
        : 'text-zinc-600 hover:bg-zinc-100'
    }`}
  >
    {children}
  </button>
);

const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

const getStorageAlert = (percentage) => {
  if (percentage >= 100) {
    return {
      type: 'critical',
      color: 'red',
      icon: AlertOctagon,
      title: 'Kapasitas Overload!',
      message: 'Gudang telah melebihi kapasitas maksimal. Tindakan segera diperlukan:',
      suggestions: [
        'Segera lakukan proses daur ulang untuk material yang sudah terkumpul',
        'Prioritaskan material yang telah lama disimpan',
        'Pertimbangkan untuk menolak penerimaan sampah baru hingga kapasitas tersedia'
      ]
    };
  } else if (percentage >= 90) {
    return {
      type: 'urgent',
      color: 'rose',
      icon: AlertTriangle,
      title: 'Kapasitas Kritis!',
      message: 'Gudang hampir mencapai batas maksimal. Tindakan segera direkomendasikan:',
      suggestions: [
        'Jadwalkan proses daur ulang dalam 24 jam ke depan',
        'Evaluasi material yang telah lama disimpan untuk diprioritaskan',
        'Batasi penerimaan sampah baru',
        'Persiapkan metode pengolahan untuk material yang menumpuk'
      ]
    };
  } else if (percentage >= 75) {
    return {
      type: 'warning',
      color: 'amber',
      icon: AlertTriangle,
      title: 'Kapasitas Hampir Penuh',
      message: 'Gudang mendekati kapasitas maksimal. Pertimbangkan tindakan berikut:',
      suggestions: [
        'Rencanakan proses daur ulang dalam 3 hari ke depan',
        'Evaluasi jenis material yang dapat diproses segera',
        'Periksa jadwal pengambilan material yang akan datang'
      ]
    };
  } else if (percentage >= 60) {
    return {
      type: 'notice',
      color: 'blue',
      icon: Info,
      title: 'Kapasitas Moderat',
      message: 'Gudang mulai terisi. Beberapa saran untuk dipertimbangkan:',
      suggestions: [
        'Mulai merencanakan jadwal daur ulang',
        'Evaluasi pola pengumpulan material untuk optimasi ruang',
        'Periksa material yang sudah lama disimpan'
      ]
    };
  }
  return null;
};

// Period selector for time-based filtering
const PeriodSelector = ({ selectedPeriod, onChange }) => {
  const periods = [
    { value: 'last7days', label: '7 Hari Terakhir' },
    { value: 'last30days', label: '30 Hari Terakhir' },
    { value: 'thisMonth', label: 'Bulan Ini' },
    { value: 'lastMonth', label: 'Bulan Lalu' },
    { value: 'allTime', label: 'Semua Waktu' }
  ];
  
  return (
    <div className="flex items-center">
      <span className="mr-2 text-sm text-zinc-500">
        <Calendar className="inline w-4 h-4 mr-1" />
        Periode:
      </span>
      <select
        value={selectedPeriod}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-sm bg-white border rounded-lg border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {periods.map(period => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Main Component
const IndustryWarehouse = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('last30days');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Dimensions for both warehouses
  const [wasteDimensions, setWasteDimensions] = useState({
    length: 10,
    width: 10,
    height: 2
  });
  
  const [recycleDimensions, setRecycleDimensions] = useState({
    length: 8,
    width: 8,
    height: 2
  });
  
  const [isEditingWasteDimensions, setIsEditingWasteDimensions] = useState(false);
  const [isEditingRecycleDimensions, setIsEditingRecycleDimensions] = useState(false);
  
  // Warehouse stats for both warehouses
  const [wasteWarehouseStats, setWasteWarehouseStats] = useState({
    totalCapacity: 200,
    currentStorage: 0,
    wasteTypes: {},
    usagePercentage: 0,
    recentCollections: [],
    wasteDetails: {}
  });
  
  const [recycleWarehouseStats, setRecycleWarehouseStats] = useState({
    totalCapacity: 128,
    currentStorage: 0,
    recycledTypes: {},
    usagePercentage: 0,
    recentRecyclings: [],
    recycledDetails: {}
  });
  
  const [unsubscribes, setUnsubscribes] = useState([]);

  const [inputErrors, setInputErrors] = useState({
    wasteLength: '',
    wasteWidth: '',
    wasteHeight: '',
    recycleLength: '',
    recycleWidth: '',
    recycleHeight: ''
  });

  // Derived stats for dashboard
  const totalRawMaterials = Object.values(wasteWarehouseStats.wasteTypes).reduce((sum, weight) => sum + weight, 0);
  const totalRecycledProducts = Object.values(recycleWarehouseStats.recycledTypes).reduce((sum, weight) => sum + weight, 0);
  
  // Material types with counts for filters
  const materialTypes = Object.keys(wasteWarehouseStats.wasteTypes).map(type => ({
    id: type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    count: wasteWarehouseStats.wasteTypes[type]
  }));
  
  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [unsubscribes]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchWarehouseStats();
      fetchWarehouseDimensions();
    }
  }, [currentUser?.uid]);

  // Update stats when dimensions change
  useEffect(() => {
    const wasteTotalCapacity = wasteDimensions.length * wasteDimensions.width * wasteDimensions.height;
    const wasteUsagePercentage = Math.min((wasteWarehouseStats.currentStorage / wasteTotalCapacity) * 100, 100);
    
    setWasteWarehouseStats(prev => ({
      ...prev,
      totalCapacity: wasteTotalCapacity,
      usagePercentage: wasteUsagePercentage
    }));
  }, [wasteDimensions, wasteWarehouseStats.currentStorage]);
  
  useEffect(() => {
    const recycleTotalCapacity = recycleDimensions.length * recycleDimensions.width * recycleDimensions.height;
    const recycleUsagePercentage = Math.min((recycleWarehouseStats.currentStorage / recycleTotalCapacity) * 100, 100);
    
    setRecycleWarehouseStats(prev => ({
      ...prev,
      totalCapacity: recycleTotalCapacity,
      usagePercentage: recycleUsagePercentage
    }));
  }, [recycleDimensions, recycleWarehouseStats.currentStorage]);

  const fetchWarehouseDimensions = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.wasteWarehouseDimensions) {
          setWasteDimensions(data.wasteWarehouseDimensions);
        }
        if (data.recycleWarehouseDimensions) {
          setRecycleDimensions(data.recycleWarehouseDimensions);
        }
      }
    } catch (err) {
      console.error('Error fetching warehouse dimensions:', err);
    }
  };

  const updateWarehouseDimensions = async (type) => {
    let dimensions, setIsEditing, prefix;
    
    if (type === WASTE_WAREHOUSE_TYPE) {
      dimensions = wasteDimensions;
      setIsEditing = setIsEditingWasteDimensions;
      prefix = 'waste';
    } else {
      dimensions = recycleDimensions;
      setIsEditing = setIsEditingRecycleDimensions;
      prefix = 'recycle';
    }
    
    // Validate dimensions
    const errors = {};
    let hasError = false;

    Object.entries(dimensions).forEach(([key, value]) => {
      if (!value || value <= 0) {
        errors[`${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}`] = 
          `${key.charAt(0).toUpperCase() + key.slice(1)} harus lebih besar dari 0`;
        hasError = true;
      }
    });

    if (hasError) {
      setInputErrors(prev => ({...prev, ...errors}));
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        [`${type}WarehouseDimensions`]: dimensions
      }, { merge: true });
      
      // Clear errors and exit editing mode
      const clearedErrors = {};
      Object.keys(dimensions).forEach(key => {
        clearedErrors[`${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}`] = '';
      });
      
      setInputErrors(prev => ({...prev, ...clearedErrors}));
      setIsEditing(false);
    } catch (err) {
      setError(`Gagal memperbarui dimensi gudang ${type === WASTE_WAREHOUSE_TYPE ? 'sampah' : 'daur ulang'}`);
      console.error(err);
    }
  };

  const fetchWarehouseStats = async () => {
    try {
      setLoading(true);
      if (!currentUser?.uid) {
        throw new Error('ID Pengguna tidak ditemukan');
      }

      // Clean up previous subscriptions
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes = [];

      // Query for industry collections
      const collectionsQuery = query(
        collection(db, 'industryCollections'),
        where('industryId', '==', currentUser.uid)
      );
      
      // Listen for industry collections in real-time
      const unsubscribeCollections = onSnapshot(
        collectionsQuery, 
        (snapshot) => {
          const collectionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          processWarehouseData(collectionsData);
          setLastUpdated(new Date());
        },
        (error) => {
          console.error('Error listening to collections:', error);
          setError('Gagal memuat data koleksi secara realtime');
          setLoading(false);
        }
      );

      // Query for industry requests
      const requestsQuery = query(
        collection(db, 'industryRequests'),
        where('industryId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );
      
      // Listen for industry requests in real-time
      const unsubscribeRequests = onSnapshot(
        requestsQuery, 
        (snapshot) => {
          const requestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // We'll use this data to supplement our warehouse stats
          updateFromRequests(requestsData);
        },
        (error) => {
          console.error('Error listening to requests:', error);
          setError('Gagal memuat data permintaan secara realtime');
          setLoading(false);
        }
      );

      newUnsubscribes.push(unsubscribeCollections, unsubscribeRequests);
      setUnsubscribes(newUnsubscribes);
    } catch (err) {
      console.error('Error fetching warehouse stats:', err);
      setError(err.message || 'Gagal memuat statistik gudang');
      setLoading(false);
    }
  };

  // Process collections data for both waste and recycled materials
  const processWarehouseData = (collectionsData) => {
    try {
      const wasteTypes = {};
      const wasteDetails = {};
      const recycledTypes = {};
      const recycledDetails = {};
      
      let totalWasteWeight = 0;
      let totalRecycledWeight = 0;

      collectionsData.forEach(collection => {
        // Check if this collection has been recycled
        const isRecycled = Boolean(collection.recycledAt);
        
        // Process original wastes (waste storage) only if not recycled
        if (collection.originalWastes && !isRecycled) {
          Object.entries(collection.originalWastes).forEach(([type, data]) => {
            const weight = Number(data.weight) || 0;
            
            if (!wasteTypes[type]) {
              wasteTypes[type] = 0;
              wasteDetails[type] = [];
            }
            
            wasteTypes[type] += weight;
            totalWasteWeight += weight;
            
            const collectionDate = collection.createdAt?.toDate ? 
              collection.createdAt.toDate() : 
              new Date(collection.createdAt?.seconds * 1000 || 0);
              
            wasteDetails[type].push({
              weight: weight,
              date: collectionDate,
              volume: weight * VOLUME_CONVERSION_FACTOR,
              value: data.value || 0
            });
          });
        }
        
        // Process recycled weights (recycled storage)
        if (collection.recycledWeights && collection.recycledAt) {
          Object.entries(collection.recycledWeights).forEach(([type, data]) => {
            const weight = Number(data.weight) || 0;
            
            if (!recycledTypes[type]) {
              recycledTypes[type] = 0;
              recycledDetails[type] = [];
            }
            
            recycledTypes[type] += weight;
            totalRecycledWeight += weight;
            
            const recycledDate = collection.recycledAt?.toDate ? 
              collection.recycledAt.toDate() : 
              new Date(collection.recycledAt?.seconds * 1000 || 0);
              
            recycledDetails[type].push({
              weight: weight,
              date: recycledDate,
              volume: weight * VOLUME_CONVERSION_FACTOR,
              originalWeight: data.originalWeight || 0,
              categoryId: data.categoryId || ''
            });
          });
        }
      });

      const wasteVolume = totalWasteWeight * VOLUME_CONVERSION_FACTOR;
      const wasteTotalCapacity = wasteDimensions.length * wasteDimensions.width * wasteDimensions.height;
      const wasteUsagePercentage = Math.min((wasteVolume / wasteTotalCapacity) * 100, 100);

      const recycledVolume = totalRecycledWeight * VOLUME_CONVERSION_FACTOR;
      const recycleTotalCapacity = recycleDimensions.length * recycleDimensions.width * recycleDimensions.height;
      const recycleUsagePercentage = Math.min((recycledVolume / recycleTotalCapacity) * 100, 100);

      // Update waste warehouse stats
      setWasteWarehouseStats({
        totalCapacity: wasteTotalCapacity,
        currentStorage: wasteVolume,
        wasteTypes,
        wasteDetails,
        usagePercentage: wasteUsagePercentage,
        recentCollections: collectionsData
          .filter(c => c.createdAt && !c.recycledAt) // Only show collections that haven't been recycled
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
      });

      // Update recycled warehouse stats
      setRecycleWarehouseStats({
        totalCapacity: recycleTotalCapacity,
        currentStorage: recycledVolume,
        recycledTypes,
        recycledDetails,
        usagePercentage: recycleUsagePercentage,
        recentRecyclings: collectionsData
          .filter(c => c.recycledAt)
          .sort((a, b) => (b.recycledAt?.seconds || 0) - (a.recycledAt?.seconds || 0))
          .slice(0, 5)
      });

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error processing warehouse data:', err);
      setError('Gagal memproses data gudang');
      setLoading(false);
    }
  };

  // Supplement warehouse data with requests information
  const updateFromRequests = (requestsData) => {
    // This function can be used to add additional information from requests
    // to our warehouse statistics if needed
    // Currently empty as we're primarily using the collections for warehouse data
  };

  const handleRefreshData = () => {
    fetchWarehouseStats();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar 
          role={userData?.role} 
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
              <p className="text-zinc-600">Memuat data gudang...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar 
        role={userData?.role} 
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Header with Tabs */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 text-white rounded-xl bg-emerald-500">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-zinc-800">Pemantauan Gudang Industri</h1>
                  <p className="text-sm text-zinc-500">Pantau kapasitas penyimpanan material mentah dan hasil daur ulang</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshData}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <div className="text-xs text-zinc-500">
                  <Clock className="inline w-3 h-3 mr-1" />
                  Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <TabButton 
                  active={activeTab === 'overview'} 
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart4 className="inline w-4 h-4 mr-1" />
                  Ikhtisar
                </TabButton>
                <TabButton 
                  active={activeTab === 'material'} 
                  onClick={() => setActiveTab('material')}
                >
                  <PackageOpen className="inline w-4 h-4 mr-1" />
                  Gudang Material
                </TabButton>
                <TabButton 
                  active={activeTab === 'recycled'} 
                  onClick={() => setActiveTab('recycled')}
                >
                  <Recycle className="inline w-4 h-4 mr-1" />
                  Gudang Daur Ulang
                </TabButton>
              </div>
              
              <PeriodSelector 
                selectedPeriod={selectedPeriod}
                onChange={setSelectedPeriod}
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex gap-3">
              <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
              <div>
                <h3 className="font-medium text-blue-800">Data Realtime</h3>
                <p className="text-sm text-blue-600">
                  Halaman ini menampilkan data gudang secara realtime. Perubahan pada data koleksi atau dimensi gudang
                  akan segera terlihat tanpa perlu memuat ulang halaman. Material yang sudah didaur ulang akan 
                  dipindahkan dari gudang material mentah ke gudang produk daur ulang.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 my-4 border border-red-100 rounded-lg bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dashboard Overview */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  title="Total Material Mentah" 
                  value={formatNumber(totalRawMaterials.toFixed(1))}
                  unit="kg"
                  icon={PackageOpen}
                  info="Berat total semua material mentah"
                  trend={8.5}
                />
                <StatCard 
                  title="Total Produk Daur Ulang" 
                  value={formatNumber(totalRecycledProducts.toFixed(1))}
                  unit="kg"
                  icon={Recycle}
                  info="Berat total semua produk hasil daur ulang"
                  trend={12.3}
                  color="blue"
                />
                <StatCard 
                  title="Kapasitas Gudang Material" 
                  value={wasteWarehouseStats.usagePercentage.toFixed(1)}
                  unit="%"
                  icon={AlertCircle}
                  info={`${formatNumber(wasteWarehouseStats.currentStorage.toFixed(1))} dari ${formatNumber(wasteWarehouseStats.totalCapacity)} m³`}
                  color={wasteWarehouseStats.usagePercentage >= 90 ? "red" : wasteWarehouseStats.usagePercentage >= 75 ? "amber" : "emerald"}
                />
                <StatCard 
                  title="Kapasitas Gudang Daur Ulang" 
                  value={recycleWarehouseStats.usagePercentage.toFixed(1)}
                  unit="%"
                  icon={AlertCircle}
                  info={`${formatNumber(recycleWarehouseStats.currentStorage.toFixed(1))} dari ${formatNumber(recycleWarehouseStats.totalCapacity)} m³`}
                  color={recycleWarehouseStats.usagePercentage >= 90 ? "red" : recycleWarehouseStats.usagePercentage >= 75 ? "amber" : "blue"}
                />
              </div>

              {/* Main Overview Dashboard */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Warehouse Alert Status */}
                {(wasteWarehouseStats.usagePercentage >= 60 || recycleWarehouseStats.usagePercentage >= 60) && (
                  <Card className="p-5 lg:col-span-3">
                    <SectionHeader 
                      icon={AlertTriangle}
                      title="Status Peringatan Gudang"
                      subtitle="Perhatian diperlukan untuk beberapa gudang"
                    />
                    
                    <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
                      {wasteWarehouseStats.usagePercentage >= 60 && (() => {
                        const alert = getStorageAlert(wasteWarehouseStats.usagePercentage);
                        const AlertIcon = alert.icon;
                        
                        return (
                          <div className={`p-4 rounded-lg border ${
                            alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                            alert.type === 'urgent' ? 'bg-rose-50 border-rose-200' :
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-start gap-3">
                              <AlertIcon className={`h-5 w-5 flex-shrink-0 text-${alert.color}-500 mt-0.5`} />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium text-${alert.color}-700`}>
                                    {alert.title}
                                  </p>
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                    Gudang Material
                                  </span>
                                </div>
                                <p className={`text-sm text-${alert.color}-600`}>
                                  {alert.message}
                                </p>
                                <ul className={`text-sm text-${alert.color}-600 mt-2 space-y-1`}>
                                  {alert.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="select-none">•</span>
                                      <span>{suggestion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {recycleWarehouseStats.usagePercentage >= 60 && (() => {
                        const alert = getStorageAlert(recycleWarehouseStats.usagePercentage);
                        const AlertIcon = alert.icon;
                        
                        return (
                          <div className={`p-4 rounded-lg border ${
                            alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                            alert.type === 'urgent' ? 'bg-rose-50 border-rose-200' :
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-start gap-3">
                              <AlertIcon className={`h-5 w-5 flex-shrink-0 text-${alert.color}-500 mt-0.5`} />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium text-${alert.color}-700`}>
                                    {alert.title}
                                  </p>
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                                    Gudang Daur Ulang
                                  </span>
                                </div>
                                <p className={`text-sm text-${alert.color}-600`}>
                                  {alert.message}
                                </p>
                                <ul className={`text-sm text-${alert.color}-600 mt-2 space-y-1`}>
                                  {alert.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="select-none">•</span>
                                      <span>{suggestion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                )}
                
                {/* Usage Overview */}
                <Card className="p-5 lg:col-span-2">
                  <SectionHeader 
                    icon={BarChart4}
                    title="Status Kapasitas Gudang" 
                    subtitle="Perbandingan penggunaan ruang antara gudang material dan daur ulang"
                  />
                  
                  <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-zinc-800">Gudang Material</h3>
                          <p className="text-sm text-zinc-500">Material Mentah</p>
                        </div>
                        <PackageOpen className="w-6 h-6 text-emerald-500" />
                      </div>
                      
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <div className="mb-2 text-lg font-semibold text-zinc-800">
                          {formatNumber(wasteWarehouseStats.currentStorage.toFixed(1))} <span className="text-sm text-zinc-500">m³</span>
                        </div>
                        <ProgressBar 
                          current={formatNumber(wasteWarehouseStats.currentStorage.toFixed(1))} 
                          total={formatNumber(wasteWarehouseStats.totalCapacity)} 
                          percentage={wasteWarehouseStats.usagePercentage.toFixed(1)}
                          colorClass="bg-emerald-500"
                        />
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="text-xs font-medium text-zinc-500">Dimensi</h4>
                            <p className="text-sm text-zinc-700">
                              {wasteDimensions.length}m × {wasteDimensions.width}m × {wasteDimensions.height}m
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-zinc-500">Material</h4>
                            <p className="text-sm text-zinc-700">
                              {Object.keys(wasteWarehouseStats.wasteTypes).length} jenis
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-zinc-800">Gudang Daur Ulang</h3>
                          <p className="text-sm text-zinc-500">Produk Hasil Olahan</p>
                        </div>
                        <Recycle className="w-6 h-6 text-blue-500" />
                      </div>
                      
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <div className="mb-2 text-lg font-semibold text-zinc-800">
                          {formatNumber(recycleWarehouseStats.currentStorage.toFixed(1))} <span className="text-sm text-zinc-500">m³</span>
                        </div>
                        <ProgressBar 
                          current={formatNumber(recycleWarehouseStats.currentStorage.toFixed(1))} 
                          total={formatNumber(recycleWarehouseStats.totalCapacity)} 
                          percentage={recycleWarehouseStats.usagePercentage.toFixed(1)}
                          colorClass="bg-blue-500"
                        />
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="text-xs font-medium text-zinc-500">Dimensi</h4>
                            <p className="text-sm text-zinc-700">
                              {recycleDimensions.length}m × {recycleDimensions.width}m × {recycleDimensions.height}m
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-zinc-500">Produk</h4>
                            <p className="text-sm text-zinc-700">
                              {Object.keys(recycleWarehouseStats.recycledTypes).length} jenis
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Material Types Overview */}
                <Card className="p-5">
                  <SectionHeader 
                    icon={Filter}
                    title="Jenis Material" 
                    subtitle="Distribusi material di gudang"
                  />
                  
                  <div className="mt-4 space-y-4">
                    {materialTypes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Trash2 className="w-10 h-10 mb-2 text-zinc-300" />
                        <p className="text-zinc-500">Belum ada data material</p>
                      </div>
                    ) : (
                      materialTypes
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                        .map(material => {
                          const percentage = (material.count / totalRawMaterials) * 100;
                          return (
                            <div key={material.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                  <span className="text-sm font-medium text-zinc-700">{material.name}</span>
                                </div>
                                <span className="text-sm text-zinc-500">
                                  {formatNumber(material.count.toFixed(1))} kg
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                <div 
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="text-xs text-right text-zinc-400">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          );
                        })
                    )}
                    
                    {materialTypes.length > 5 && (
                      <button className="flex items-center justify-center w-full py-2 mt-2 text-sm text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50">
                        Lihat Semua Jenis Material
                      </button>
                    )}
                  </div>
                </Card>
              </div>
              
              {/* Activity Overview */}
              <Card className="p-5">
                <SectionHeader 
                  icon={ArrowUpCircle}
                  title="Aktivitas Terbaru" 
                  subtitle="Riwayat pengumpulan dan daur ulang material"
                />
                
                <div className="mt-4 space-y-6">
                  <div className="flex gap-2 pb-2 border-b border-zinc-200">
                    <TabButton active={true}>Semua Aktivitas</TabButton>
                    <TabButton active={false}>Pengumpulan Material</TabButton>
                    <TabButton active={false}>Proses Daur Ulang</TabButton>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Combined timeline of collections and recycling */}
                    {[...wasteWarehouseStats.recentCollections, ...recycleWarehouseStats.recentRecyclings]
                      .sort((a, b) => {
                        const aDate = a.recycledAt?.seconds || a.createdAt?.seconds || 0;
                        const bDate = b.recycledAt?.seconds || b.createdAt?.seconds || 0;
                        return bDate - aDate;
                      })
                      .slice(0, 5)
                      .map(activity => {
                        const isCollection = Boolean(activity.createdAt && !activity.recycledAt);
                        const date = isCollection 
                          ? new Date(activity.createdAt?.seconds * 1000) 
                          : new Date(activity.recycledAt?.seconds * 1000);
                        
                        const totalWeight = isCollection
                          ? (activity.originalWastes 
                             ? Object.values(activity.originalWastes).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0)
                             : 0)
                          : (activity.recycledWeights
                             ? Object.values(activity.recycledWeights).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0)
                             : 0);
                             
                        const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;
                        
                        return (
                          <div key={`${activity.id}-${isCollection ? 'collect' : 'recycle'}`} className="flex gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${
                              isCollection ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}>
                              {isCollection 
                                ? <PackageOpen className="w-5 h-5 text-emerald-600" />
                                : <Recycle className="w-5 h-5 text-blue-600" />
                              }
                            </div>
                            
                            <div className="flex-grow">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-zinc-800">
                                    {isCollection ? 'Pengumpulan Material' : 'Proses Daur Ulang'}
                                  </p>
                                  <p className="text-sm text-zinc-500">
                                    {date.toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${isCollection ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {formatNumber(totalVolume.toFixed(1))} m³
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {formatNumber(totalWeight.toFixed(1))} kg
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                {isCollection 
                                  ? (activity.originalWastes && Object.entries(activity.originalWastes).map(([type, data]) => {
                                      const weight = Number(data.weight) || 0;
                                      const volume = weight * VOLUME_CONVERSION_FACTOR;
                                      const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
                                      
                                      return (
                                        <span key={type} className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                          {typeDisplay}: {formatNumber(volume.toFixed(1))} m³
                                        </span>
                                      );
                                    }))
                                  : (activity.recycledWeights && Object.entries(activity.recycledWeights).map(([type, data]) => {
                                      const weight = Number(data.weight) || 0;
                                      const volume = weight * VOLUME_CONVERSION_FACTOR;
                                      const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
                                      
                                      return (
                                        <span key={type} className="px-2 py-1 text-xs text-blue-700 rounded-full bg-blue-50">
                                          {typeDisplay}: {formatNumber(volume.toFixed(1))} m³
                                        </span>
                                      );
                                    }))
                                }
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* RAW MATERIALS WAREHOUSE TAB */}
          {activeTab === 'material' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard 
                  title="Total Kapasitas"
                  value={formatNumber(wasteWarehouseStats.totalCapacity)}
                  unit="m³"
                  icon={Box}
                  info="Kapasitas maksimal gudang berdasarkan dimensi"
                />
                <StatCard 
                  title="Penyimpanan Saat Ini"
                  value={formatNumber(wasteWarehouseStats.currentStorage.toFixed(1))}
                  unit="m³"
                  icon={PackageOpen}
                  info="Volume material yang saat ini disimpan di gudang"
                />
                <StatCard 
                  title="Penggunaan"
                  value={wasteWarehouseStats.usagePercentage.toFixed(1)}
                  unit="%"
                  icon={AlertCircle}
                  info="Persentase kapasitas gudang yang telah terpakai"
                  color={wasteWarehouseStats.usagePercentage >= 90 ? "red" : wasteWarehouseStats.usagePercentage >= 75 ? "amber" : "emerald"}
                />
              </div>

              {/* Storage Alert System */}
              {wasteWarehouseStats.usagePercentage >= 60 && (() => {
                const alert = getStorageAlert(wasteWarehouseStats.usagePercentage);
                const AlertIcon = alert.icon;
                
                return (
                  <Card className="p-5">
                    <div className={`p-4 rounded-lg border ${
                      alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.type === 'urgent' ? 'bg-rose-50 border-rose-200' :
                      alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertIcon className={`h-5 w-5 flex-shrink-0 text-${alert.color}-500 mt-0.5`} />
                        <div className="space-y-1">
                          <p className={`font-medium text-${alert.color}-700`}>
                            {alert.title}
                          </p>
                          <p className={`text-sm text-${alert.color}-600`}>
                            {alert.message}
                          </p>
                          <ul className={`text-sm text-${alert.color}-600 mt-2 space-y-1`}>
                            {alert.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="select-none">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Waste Warehouse Dimensions Settings */}
              <CollapsibleSection 
                title="Dimensi Gudang Material" 
                icon={Box}
              >
                <div className="mb-4">
                  <p className="text-sm text-zinc-500">Atur ukuran gudang penyimpanan material mentah untuk menghitung kapasitas total</p>
                  
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => isEditingWasteDimensions 
                        ? updateWarehouseDimensions('waste') 
                        : setIsEditingWasteDimensions(true)}
                      className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                    >
                      {isEditingWasteDimensions ? 'Simpan Perubahan' : 'Edit Dimensi'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {['length', 'width', 'height'].map((dim) => (
                    <div key={`waste-${dim}`} className="space-y-2">
                      <label className="block text-sm font-medium capitalize text-zinc-700">
                        {dim === 'length' ? 'Panjang' : dim === 'width' ? 'Lebar' : 'Tinggi'} (m)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={wasteDimensions[dim]}
                          onChange={(e) => {
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setWasteDimensions(prev => ({
                              ...prev,
                              [dim]: newValue
                            }));
                            // Clear error when user starts typing
                            if (inputErrors[`waste${dim.charAt(0).toUpperCase() + dim.slice(1)}`]) {
                              setInputErrors(prev => ({
                                ...prev,
                                [`waste${dim.charAt(0).toUpperCase() + dim.slice(1)}`]: ''
                              }));
                            }
                          }}
                          disabled={!isEditingWasteDimensions}
                          className={`block w-full rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-zinc-50 pr-12
                            ${inputErrors[`waste${dim.charAt(0).toUpperCase() + dim.slice(1)}`] ? 'border-red-300' : 'border-zinc-300'}`}
                        />
                        <span className="absolute -translate-y-1/2 right-3 top-1/2 text-zinc-400">
                          m
                        </span>
                      </div>
                      {inputErrors[`waste${dim.charAt(0).toUpperCase() + dim.slice(1)}`] && (
                        <p className="mt-1 text-xs text-red-500">{inputErrors[`waste${dim.charAt(0).toUpperCase() + dim.slice(1)}`]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 mt-6 rounded-lg bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-600">Total Volume Gudang Material:</span>
                    <span className="text-lg font-semibold text-zinc-800">
                      {formatNumber((wasteDimensions.length * wasteDimensions.width * wasteDimensions.height).toFixed(1))} m³
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Volume dihitung dari perkalian panjang × lebar × tinggi gudang. Semakin besar volume, semakin banyak material mentah yang dapat disimpan.
                  </p>
                </div>
              </CollapsibleSection>

              {/* Waste Storage Overview with 3D Visualization */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-2">
                  <SectionHeader 
                    icon={PackageOpen}
                    title="Visualisasi Gudang Material" 
                    subtitle="Penggunaan ruang gudang material dalam tampilan 3D"
                  />

                  <div className="mt-4 space-y-6">
                    {/* 3D Visualization component */}
                    <Suspense fallback={
                      <div className="w-full h-[500px] flex items-center justify-center bg-zinc-50 rounded-xl">
                        <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
                      </div>
                    }>
                      <WarehouseVisualization3D 
                        wasteTypes={Object.entries(wasteWarehouseStats.wasteTypes).reduce((acc, [type, weight]) => ({
                          ...acc,
                          [type]: weight * VOLUME_CONVERSION_FACTOR
                        }), {})}
                        totalCapacity={wasteWarehouseStats.totalCapacity}
                        currentStorage={wasteWarehouseStats.currentStorage}
                        dimensions={wasteDimensions}
                        wasteDetails={wasteWarehouseStats.wasteDetails}
                      />
                    </Suspense>
                    
                    <div>
                      <ProgressBar 
                        current={formatNumber(wasteWarehouseStats.currentStorage.toFixed(1))} 
                        total={formatNumber(wasteWarehouseStats.totalCapacity)} 
                        percentage={wasteWarehouseStats.usagePercentage.toFixed(1)}
                      />
                      
                      <p className="mt-3 text-xs text-zinc-500">
                        Visualisasi di atas menunjukkan berapa banyak ruang gudang yang terpakai berdasarkan jenis material. 
                        Warna yang berbeda mewakili jenis material yang berbeda. Material yang sudah didaur ulang
                        tidak lagi dihitung sebagai bagian dari gudang material mentah.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Waste Distribution */}
                <Card className="p-5">
                  <SectionHeader 
                    icon={Scale}
                    title="Distribusi Material" 
                    subtitle="Rincian jenis material yang disimpan"
                  />

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 mt-4">
                    {Object.entries(wasteWarehouseStats.wasteTypes).length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                        <PackageOpen className="w-12 h-12 mb-2 text-zinc-300" />
                        <p className="text-zinc-600">Belum ada data material yang tersimpan</p>
                      </div>
                    ) : (
                      Object.entries(wasteWarehouseStats.wasteTypes)
                        .map(([type, weight]) => {
                          const volume = weight * VOLUME_CONVERSION_FACTOR;
                          const details = wasteWarehouseStats.wasteDetails[type] || [];
                          const oldestDate = details.length > 0 ? 
                            new Date(Math.min(...details.map(d => d.date.getTime ? d.date.getTime() : d.date))) : null;
                          const percentage = (volume / wasteWarehouseStats.currentStorage) * 100;

                          return {
                            type,
                            translatedType: type.charAt(0).toUpperCase() + type.slice(1),
                            weight,
                            volume,
                            oldestDate,
                            percentage
                          };
                        })
                        .sort((a, b) => b.volume - a.volume)
                        .map(item => (
                          <div key={item.type} className="p-4 border rounded-lg border-zinc-200">
                            <div className="flex justify-between mb-2">
                              <div>
                                <span className="text-sm font-medium text-zinc-700">
                                  {item.translatedType}
                                </span>
                                {item.oldestDate && (
                                  <div className="mt-1 text-xs text-zinc-400">
                                    Batch terlama: {item.oldestDate.toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-zinc-700">
                                  {formatNumber(item.volume.toFixed(1))} m³
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatNumber(item.weight.toFixed(1))} kg ({item.percentage.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div 
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Collections */}
              <Card className="p-5">
                <SectionHeader 
                  icon={ArrowUpCircle}
                  title="Pengumpulan Material Terbaru" 
                  subtitle="Riwayat pengumpulan material terakhir yang masuk ke gudang"
                />

                <div className="mt-4 divide-y divide-zinc-200">
                  {wasteWarehouseStats.recentCollections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                      <ArrowUpCircle className="w-12 h-12 mb-2 text-zinc-300" />
                      <p className="text-zinc-600">Belum ada data pengumpulan material</p>
                    </div>
                  ) : (
                    wasteWarehouseStats.recentCollections.map(collection => {
                      const totalWeight = collection.originalWastes 
                        ? Object.values(collection.originalWastes).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0)
                        : 0;
                      const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;

                      return (
                        <div key={collection.id} className="py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-zinc-800">{collection.industryName || "Industri"}</p>
                              <p className="text-sm text-zinc-500">
                                {new Date(collection.createdAt?.seconds * 1000).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-emerald-600">
                                {formatNumber(totalVolume.toFixed(1))} m³
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatNumber(totalWeight.toFixed(1))} kg
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {collection.originalWastes && Object.entries(collection.originalWastes).map(([type, data]) => {
                              const weight = Number(data.weight) || 0;
                              const volume = weight * VOLUME_CONVERSION_FACTOR;
                              const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
                              
                              return (
                                <span key={type} className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                  {typeDisplay}: {formatNumber(volume.toFixed(1))} m³
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* RECYCLED PRODUCTS WAREHOUSE TAB */}
          {activeTab === 'recycled' && (
            <div className="space-y-6">
              {/* Quick Stats for Recycled Products */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard 
                  title="Total Kapasitas"
                  value={formatNumber(recycleWarehouseStats.totalCapacity)}
                  unit="m³"
                  icon={Box}
                  info="Kapasitas maksimal gudang produk daur ulang"
                  color="blue"
                />
                <StatCard 
                  title="Penyimpanan Saat Ini"
                  value={formatNumber(recycleWarehouseStats.currentStorage.toFixed(1))}
                  unit="m³"
                  icon={Recycle}
                  info="Volume produk daur ulang yang saat ini disimpan"
                  color="blue"
                />
                <StatCard 
                  title="Penggunaan"
                  value={recycleWarehouseStats.usagePercentage.toFixed(1)}
                  unit="%"
                  icon={AlertCircle}
                  info="Persentase kapasitas gudang yang telah terpakai"
                  color={recycleWarehouseStats.usagePercentage >= 90 ? "red" : recycleWarehouseStats.usagePercentage >= 75 ? "amber" : "blue"}
                />
              </div>

              {/* Storage Alert System for Recycled Products */}
              {recycleWarehouseStats.usagePercentage >= 60 && (() => {
                const alert = getStorageAlert(recycleWarehouseStats.usagePercentage);
                const AlertIcon = alert.icon;
                
                return (
                  <Card className="p-5">
                    <div className={`p-4 rounded-lg border ${
                      alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.type === 'urgent' ? 'bg-rose-50 border-rose-200' :
                      alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertIcon className={`h-5 w-5 flex-shrink-0 text-${alert.color}-500 mt-0.5`} />
                        <div className="space-y-1">
                          <p className={`font-medium text-${alert.color}-700`}>
                            {alert.title} (Produk Daur Ulang)
                          </p>
                          <p className={`text-sm text-${alert.color}-600`}>
                            {alert.message}
                          </p>
                          <ul className={`text-sm text-${alert.color}-600 mt-2 space-y-1`}>
                            {alert.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="select-none">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Recycled Products Warehouse Dimensions Settings */}
              <CollapsibleSection 
                title="Dimensi Gudang Produk Daur Ulang" 
                icon={Box}
              >
                <div className="mb-4">
                  <p className="text-sm text-zinc-500">Atur ukuran gudang penyimpanan produk hasil daur ulang untuk menghitung kapasitas total</p>
                  
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => isEditingRecycleDimensions 
                        ? updateWarehouseDimensions('recycle') 
                        : setIsEditingRecycleDimensions(true)}
                      className="px-4 py-2 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      {isEditingRecycleDimensions ? 'Simpan Perubahan' : 'Edit Dimensi'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {['length', 'width', 'height'].map((dim) => (
                    <div key={`recycle-${dim}`} className="space-y-2">
                      <label className="block text-sm font-medium capitalize text-zinc-700">
                        {dim === 'length' ? 'Panjang' : dim === 'width' ? 'Lebar' : 'Tinggi'} (m)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={recycleDimensions[dim]}
                          onChange={(e) => {
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setRecycleDimensions(prev => ({
                              ...prev,
                              [dim]: newValue
                            }));
                            // Clear error when user starts typing
                            if (inputErrors[`recycle${dim.charAt(0).toUpperCase() + dim.slice(1)}`]) {
                              setInputErrors(prev => ({
                                ...prev,
                                [`recycle${dim.charAt(0).toUpperCase() + dim.slice(1)}`]: ''
                              }));
                            }
                          }}
                          disabled={!isEditingRecycleDimensions}
                          className={`block w-full rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-zinc-50 pr-12
                            ${inputErrors[`recycle${dim.charAt(0).toUpperCase() + dim.slice(1)}`] ? 'border-red-300' : 'border-zinc-300'}`}
                        />
                        <span className="absolute -translate-y-1/2 right-3 top-1/2 text-zinc-400">
                          m
                        </span>
                      </div>
                      {inputErrors[`recycle${dim.charAt(0).toUpperCase() + dim.slice(1)}`] && (
                        <p className="mt-1 text-xs text-red-500">{inputErrors[`recycle${dim.charAt(0).toUpperCase() + dim.slice(1)}`]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 mt-6 rounded-lg bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-600">Total Volume Gudang Daur Ulang:</span>
                    <span className="text-lg font-semibold text-zinc-800">
                      {formatNumber((recycleDimensions.length * recycleDimensions.width * recycleDimensions.height).toFixed(1))} m³
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Volume dihitung dari perkalian panjang × lebar × tinggi gudang. Semakin besar volume, semakin banyak produk hasil daur ulang yang dapat disimpan.
                  </p>
                </div>
              </CollapsibleSection>

              {/* Recycled Products Visualization */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-2">
                  <SectionHeader 
                    icon={Recycle}
                    title="Visualisasi Gudang Produk Daur Ulang" 
                    subtitle="Penggunaan ruang gudang produk daur ulang dalam tampilan 3D"
                  />

                  <div className="mt-4 space-y-6">
                    {/* 3D Visualization component for recycled products */}
                    <Suspense fallback={
                      <div className="w-full h-[500px] flex items-center justify-center bg-zinc-50 rounded-xl">
                        <div className="w-12 h-12 border-b-2 border-blue-500 rounded-full animate-spin" />
                      </div>
                    }>
                      <WarehouseVisualization3D 
                        wasteTypes={Object.entries(recycleWarehouseStats.recycledTypes).reduce((acc, [type, weight]) => ({
                          ...acc,
                          [type]: weight * VOLUME_CONVERSION_FACTOR
                        }), {})}
                        totalCapacity={recycleWarehouseStats.totalCapacity}
                        currentStorage={recycleWarehouseStats.currentStorage}
                        dimensions={recycleDimensions}
                        wasteDetails={recycleWarehouseStats.recycledDetails}
                        isRecycled={true}
                      />
                    </Suspense>
                    
                    <div>
                      <ProgressBar 
                        current={formatNumber(recycleWarehouseStats.currentStorage.toFixed(1))} 
                        total={formatNumber(recycleWarehouseStats.totalCapacity)} 
                        percentage={recycleWarehouseStats.usagePercentage.toFixed(1)}
                        colorClass="bg-blue-500"
                      />
                      
                      <p className="mt-3 text-xs text-zinc-500">
                        Visualisasi di atas menunjukkan berapa banyak ruang gudang yang terpakai untuk produk hasil daur ulang.
                        Warna yang berbeda mewakili jenis produk yang berbeda.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Recycled Products Distribution */}
                <Card className="p-5">
                  <SectionHeader 
                    icon={Scale}
                    title="Distribusi Produk Daur Ulang" 
                    subtitle="Rincian jenis produk daur ulang yang disimpan"
                  />

                  <div className="mt-4 space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {Object.entries(recycleWarehouseStats.recycledTypes).length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                        <Recycle className="w-12 h-12 mb-2 text-zinc-300" />
                        <p className="text-zinc-600">Belum ada data produk daur ulang yang tersimpan</p>
                      </div>
                    ) : (
                      Object.entries(recycleWarehouseStats.recycledTypes)
                        .map(([type, weight]) => {
                          const volume = weight * VOLUME_CONVERSION_FACTOR;
                          const details = recycleWarehouseStats.recycledDetails[type] || [];
                          const oldestDate = details.length > 0 ? 
                            new Date(Math.min(...details.map(d => d.date.getTime ? d.date.getTime() : d.date))) : null;
                          const percentage = (volume / recycleWarehouseStats.currentStorage) * 100;

                          return {
                            type,
                            translatedType: type.charAt(0).toUpperCase() + type.slice(1),
                            weight,
                            volume,
                            oldestDate,
                            percentage
                          };
                        })
                        .sort((a, b) => b.volume - a.volume)
                        .map(item => (
                          <div key={item.type} className="p-4 border rounded-lg border-zinc-200">
                            <div className="flex justify-between mb-2">
                              <div>
                                <span className="text-sm font-medium text-zinc-700">
                                  {item.translatedType}
                                </span>
                                {item.oldestDate && (
                                  <div className="mt-1 text-xs text-zinc-400">
                                    Batch terlama: {item.oldestDate.toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-zinc-700">
                                  {formatNumber(item.volume.toFixed(1))} m³
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatNumber(item.weight.toFixed(1))} kg ({item.percentage.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Recycling Activities */}
              <Card className="p-5">
                <SectionHeader 
                  icon={Recycle}
                  title="Aktivitas Daur Ulang Terbaru" 
                  subtitle="Riwayat produksi produk daur ulang terakhir"
                />

                <div className="mt-4 divide-y divide-zinc-200">
                  {recycleWarehouseStats.recentRecyclings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                      <Recycle className="w-12 h-12 mb-2 text-zinc-300" />
                      <p className="text-zinc-600">Belum ada data aktivitas daur ulang</p>
                    </div>
                  ) : (
                    recycleWarehouseStats.recentRecyclings.map(collection => {
                      const totalWeight = collection.recycledWeights 
                        ? Object.values(collection.recycledWeights).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0)
                        : 0;
                      const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;

                      return (
                        <div key={collection.id} className="py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-zinc-800">{collection.industryName || "Industri"}</p>
                              <p className="text-sm text-zinc-500">
                                {new Date(collection.recycledAt?.seconds * 1000).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-blue-600">
                                {formatNumber(totalVolume.toFixed(1))} m³
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatNumber(totalWeight.toFixed(1))} kg
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {collection.recycledWeights && Object.entries(collection.recycledWeights).map(([type, data]) => {
                              const weight = Number(data.weight) || 0;
                              const volume = weight * VOLUME_CONVERSION_FACTOR;
                              const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
                              
                              return (
                                <span key={type} className="px-2 py-1 text-xs text-blue-700 rounded-full bg-blue-50">
                                  {typeDisplay}: {formatNumber(volume.toFixed(1))} m³
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IndustryWarehouse;