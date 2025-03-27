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
  Factory,
  Scale,
  HelpCircle,
  Target,
  Download,
  Calendar,
  Recycle,
  DropletIcon
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

// Area potential criteria
const AREA_CRITERIA = {
  HIGH: {
    color: '#10B981', // emerald-500
    minWeight: 1000,   // kg per month
    minDensity: 5,     // pickups per km²
    description: 'High potential industrial area'
  },
  MEDIUM: {
    color: '#F59E0B', // amber-500
    minWeight: 500,
    minDensity: 3,
    description: 'Medium potential area'
  },
  LOW: {
    color: '#EF4444', // red-500
    minWeight: 100,
    minDensity: 1,
    description: 'Emerging opportunity area'
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

const OffsetPlannerIndustry = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickupData, setPickupData] = useState([]);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [mapCenter] = useState([-7.2575, 112.7521]); // Default: Surabaya
  const [dateRange, setDateRange] = useState('month');
  const [selectedArea, setSelectedArea] = useState(null);
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
    opportunities: []
  });

  // Calculate impact for a given set of wastes
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

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Analyze area potential
  const analyzeArea = (center, radius = 2) => {
    const pickupsInArea = pickupData.filter(pickup => {
      if (!pickup?.coordinates?.lat || !pickup?.coordinates?.lng) return false;
      
      const distance = calculateDistance(
        center.lat,
        center.lng,
        pickup.coordinates.lat,
        pickup.coordinates.lng
      );
      return distance <= radius;
    });

    const totalWeight = pickupsInArea.reduce((sum, pickup) => {
      return sum + Object.values(pickup.wastes || {})
        .reduce((w, waste) => w + (waste.weight || 0), 0);
    }, 0);

    const impact = pickupsInArea.reduce((acc, pickup) => {
      const pickupImpact = calculateImpact(pickup.wastes);
      return {
        carbon: acc.carbon + pickupImpact.carbon,
        water: acc.water + pickupImpact.water,
        trees: acc.trees + pickupImpact.trees,
        landfill: acc.landfill + pickupImpact.landfill
      };
    }, { carbon: 0, water: 0, trees: 0, landfill: 0 });

    const density = pickupsInArea.length / (Math.PI * radius * radius);
    const existingFacilities = new Set(
      pickupsInArea.map(p => p.wasteBankId)
    ).size;

    let potential = 'LOW';
    if (totalWeight >= AREA_CRITERIA.HIGH.minWeight && density >= AREA_CRITERIA.HIGH.minDensity) {
      potential = 'HIGH';
    } else if (totalWeight >= AREA_CRITERIA.MEDIUM.minWeight && density >= AREA_CRITERIA.MEDIUM.minDensity) {
      potential = 'MEDIUM';
    }

    return {
      center,
      stats: {
        totalWeight,
        density,
        existingFacilities,
        pickupCount: pickupsInArea.length,
        impact
      },
      potential
    };
  };

  // Find potential areas
  const findPotentialAreas = () => {
    const gridSize = 0.01; // roughly 1km
    const grid = {};

    pickupData.forEach(pickup => {
      if (!pickup.coordinates) return;
      
      const gridX = Math.floor(pickup.coordinates.lat / gridSize);
      const gridY = Math.floor(pickup.coordinates.lng / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!grid[key]) {
        grid[key] = {
          center: {
            lat: (gridX + 0.5) * gridSize,
            lng: (gridY + 0.5) * gridSize
          },
          pickups: []
        };
      }
      
      grid[key].pickups.push(pickup);
    });

    return Object.values(grid)
      .map(cell => analyzeArea(cell.center))
      .filter(area => area.stats.pickupCount > 0)
      .sort((a, b) => {
        const score = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return score[b.potential] - score[a.potential];
      });
  };

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

    // Find potential areas
    const opportunities = findPotentialAreas();

    setStats({
      totalImpact,
      wasteTypes: Object.entries(wasteTypes).map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        weight: data.weight,
        impact: data.impact
      })),
      locations: Object.values(locationStats),
      monthlyTrends: Object.values(monthlyData),
      opportunities
    });
  };

  // Fetch and process data
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
                <Factory className="w-6 h-6 text-emerald-500" />
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
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Factory}
              label="Potential Areas"
              value={stats.opportunities.length}
              subValue={`${stats.opportunities.filter(a => a.potential === 'HIGH').length} high potential`}
            />
            <StatCard
              icon={Recycle}
              label="Carbon Impact"
              value={`${Math.round(stats.totalImpact.carbon)} kg CO₂e`}
              subValue="Total emissions prevented"
            />
            <StatCard
              icon={Building2}
              label="Active Facilities"
              value={wasteBanks.length}
              subValue={`${pickupData.length} pickups processed`}
            />
            <StatCard
              icon={Target}
              label="Coverage"
              value={`${stats.opportunities.length} areas`}
              subValue="Analyzed for potential"
            />
          </div>

          {/* Map and Analysis Grid */}
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

                  {stats.opportunities.map((area, index) => (
                    <Circle
                      key={index}
                      center={[area.center.lat, area.center.lng]}
                      radius={2000}
                      pathOptions={{
                        color: AREA_CRITERIA[area.potential].color,
                        fillColor: AREA_CRITERIA[area.potential].color,
                        fillOpacity: 0.2
                      }}
                      eventHandlers={{
                        click: () => setSelectedArea(area)
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-medium text-gray-900">
                            {area.potential} Potential Area
                          </h3>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Monthly Volume:</span>{' '}
                              {Math.round(area.stats.totalWeight)} kg
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Impact:</span>{' '}
                              {Math.round(area.stats.impact.carbon)} kg CO₂e
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Density:</span>{' '}
                              {Math.round(area.stats.density)} pickups/km²
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  ))}

                  {wasteBanks.map((bank) => {
                    if (!bank?.location?.coordinates?.lat || !bank?.location?.coordinates?.lng) {
                      return null;
                    }

                    return (
                      <Marker
                        key={bank.id}
                        position={[bank.location.coordinates.lat, bank.location.coordinates.lng]}
                        icon={L.divIcon({
                          className: 'custom-marker-icon',
                          html: `<div class="w-8 h-8 rounded-full bg-blue-100 border-4 border-blue-500 flex items-center justify-center">
                            <div class="w-4 h-4 rounded-full bg-blue-500"></div>
                          </div>`,
                          iconSize: [32, 32],
                          iconAnchor: [16, 32]
                        })}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-medium text-gray-900">
                              {bank.profile?.institution || 'Unknown Facility'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {bank.location?.address || 'No address'}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            {/* Area Analysis Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  Area Analysis
                  <InfoTooltip>Areas are evaluated based on waste volume and pickup density</InfoTooltip>
                </h2>
                <div className="space-y-4">
                  

                {Object.entries(AREA_CRITERIA).map(([level, criteria], index) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: criteria.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{level} Potential</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {criteria.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          Min: {criteria.minWeight}kg/month, {criteria.minDensity} pickups/km²
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
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

export default OffsetPlannerIndustry;