import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Activity,
  PieChart as PieChartIcon,
  BarChart2,
  Repeat2,
  Droplet,
  Trees,
  Package,
  Target,
  Building2,
} from 'lucide-react';

// Constants for calculations
const IMPACT_FACTORS = {
  organic: { carbon: 0.5, water: 1000 },
  plastic: { carbon: 2.5, water: 2000 },
  paper: { carbon: 1.5, water: 1500 },
  metal: { carbon: 5.0, water: 3000 }
};

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(1);
};

// Card Components
const StatCard = ({ icon: Icon, label, value, trend, subValue }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-start justify-between">
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
      {trend && (
        <div className={`px-2.5 py-1.5 rounded-lg text-sm font-medium
          ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, description, children }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200">
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const IndustryDashboard = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    monthlyData: [],
    wasteTypes: [],
    impactMetrics: {
      totalWeight: 0,
      totalValue: 0,
      carbonOffset: 0,
      waterSaved: 0,
      activeWasteBanks: 0,
      pickupCount: 0,
    },
    wasteDistribution: [],
    performanceMetrics: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch pickups
        const pickupsQuery = query(collection(db, 'pickups'));
        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(pickup => pickup.status === 'completed');

        // Process monthly trends
        const monthlyStats = {};
        pickupsData.forEach(pickup => {
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
              month: date.toLocaleString('default', { month: 'short' }),
              weight: 0,
              value: 0,
              carbon: 0,
              water: 0,
            };
          }

          Object.entries(pickup.wastes).forEach(([type, data]) => {
            monthlyStats[monthKey].weight += data.weight || 0;
            monthlyStats[monthKey].value += data.value || 0;
            if (IMPACT_FACTORS[type]) {
              monthlyStats[monthKey].carbon += (data.weight || 0) * IMPACT_FACTORS[type].carbon;
              monthlyStats[monthKey].water += (data.weight || 0) * IMPACT_FACTORS[type].water;
            }
          });
        });

        // Calculate waste type distribution
        const wasteTypes = {};
        let totalWeight = 0;
        let totalValue = 0;
        let totalCarbon = 0;
        let totalWater = 0;

        pickupsData.forEach(pickup => {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            if (!wasteTypes[type]) {
              wasteTypes[type] = { weight: 0, value: 0 };
            }
            wasteTypes[type].weight += data.weight || 0;
            wasteTypes[type].value += data.value || 0;
            totalWeight += data.weight || 0;
            totalValue += data.value || 0;
            if (IMPACT_FACTORS[type]) {
              totalCarbon += (data.weight || 0) * IMPACT_FACTORS[type].carbon;
              totalWater += (data.weight || 0) * IMPACT_FACTORS[type].water;
            }
          });
        });

        // Get unique waste banks
        const activeWasteBanks = new Set(pickupsData.map(p => p.wasteBankId)).size;

        // Calculate month-over-month growth
        const sortedMonths = Object.values(monthlyStats).sort((a, b) => 
          new Date(b.month) - new Date(a.month));
        const currentMonth = sortedMonths[0]?.weight || 0;
        const lastMonth = sortedMonths[1]?.weight || 0;
        const growth = lastMonth ? ((currentMonth - lastMonth) / lastMonth * 100) : 0;

        setData({
          monthlyData: Object.values(monthlyStats),
          wasteTypes: Object.entries(wasteTypes).map(([type, data]) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            weight: data.weight,
            value: data.value,
          })),
          impactMetrics: {
            totalWeight,
            totalValue,
            carbonOffset: totalCarbon,
            waterSaved: totalWater,
            activeWasteBanks,
            pickupCount: pickupsData.length,
            growth,
          },
          performanceMetrics: [
            { subject: 'Collection Rate', A: 85, fullMark: 100 },
            { subject: 'Processing Time', A: 92, fullMark: 100 },
            { subject: 'Sorting Accuracy', A: 88, fullMark: 100 },
            { subject: 'Customer Satisfaction', A: 95, fullMark: 100 },
            { subject: 'Environmental Impact', A: 89, fullMark: 100 },
          ],
        });

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
                <BarChart2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Industry Dashboard</h1>
                <p className="text-sm text-gray-500">Track and analyze waste management performance</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={TrendingUp}
              label="Total Collection"
              value={`${formatNumber(data.impactMetrics.totalWeight)} kg`}
              trend={data.impactMetrics.growth}
              subValue="Month over month growth"
            />
            <StatCard
              icon={Activity}
              label="Revenue Generated"
              value={`Rp ${formatNumber(data.impactMetrics.totalValue)}`}
              subValue={`${data.impactMetrics.pickupCount} successful pickups`}
            />
            <StatCard
              icon={Building2}
              label="Active Waste Banks"
              value={data.impactMetrics.activeWasteBanks}
              subValue="Currently operating"
            />
            <StatCard
              icon={Target}
              label="Collection Rate"
              value="92%"
              trend={5.2}
              subValue="Target achievement"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Trends */}
            <ChartCard 
              title="Monthly Collection Trends" 
              description="Weight collected and revenue generated by month"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `Rp ${formatNumber(value)}`}
                    />
                    <Tooltip />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.2}
                      name="Weight"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366F1" 
                      fill="#6366F1" 
                      fillOpacity={0.2}
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Performance Metrics */}
            <ChartCard
              title="Performance Metrics"
              description="Key performance indicators across different metrics"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.performanceMetrics}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="subject" fontSize={12} stroke="#6B7280" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={12} stroke="#6B7280" />
                    <Radar
                      name="Performance"
                      dataKey="A"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Bottom Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waste Distribution */}
            <ChartCard
              title="Waste Distribution"
              description="Distribution of different waste types by weight"
            >
              <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.wasteTypes}
                    dataKey="weight"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      name
                    }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {data.wasteTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Environmental Impact */}
          <ChartCard
            title="Environmental Impact"
            description="Carbon offset and water savings from waste management"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(value) => `${formatNumber(value)} kg`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(value) => `${formatNumber(value)} L`}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="carbon"
                    name="Carbon Offset"
                    fill="#10B981"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="water"
                    name="Water Saved"
                    fill="#3B82F6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Environmental Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <StatCard
            icon={Trees}
            label="Carbon Offset"
            value={`${formatNumber(data.impactMetrics.carbonOffset)} kg`}
            subValue="CO₂ equivalent"
          />
          <StatCard
            icon={Droplet}
            label="Water Saved"
            value={`${formatNumber(data.impactMetrics.waterSaved)} L`}
            subValue="Through recycling"
          />
        </div>
      </div>
    </main>
  </div>
  );
};

export default IndustryDashboard;