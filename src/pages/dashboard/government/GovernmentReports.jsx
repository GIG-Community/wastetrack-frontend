import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  LeafyGreen,
  Loader2,
  AlertCircle,
  TreesIcon,
  Building2,
  Package,
  Download,
  Calendar,
  Recycle,
  DropletIcon,
  Scale,
  HelpCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Enhanced Environmental Impact Constants
const IMPACT_FACTORS = {
  organic: { 
    carbon: 2.5,    // kg CO2 saved per kg (composting vs landfill)
    water: 1000,    // liters saved per kg
    landfill: 0.2,  // m³ saved per kg
    carbonOffset: 0.8 // carbon credit potential (tons CO2e)
  },
  plastic: { 
    carbon: 6.0,    // kg CO2 saved per kg (recycling vs new production)
    water: 2000,    // liters saved per kg
    landfill: 0.1,  // m³ saved per kg
    trees: 0.1,     // trees saved per kg
    carbonOffset: 2.0 // carbon credit potential (tons CO2e)
  },
  paper: { 
    carbon: 3.3,    // kg CO2 saved per kg (recycling vs new production)
    water: 1500,    // liters saved per kg
    landfill: 0.15, // m³ saved per kg
    trees: 0.2,     // trees saved per kg
    carbonOffset: 1.2 // carbon credit potential (tons CO2e)
  },
  metal: { 
    carbon: 9.0,    // kg CO2 saved per kg (recycling vs new production)
    water: 3000,    // liters saved per kg
    landfill: 0.05,  // m³ saved per kg
    carbonOffset: 3.5 // carbon credit potential (tons CO2e)
  },
  glass: {
    carbon: 0.8,    // kg CO2 saved per kg
    water: 500,     // liters saved per kg
    landfill: 0.08, // m³ saved per kg
    carbonOffset: 0.3 // carbon credit potential (tons CO2e)
  },
  electronics: {
    carbon: 20.0,   // kg CO2 saved per kg
    water: 4000,    // liters saved per kg
    landfill: 0.1,  // m³ saved per kg
    carbonOffset: 8.0 // carbon credit potential (tons CO2e)
  }
};

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Base Components
const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg 
      text-gray-700 text-sm transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      hover:border-emerald-500/50 
      ${className}`}
    {...props}
  />
);

const StatCard = ({ icon: Icon, label, value, subValue }) => (
  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-emerald-50">
        <Icon className="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-800">{value}</p>
        {subValue && (
          <p className="mt-1 text-sm text-gray-500">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, description, children }) => (
  <div className="p-6 bg-white border border-gray-200 rounded-xl">
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <InfoTooltip>{description}</InfoTooltip>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="relative inline-block group">
    <HelpCircle className="w-4 h-4 text-gray-400 transition-colors hover:text-gray-600" />
    <div className="absolute invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all -translate-x-1/2 bg-gray-800 rounded-lg opacity-0 bottom-full left-1/2 group-hover:opacity-100 group-hover:visible">
      {children}
      <div className="absolute -mt-1 -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-gray-800" />
    </div>
  </div>
);

const WastebankReports = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickupData, setPickupData] = useState([]);
  const [masterRequests, setMasterRequests] = useState([]);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [masterBanks, setMasterBanks] = useState([]);
  const [mapCenter] = useState([-7.2575, 112.7521]); // Default: Surabaya
  const [dateRange, setDateRange] = useState('month');
  const [stats, setStats] = useState({
    totalImpact: {
      carbon: 0,
      water: 0,
      trees: 0,
      landfill: 0
    },
    wasteTypes: [],
    locations: [],
    monthlyTrends: [],
    bankPerformance: {
      small: {
        totalTransactions: 0,
        totalValue: 0,
        avgTransactionValue: 0,
        topPerformers: []
      },
      master: {
        totalTransactions: 0,
        totalValue: 0,
        avgTransactionValue: 0,
        topPerformers: []
      }
    }
  });

  const [carbonStats, setCarbonStats] = useState({
    totalOffset: 0,
    potentialCredits: 0,
    monthlyOffset: [],
    wasteTypeOffset: [],
    projectedSavings: 0,
    carbonEfficiency: 0
  });

  // Enhanced impact calculation
  const calculateImpact = (wastes = {}) => {
    let impact = {
      carbon: 0,
      water: 0,
      trees: 0,
      landfill: 0,
      carbonOffset: 0,
      potentialCredits: 0
    };

    Object.entries(wastes).forEach(([type, data]) => {
      const factors = IMPACT_FACTORS[type];
      if (factors && data.weight) {
        impact.carbon += factors.carbon * data.weight;
        impact.water += factors.water * data.weight;
        impact.landfill += factors.landfill * data.weight;
        impact.carbonOffset += factors.carbonOffset * data.weight;
        impact.potentialCredits += (factors.carbonOffset * data.weight * 0.001); // Convert to tons
        if (factors.trees) {
          impact.trees += factors.trees * data.weight;
        }
      }
    });

    return impact;
  };

  // Fetch data
  useEffect(() => {
    setLoading(true);
    
    try {
      // Create query references
      const wasteBankQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_admin')
      );
      const masterBankQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master')
      );
      const pickupsQuery = query(collection(db, 'pickups'));
      const masterRequestsQuery = query(collection(db, 'masterBankRequests'));
      
      // Create unsubscribe functions array for cleanup
      const unsubscribes = [];
      
      // Data containers
      let wasteBankData = [];
      let masterBankData = [];
      let pickupsData = [];
      let masterRequestsData = [];
      
      // Counter to track when all data sources are loaded
      let dataSourcesLoaded = 0;
      const totalDataSources = 4;
      
      // Process data once all sources are loaded
      const processData = () => {
        if (dataSourcesLoaded < totalDataSources) return;
        
        // Filter completed pickups
        const completedPickups = pickupsData.filter(pickup => pickup.status === 'completed');
        
        // Filter completed master requests
        const completedMasterRequests = masterRequestsData.filter(request => request.status === 'completed');
        
        // Set the data states
        setWasteBanks(wasteBankData);
        setMasterBanks(masterBankData);
        setPickupData(completedPickups);
        setMasterRequests(completedMasterRequests);
        
        // Process statistics with all data
        calculateStatistics(wasteBankData, masterBankData, completedPickups, completedMasterRequests);
        
        setLoading(false);
      };
      
      // Set up real-time listeners
      
      // Listen for waste banks
      const wasteBankUnsubscribe = onSnapshot(
        wasteBankQuery,
        (snapshot) => {
          wasteBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching waste banks:', error);
          setError('Failed to load waste bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(wasteBankUnsubscribe);
      
      // Listen for master banks
      const masterBankUnsubscribe = onSnapshot(
        masterBankQuery,
        (snapshot) => {
          masterBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master banks:', error);
          setError('Failed to load master bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterBankUnsubscribe);
      
      // Listen for pickups
      const pickupsUnsubscribe = onSnapshot(
        pickupsQuery,
        (snapshot) => {
          pickupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching pickups:', error);
          setError('Failed to load pickup data');
          setLoading(false);
        }
      );
      unsubscribes.push(pickupsUnsubscribe);
      
      // Listen for master requests
      const masterRequestsUnsubscribe = onSnapshot(
        masterRequestsQuery,
        (snapshot) => {
          masterRequestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master requests:', error);
          setError('Failed to load master request data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterRequestsUnsubscribe);
      
      // Cleanup function to unsubscribe from all listeners when component unmounts
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
      
    } catch (err) {
      console.error('Error setting up data listeners:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  }, [dateRange]);

  // Calculate statistics with enhanced analytics
  const calculateStatistics = (wasteBanks, masterBanks, pickups, masterRequests) => {
    // Calculate waste bank performance
    const bankPerformance = {
      small: {
        totalTransactions: pickups.length,
        totalValue: pickups.reduce((acc, pickup) => acc + (pickup.totalValue || 0), 0),
        avgTransactionValue: 0,
        topPerformers: []
      },
      master: {
        totalTransactions: masterRequests.length,
        totalValue: masterRequests.reduce((acc, request) => acc + (request.totalValue || 0), 0),
        avgTransactionValue: 0,
        topPerformers: []
      }
    };

    // Calculate averages
    bankPerformance.small.avgTransactionValue = 
      bankPerformance.small.totalValue / (bankPerformance.small.totalTransactions || 1);
    bankPerformance.master.avgTransactionValue = 
      bankPerformance.master.totalValue / (bankPerformance.master.totalTransactions || 1);

    // Calculate top performing waste banks
    const smallBankStats = {};
    pickups.forEach(pickup => {
      if (!smallBankStats[pickup.wasteBankId]) {
        smallBankStats[pickup.wasteBankId] = {
          id: pickup.wasteBankId,
          name: pickup.wasteBankName,
          transactions: 0,
          totalValue: 0,
          totalWeight: 0
        };
      }

      smallBankStats[pickup.wasteBankId].transactions += 1;
      smallBankStats[pickup.wasteBankId].totalValue += pickup.totalValue || 0;
      
      Object.values(pickup.wastes || {}).forEach(waste => {
        smallBankStats[pickup.wasteBankId].totalWeight += waste.weight || 0;
      });
    });

    // Calculate top performing master banks
    const masterBankStats = {};
    masterRequests.forEach(request => {
      if (!masterBankStats[request.masterBankId]) {
        masterBankStats[request.masterBankId] = {
          id: request.masterBankId,
          name: request.masterBankName,
          transactions: 0,
          totalValue: 0,
          totalWeight: 0
        };
      }

      masterBankStats[request.masterBankId].transactions += 1;
      masterBankStats[request.masterBankId].totalValue += request.totalValue || 0;
      
      Object.values(request.wastes || {}).forEach(waste => {
        masterBankStats[request.masterBankId].totalWeight += waste.weight || 0;
      });
    });

    // Sort and set top performers
    bankPerformance.small.topPerformers = Object.values(smallBankStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
    bankPerformance.master.topPerformers = Object.values(masterBankStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    // Calculate total environmental impact from all transactions
    const totalImpact = {
      carbon: 0,
      water: 0,
      trees: 0,
      landfill: 0
    };

    // Process small bank pickups
    pickups.forEach(pickup => {
      const impact = calculateImpact(pickup.wastes);
      totalImpact.carbon += impact.carbon;
      totalImpact.water += impact.water;
      totalImpact.trees += impact.trees;
      totalImpact.landfill += impact.landfill;
    });

    // Process master bank requests
    masterRequests.forEach(request => {
      const impact = calculateImpact(request.wastes);
      totalImpact.carbon += impact.carbon;
      totalImpact.water += impact.water;
      totalImpact.trees += impact.trees;
      totalImpact.landfill += impact.landfill;
    });

    // Calculate waste type distribution combining both pickups and master requests
    const wasteTypes = {};
    const processWastes = (wastes, source) => {
      Object.entries(wastes || {}).forEach(([type, data]) => {
        if (!wasteTypes[type]) {
          wasteTypes[type] = { weight: 0, impact: 0, sources: { small: 0, master: 0 } };
        }
        wasteTypes[type].weight += data.weight || 0;
        wasteTypes[type].impact += calculateImpact({ [type]: data }).carbon;
        wasteTypes[type].sources[source] += data.weight || 0;
      });
    };

    pickups.forEach(pickup => processWastes(pickup.wastes, 'small'));
    masterRequests.forEach(request => processWastes(request.wastes, 'master'));

    // Update all locations data combining both types of facilities
    const locations = [
      ...wasteBanks.map(bank => {
        const coordinates = bank.profile?.location?.coordinates;
        return {
          id: bank.id,
          name: bank.profile?.institution || 'Unknown Bank',
          type: 'small',
          coordinates: coordinates ? {
            lat: coordinates._lat || coordinates[0],
            lng: coordinates._long || coordinates[1]
          } : null,
          address: bank.profile?.location?.address,
          city: bank.profile?.location?.city,
          stats: smallBankStats[bank.id] || {
            transactions: 0,
            totalValue: 0,
            totalWeight: 0
          }
        };
      }),
      ...masterBanks.map(bank => {
        const coordinates = bank.profile?.location?.coordinates;
        return {
          id: bank.id,
          name: bank.profile?.institution || 'Unknown Master Bank',
          type: 'master',
          coordinates: coordinates ? {
            lat: coordinates._lat || coordinates[0],
            lng: coordinates._long || coordinates[1]
          } : null,
          address: bank.profile?.location?.address,
          city: bank.profile?.location?.city,
          stats: masterBankStats[bank.id] || {
            transactions: 0,
            totalValue: 0,
            totalWeight: 0
          }
        };
      })
    ].filter(location => location.coordinates && location.coordinates.lat && location.coordinates.lng);

    // Calculate monthly trends combining both types
    const monthlyData = {};
    const processTransaction = (transaction, type) => {
      if (!transaction.completedAt) return;
      
      const date = new Date(transaction.completedAt.seconds * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleString('default', { month: 'short' }),
          weight: 0,
          impact: 0,
          smallBankValue: 0,
          masterBankValue: 0,
          transactions: {
            small: 0,
            master: 0
          }
        };
      }

      const impact = calculateImpact(transaction.wastes);
      monthlyData[monthKey].impact += impact.carbon;

      if (type === 'small') {
        monthlyData[monthKey].smallBankValue += transaction.totalValue || 0;
        monthlyData[monthKey].transactions.small += 1;
      } else {
        monthlyData[monthKey].masterBankValue += transaction.totalValue || 0;
        monthlyData[monthKey].transactions.master += 1;
      }

      Object.values(transaction.wastes || {}).forEach(waste => {
        monthlyData[monthKey].weight += waste.weight || 0;
      });
    };

    pickups.forEach(pickup => processTransaction(pickup, 'small'));
    masterRequests.forEach(request => processTransaction(request, 'master'));

    // Enhanced carbon offset calculations
    let totalCarbonOffset = 0;
    let totalPotentialCredits = 0;
    const monthlyOffset = {};
    const wasteTypeOffset = {};

    // Process carbon offset from small bank pickups
    pickups.forEach(pickup => {
      const impact = calculateImpact(pickup.wastes);
      totalCarbonOffset += impact.carbonOffset;
      totalPotentialCredits += impact.potentialCredits;

      // Calculate monthly offset
      const date = new Date(pickup.completedAt.seconds * 1000);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyOffset[monthKey] = (monthlyOffset[monthKey] || 0) + impact.carbonOffset;

      // Calculate offset by waste type
      Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
        if (!wasteTypeOffset[type]) {
          wasteTypeOffset[type] = {
            offset: 0,
            credits: 0,
            weight: 0
          };
        }
        const typeImpact = calculateImpact({ [type]: data });
        wasteTypeOffset[type].offset += typeImpact.carbonOffset;
        wasteTypeOffset[type].credits += typeImpact.potentialCredits;
        wasteTypeOffset[type].weight += data.weight || 0;
      });
    });

    // Process carbon offset from master requests
    masterRequests.forEach(request => {
      const impact = calculateImpact(request.wastes);
      totalCarbonOffset += impact.carbonOffset;
      totalPotentialCredits += impact.potentialCredits;

      // Add to monthly offset
      const date = new Date(request.completedAt.seconds * 1000);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyOffset[monthKey] = (monthlyOffset[monthKey] || 0) + impact.carbonOffset;

      // Add to waste type offset
      Object.entries(request.wastes || {}).forEach(([type, data]) => {
        if (!wasteTypeOffset[type]) {
          wasteTypeOffset[type] = {
            offset: 0,
            credits: 0,
            weight: 0
          };
        }
        const typeImpact = calculateImpact({ [type]: data });
        wasteTypeOffset[type].offset += typeImpact.carbonOffset;
        wasteTypeOffset[type].credits += typeImpact.potentialCredits;
        wasteTypeOffset[type].weight += data.weight || 0;
      });
    });

    // Calculate projected savings (simple linear projection)
    const monthlyOffsetArray = Object.entries(monthlyOffset)
      .map(([month, offset]) => ({
        month,
        offset
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    let projectedSavings = 0;
    if (monthlyOffsetArray.length > 0) {
      const avgMonthlyOffset = monthlyOffsetArray.reduce((sum, item) => sum + item.offset, 0) / monthlyOffsetArray.length;
      projectedSavings = avgMonthlyOffset * 12; // Annual projection
    }

    // Calculate carbon efficiency (offset per kg of waste)
    const totalWeight = Object.values(wasteTypeOffset).reduce((sum, type) => sum + type.weight, 0);
    const carbonEfficiency = totalWeight > 0 ? totalCarbonOffset / totalWeight : 0;

    // Update carbon stats
    setCarbonStats({
      totalOffset: totalCarbonOffset,
      potentialCredits: totalPotentialCredits,
      monthlyOffset: monthlyOffsetArray,
      wasteTypeOffset: Object.entries(wasteTypeOffset).map(([type, data]) => ({
        type,
        ...data
      })),
      projectedSavings,
      carbonEfficiency
    });

    // Update stats state with all calculated data
    setStats({
      totalImpact,
      wasteTypes: Object.entries(wasteTypes).map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        ...data
      })),
      locations,
      monthlyTrends: Object.values(monthlyData),
      bankPerformance
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{error}</h3>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Header with Indonesian Language */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                <LeafyGreen className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Laporan Dampak Lingkungan</h1>
                <p className="text-sm text-gray-500">
                  Analisis lengkap pengelolaan sampah dan pengurangan emisi karbon
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-44"
              >
                <option value="month">Bulan Ini</option>
                <option value="quarter">3 Bulan Terakhir</option>
                <option value="year">Tahun Ini</option>
                <option value="all">Semua Waktu</option>
              </Select>
            </div>
          </div>

          {/* Explanation Panel for Users */}
          <div className="p-4 mb-6 text-blue-700 border border-blue-100 rounded-lg bg-blue-50">
            <h3 className="mb-2 text-lg font-medium">Panduan Membaca Laporan:</h3>
            <ul className="ml-4 text-sm list-disc">
              <li className="mb-1">Laporan ini menampilkan dampak positif dari pengelolaan sampah terhadap lingkungan</li>
              <li className="mb-1">Karbon (CO₂e): Jumlah gas rumah kaca yang berhasil dikurangi</li>
              <li className="mb-1">1 ton karbon ≈ Emisi dari 1 mobil selama 3 bulan</li>
              <li className="mb-1">Klik pada grafik untuk melihat detail lebih lanjut</li>
            </ul>
          </div>

          {/* Carbon Offset Overview in Indonesian */}
          <div className="grid grid-cols-1 gap-4 mb-8 lg:grid-cols-4">
            <div className="p-6 text-white bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Recycle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Total Pengurangan Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold">
                {Math.round(carbonStats.totalOffset)} ton CO₂e
              </p>
              <p className="text-emerald-100">
                Setara dengan {Math.round(carbonStats.totalOffset * 0.2)} mobil tidak beroperasi
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Kredit Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.potentialCredits.toFixed(1)} kredit
              </p>
              <p className="text-sm text-gray-500">
                Potensi nilai kredit karbon yang bisa dijual
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Efisiensi Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.carbonEfficiency.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                Ton CO₂e per ton sampah yang dikelola
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Proyeksi Tahunan</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {Math.round(carbonStats.projectedSavings)} ton
              </p>
              <p className="text-sm text-gray-500">
                Perkiraan pengurangan karbon per tahun
              </p>
            </div>
          </div>

          {/* Stats Grid in Indonesian */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Recycle}
              label="Dampak Karbon"
              value={`${Math.round(stats.totalImpact.carbon)} kg CO₂e`}
              subValue="Total emisi yang berhasil dicegah"
            />
            <StatCard
              icon={TreesIcon}
              label="Pohon Terselamatkan"
              value={`${Math.round(stats.totalImpact.trees)} pohon`}
              subValue="Setara pohon yang tidak ditebang"
            />
            <StatCard
              icon={DropletIcon}
              label="Air Terhemat"
              value={`${Math.round(stats.totalImpact.water / 1000)} m³`}
              subValue="Air yang berhasil dihemat"
            />
            <StatCard
              icon={Building2}
              label="Bank Sampah Aktif"
              value={wasteBanks.length}
              subValue={`${pickupData.length} total pengambilan sampah`}
            />
          </div>

          {/* Map and Charts Grid in Indonesian */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Map Container with Instructions */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm lg:col-span-2 rounded-xl">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-800">Peta Sebaran Bank Sampah</h3>
                <p className="text-xs text-gray-500">Lingkaran menunjukkan volume sampah yang telah dikumpulkan. Klik pada titik untuk melihat detail.</p>
              </div>
              <div className="relative h-[450px]">
                <MapContainer 
                  center={mapCenter} 
                  zoom={13} 
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {stats.locations.map((location) => {
                    if (!location.coordinates?.lat || !location.coordinates?.lng) return null;
                    
                    const radius = Math.min(Math.max(location.stats.totalWeight * 500, 500), 2000);
                    
                    return (
                      <React.Fragment key={location.id}>
                        <Circle
                          center={[location.coordinates.lat, location.coordinates.lng]}
                          radius={radius}
                          pathOptions={{
                            color: '#059669',
                            fillColor: '#059669',
                            fillOpacity: 0.2
                          }}
                        />
                        <Marker
                          position={[location.coordinates.lat, location.coordinates.lng]}
                          icon={L.divIcon({
                            className: 'custom-marker-icon',
                            html: `<div class="w-8 h-8 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center">
                              <div class="w-4 h-4 rounded-full bg-emerald-500"></div>
                            </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 32]
                          })}
                        >
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-medium text-gray-900">
                                {location.name}
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {location.address}, {location.city}
                              </p>
                              <div className="pt-2 mt-2 border-t border-gray-200">
                                <p className="text-sm font-medium text-emerald-600">
                                  Rp {Math.round(location.stats.totalValue).toLocaleString('id')} nilai ekonomi
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.stats.totalWeight.toFixed(1)} kg sampah terkumpul
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.stats.transactions} transaksi selesai
                                </p>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            {/* Top Performers List in Indonesian */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Bank Sampah Terbaik
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Daftar bank sampah dengan kinerja terbaik berdasarkan nilai ekonomi yang dihasilkan
              </p>
              <div className="space-y-4 overflow-y-auto max-h-[300px]">
                {stats.bankPerformance.small.topPerformers
                  .concat(stats.bankPerformance.master.topPerformers)
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .slice(0, 5)
                  .map((location, index) => (
                    <div 
                      key={location.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100">
                        <span className="text-sm font-medium text-emerald-700">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {location.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {location.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">
                          Rp {Math.round(location.totalValue).toLocaleString('id')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {location.transactions} transaksi
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Charts Row in Indonesian */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Monthly Trends */}
            <ChartCard 
              title="Tren Dampak Bulanan" 
              description="Berat sampah terkumpul dan dampak karbon per bulan"
            >
              <div className="p-4 mb-2 text-xs text-gray-600 rounded-lg bg-gray-50">
                <p className="font-medium">Cara Membaca Grafik ini:</p>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Batang hijau: Berat sampah yang dikumpulkan (kg)</li>
                  <li>Batang ungu: Jumlah karbon yang dikurangi (kg CO₂e)</li>
                  <li>Semakin tinggi batang, semakin besar dampak positifnya</li>
                </ul>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#71717A"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value} kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value} CO₂e`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'weight') return [`${value.toFixed(1)} kg`, 'Berat Sampah'];
                        return [`${value.toFixed(1)} kg CO₂e`, 'Dampak Karbon'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="weight" fill="#10B981" name="weight" />
                    <Bar yAxisId="right" dataKey="impact" fill="#6366F1" name="impact" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution with Scrollable List */}
            <ChartCard 
              title="Dampak per Jenis Sampah" 
              description="Kontribusi pengurangan karbon berdasarkan jenis sampah"
            >
              <div className="p-4 mb-2 text-xs text-gray-600 rounded-lg bg-gray-50">
                <p className="font-medium">Cara Membaca Grafik ini:</p>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Grafik menunjukkan persentase kontribusi masing-masing jenis sampah</li>
                  <li>Semakin besar bagian, semakin besar kontribusi terhadap pengurangan karbon</li>
                  <li>Daftar di bawah grafik menunjukkan detail nilai untuk setiap jenis sampah</li>
                </ul>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.wasteTypes}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="impact"
                    >
                      {stats.wasteTypes.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(1)} kg CO₂e`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 overflow-y-auto max-h-[150px] pr-2">
                <p className="mb-2 text-sm font-medium text-gray-700">Rincian per Jenis Sampah:</p>
                <div className="space-y-3">
                  {stats.wasteTypes.map((type, index) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {Math.round(type.impact)} kg CO₂e
                        </p>
                        <p className="text-xs text-gray-500">
                          {type.weight.toFixed(1)} kg terkumpul
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Environmental Impact Summary in Indonesian */}
          <div className="p-6 border bg-emerald-50 rounded-xl border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TreesIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Ringkasan Dampak Lingkungan</h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Total dampak lingkungan positif dari kegiatan pengelolaan sampah:
                </p>
                <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Pengurangan Karbon</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.carbon)} kg CO₂e
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">emisi yang tercegah</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TreesIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Pohon Terselamatkan</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.trees)} pohon
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">setara pohon yang dilindungi</p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <DropletIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Air Terhemat</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.water / 1000)} m³
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">air yang dihemat</p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Tempat Pembuangan</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {stats.totalImpact.landfill.toFixed(1)} m³
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">ruang TPA yang dihemat</p>
                  </div>
                </div>

                <div className="p-4 mt-4 border rounded-lg border-emerald-200 bg-white/70">
                  <h4 className="font-medium text-emerald-800">Apa artinya angka-angka ini?</h4>
                  <ul className="mt-2 ml-4 text-sm list-disc text-emerald-700">
                    <li>Pengurangan {Math.round(stats.totalImpact.carbon)} kg CO₂e setara dengan {Math.round(stats.totalImpact.carbon/150)} orang tidak menggunakan kendaraan bermotor selama sebulan</li>
                    <li>{Math.round(stats.totalImpact.trees)} pohon yang terselamatkan dapat menyerap polusi untuk sekitar {Math.round(stats.totalImpact.trees*5)} orang</li>
                    <li>Air yang dihemat ({Math.round(stats.totalImpact.water / 1000)} m³) setara dengan kebutuhan {Math.round((stats.totalImpact.water / 1000) / 0.15)} orang untuk mandi selama sebulan</li>
                    <li>Ruang TPA yang dihemat ({stats.totalImpact.landfill.toFixed(1)} m³) setara dengan volume {Math.round(stats.totalImpact.landfill / 0.5)} mobil</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WastebankReports;