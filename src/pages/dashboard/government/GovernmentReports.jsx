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
import { collection, query, getDocs } from 'firebase/firestore';
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

// Environmental Impact Constants
const IMPACT_FACTORS = {
  organic: { 
    carbon: 0.5,    // kg CO2 saved per kg
    water: 1000,    // liters saved per kg
    landfill: 0.2   // m³ saved per kg
  },
  plastic: { 
    carbon: 2.5,    // kg CO2 saved per kg
    water: 2000,    // liters saved per kg
    landfill: 0.1,  // m³ saved per kg
    trees: 0.1      // trees saved per kg
  },
  paper: { 
    carbon: 1.5,    // kg CO2 saved per kg
    water: 1500,    // liters saved per kg
    landfill: 0.15, // m³ saved per kg
    trees: 0.2      // trees saved per kg
  },
  metal: { 
    carbon: 5.0,    // kg CO2 saved per kg
    water: 3000,    // liters saved per kg
    landfill: 0.05  // m³ saved per kg
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
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-emerald-50 rounded-lg">
        <Icon className="h-6 w-6 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
        {subValue && (
          <p className="text-sm text-gray-500 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, description, children }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200">
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <InfoTooltip>{description}</InfoTooltip>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="group relative inline-block">
    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg w-48 
      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800" />
    </div>
  </div>
);

const WastebankReports = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickupData, setPickupData] = useState([]);
  const [wasteBanks, setWasteBanks] = useState([]);
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
    monthlyTrends: []
  });

  // Calculate environmental impact
  const calculateImpact = (wastes = {}) => {
    let impact = {
      carbon: 0,
      water: 0,
      trees: 0,
      landfill: 0
    };

    Object.entries(wastes).forEach(([type, data]) => {
      const factors = IMPACT_FACTORS[type];
      if (factors && data.weight) {
        impact.carbon += factors.carbon * data.weight;
        impact.water += factors.water * data.weight;
        impact.landfill += factors.landfill * data.weight;
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
        // Fetch waste banks
        const wasteBankQuery = query(collection(db, 'users'));
        const wasteBankSnapshot = await getDocs(wasteBankQuery);
        const wasteBankData = wasteBankSnapshot.docs
          .filter(doc => doc.data().role === 'wastebank_admin')
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setWasteBanks(wasteBankData);

        // Fetch pickups
        const pickupsQuery = query(collection(db, 'pickups'));
        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(pickup => pickup.status === 'completed');
        setPickupData(pickupsData);

        // Calculate statistics
        calculateStatistics(wasteBankData, pickupsData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Calculate statistics
  const calculateStatistics = (wasteBanks, pickups) => {
    // Calculate total impact
    const totalImpact = pickups.reduce((acc, pickup) => {
      const impact = calculateImpact(pickup.wastes);
      return {
        carbon: acc.carbon + impact.carbon,
        water: acc.water + impact.water,
        trees: acc.trees + impact.trees,
        landfill: acc.landfill + impact.landfill
      };
    }, { carbon: 0, water: 0, trees: 0, landfill: 0 });

    // Calculate waste type distribution
    const wasteTypes = {};
    pickups.forEach(pickup => {
      Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
        if (!wasteTypes[type]) {
          wasteTypes[type] = { weight: 0, impact: 0 };
        }
        wasteTypes[type].weight += data.weight || 0;
        wasteTypes[type].impact += calculateImpact({ [type]: data }).carbon;
      });
    });

    // Calculate location statistics
    const locationStats = {};
    pickups.forEach(pickup => {
      if (!pickup.wasteBankId || !pickup.coordinates) return;

      if (!locationStats[pickup.wasteBankId]) {
        const bank = wasteBanks.find(wb => wb.id === pickup.wasteBankId);
        locationStats[pickup.wasteBankId] = {
          id: pickup.wasteBankId,
          name: bank?.profile?.institution || 'Unknown Bank',
          location: pickup.location || 'Unknown Location',
          coordinates: pickup.coordinates,
          totalWeight: 0,
          totalImpact: 0,
          pickupCount: 0
        };
      }

      const impact = calculateImpact(pickup.wastes);
      locationStats[pickup.wasteBankId].totalWeight += 
        Object.values(pickup.wastes || {}).reduce((sum, waste) => sum + (waste.weight || 0), 0);
      locationStats[pickup.wasteBankId].totalImpact += impact.carbon;
      locationStats[pickup.wasteBankId].pickupCount += 1;
    });

    // Monthly trends
    const monthlyData = {};
    pickups.forEach(pickup => {
      if (!pickup.completedAt) return;
      
      const date = new Date(pickup.completedAt.seconds * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleString('default', { month: 'short' }),
          weight: 0,
          impact: 0
        };
      }

      const impact = calculateImpact(pickup.wastes);
      monthlyData[monthKey].impact += impact.carbon;
      Object.values(pickup.wastes || {}).forEach(waste => {
        monthlyData[monthKey].weight += waste.weight || 0;
      });
    });

    setStats({
      totalImpact,
      wasteTypes: Object.entries(wasteTypes).map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        weight: data.weight,
        impact: data.impact
      })),
      locations: Object.values(locationStats),
      monthlyTrends: Object.values(monthlyData)
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
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

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <LeafyGreen className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Carbon Offset Planner</h1>
                <p className="text-sm text-gray-500">Analyze and optimize carbon offset potential</p>
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
              </Select>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Map Container */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="relative h-[500px]">
                <MapContainer 
                  center={mapCenter} 
                  zoom={13} 
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {stats.locations.map((location) => {
                    if (!location.coordinates) return null;
                    
                    const radius = Math.min(Math.max(location.totalImpact * 500, 500), 2000);
                    
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
                              <p className="text-sm text-gray-500 mt-1">
                                {location.location}
                              </p>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-sm text-emerald-600 font-medium">
                                  {Math.round(location.totalImpact)} kg CO₂e offset
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.totalWeight.toFixed(1)} kg waste collected
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.pickupCount} pickups completed
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Top Performing Locations
              </h2>
              <div className="space-y-4">
                {stats.locations
                  .sort((a, b) => b.totalImpact - a.totalImpact)
                  .slice(0, 5)
                  .map((location, index) => (
                    <div 
                      key={location.id}
                      className="p-4 bg-gray-50 rounded-lg flex items-center gap-4"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-emerald-700">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {location.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {location.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">
                          {Math.round(location.totalImpact)} kg CO₂e
                        </p>
                        <p className="text-xs text-gray-500">
                          {location.pickupCount} pickups
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TreesIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Environmental Impact Summary</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Total environmental impact from waste management activities:
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Carbon Offset</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.carbon)} kg CO₂e
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">emissions prevented</p>
                  </div>
                  
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TreesIcon className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Trees Preserved</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.trees)} trees
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">equivalent preserved</p>
                  </div>

                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DropletIcon className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Water Saved</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.water / 1000)} m³
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">water preserved</p>
                  </div>

                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Landfill Reduced</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {stats.totalImpact.landfill.toFixed(1)} m³
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">landfill space saved</p>
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