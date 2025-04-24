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
import { collection, query, getDocs, where } from 'firebase/firestore';
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
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch waste banks (small banks)
        const wasteBankQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin')
        );
        const wasteBankSnapshot = await getDocs(wasteBankQuery);
        const wasteBankData = wasteBankSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWasteBanks(wasteBankData);

        // Fetch master waste banks
        const masterBankQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_master')
        );
        const masterBankSnapshot = await getDocs(masterBankQuery);
        const masterBankData = masterBankSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMasterBanks(masterBankData);

        // Fetch pickups for small waste banks
        const pickupsQuery = query(collection(db, 'pickups'));
        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(pickup => pickup.status === 'completed');
        setPickupData(pickupsData);

        // Fetch master bank requests
        const masterRequestsQuery = query(collection(db, 'masterBankRequests'));
        const masterRequestsSnapshot = await getDocs(masterRequestsQuery);
        const masterRequestsData = masterRequestsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(request => request.status === 'completed');
        setMasterRequests(masterRequestsData);

        // Calculate statistics with all data
        calculateStatistics(wasteBankData, masterBankData, pickupsData, masterRequestsData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
          {/* Enhanced Header with Carbon Offset Focus */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                <LeafyGreen className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Carbon Offset & Environmental Impact</h1>
                <p className="text-sm text-gray-500">
                  Comprehensive analysis of waste management and carbon reduction
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-44"
              >
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </Select>
            </div>
          </div>

          {/* Carbon Offset Overview */}
          <div className="grid grid-cols-1 gap-4 mb-8 lg:grid-cols-4">
            <div className="p-6 text-white bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Recycle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Total Carbon Offset</h3>
              </div>
              <p className="mb-2 text-3xl font-bold">
                {Math.round(carbonStats.totalOffset)} tons CO₂e
              </p>
              <p className="text-emerald-100">
                Equivalent to {Math.round(carbonStats.totalOffset * 0.2)} cars off the road
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Carbon Credits</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.potentialCredits.toFixed(1)} credits
              </p>
              <p className="text-sm text-gray-500">
                Potential carbon credit value
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Carbon Efficiency</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.carbonEfficiency.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                Tons CO₂e offset per ton of waste
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Projected Annual</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {Math.round(carbonStats.projectedSavings)} tons
              </p>
              <p className="text-sm text-gray-500">
                Estimated annual carbon offset
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Recycle}
              label="Carbon Impact"
              value={`${Math.round(stats.totalImpact.carbon)} kg CO₂e`}
              subValue="Total emissions prevented"
            />
            <StatCard
              icon={TreesIcon}
              label="Trees Preserved"
              value={`${Math.round(stats.totalImpact.trees)} trees`}
              subValue="Equivalent preservation"
            />
            <StatCard
              icon={DropletIcon}
              label="Water Saved"
              value={`${Math.round(stats.totalImpact.water / 1000)} m³`}
              subValue="Water conservation impact"
            />
            <StatCard
              icon={Building2}
              label="Active Waste Banks"
              value={wasteBanks.length}
              subValue={`${pickupData.length} total pickups processed`}
            />
          </div>

          {/* Map and Charts Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Map Container */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm lg:col-span-2 rounded-xl">
              <div className="relative h-[500px]">
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
                                  {Math.round(location.stats.totalValue)} currency value
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.stats.totalWeight.toFixed(1)} kg waste collected
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.stats.transactions} transactions completed
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

            {/* Top Performers List */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Top Performing Locations
              </h2>
              <div className="space-y-4">
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
                          {Math.round(location.totalValue)} currency value
                        </p>
                        <p className="text-xs text-gray-500">
                          {location.transactions} transactions
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Monthly Trends */}
            <ChartCard 
              title="Monthly Impact Trends" 
              description="Weight collected and carbon impact by month"
            >
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
                        if (name === 'weight') return [`${value.toFixed(1)} kg`, 'Weight'];
                        return [`${value.toFixed(1)} kg CO₂e`, 'Carbon Impact'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="weight" fill="#10B981" name="weight" />
                    <Bar yAxisId="right" dataKey="impact" fill="#6366F1" name="impact" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution */}
            <ChartCard 
              title="Impact by Waste Type" 
              description="Carbon offset contribution by material type"
            >
              <div className="h-[300px]">
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

              <div className="mt-6 space-y-3">
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
                        {type.weight.toFixed(1)} kg collected
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Environmental Impact Summary */}
          <div className="p-6 border bg-emerald-50 rounded-xl border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TreesIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Environmental Impact Summary</h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Total environmental impact from waste management activities:
                </p>
                <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Carbon Offset</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.carbon)} kg CO₂e
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">emissions prevented</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TreesIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Trees Preserved</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.trees)} trees
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">equivalent preserved</p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <DropletIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Water Saved</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.water / 1000)} m³
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">water preserved</p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Landfill Reduced</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {stats.totalImpact.landfill.toFixed(1)} m³
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">landfill space saved</p>
                  </div>
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