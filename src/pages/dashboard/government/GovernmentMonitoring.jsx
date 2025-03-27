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
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  Building2,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Scale,
  ChevronRight,
  BarChart2,
  Filter,
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];
const COMPLIANCE_LEVELS = {
  HIGH: { color: '#10B981', label: 'High Compliance' },
  MEDIUM: { color: '#F59E0B', label: 'Medium Compliance' },
  LOW: { color: '#EF4444', label: 'Low Compliance' },
};

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(1);
};

// Card Components
const StatCard = ({ icon: Icon, label, value, trend, subValue, color = "emerald" }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
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

const WasteBankCard = ({ wasteBank, onSelect }) => {
  const complianceScore = wasteBank.complianceScore || 0;
  let compliance = 'LOW';
  if (complianceScore >= 90) compliance = 'HIGH';
  else if (complianceScore >= 70) compliance = 'MEDIUM';

  return (
    <div 
      onClick={() => onSelect(wasteBank)}
      className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-emerald-500 
        hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Building2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {wasteBank.profile?.institution || 'Unnamed Waste Bank'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {wasteBank.location?.address || 'No address provided'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium
          ${compliance === 'HIGH' ? 'bg-emerald-50 text-emerald-700' : 
          compliance === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'}`}>
          {COMPLIANCE_LEVELS[compliance].label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-600">Total Volume</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {formatNumber(wasteBank.stats?.totalWeight || 0)} kg
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-600">Pickups</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {wasteBank.stats?.totalPickups || 0}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-600">Last Active</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {wasteBank.stats?.lastPickup ? 
              new Date(wasteBank.stats.lastPickup.seconds * 1000).toLocaleDateString() : 
              'Never'}
          </p>
        </div>
      </div>
    </div>
  );
};

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

const GovernmentMonitoring = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWasteBank, setSelectedWasteBank] = useState(null);
  const [data, setData] = useState({
    wasteBanks: [],
    complianceStats: {
      high: 0,
      medium: 0,
      low: 0,
    },
    totalVolume: 0,
    totalPickups: 0,
    monthlyData: [],
  });

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

        // Fetch pickups
        const pickupsQuery = query(collection(db, 'pickups'));
        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(pickup => pickup.status === 'completed');

        // Calculate waste bank statistics and compliance
        const wasteBanksWithStats = wasteBankData.map(bank => {
          const bankPickups = pickupsData.filter(pickup => pickup.wasteBankId === bank.id);
          const lastPickup = bankPickups.length > 0 ? 
            bankPickups.reduce((latest, pickup) => 
              pickup.completedAt.seconds > latest.completedAt.seconds ? pickup : latest
            ) : null;

          // Calculate compliance score based on various factors
          const pickupFrequency = bankPickups.length / 30; // pickups per day
          const avgWeight = bankPickups.reduce((sum, pickup) => 
            sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0
          ) / (bankPickups.length || 1);
          
          const complianceScore = Math.min(
            ((pickupFrequency * 50) + (avgWeight > 100 ? 50 : avgWeight / 2)), 
            100
          );

          const stats = {
            totalPickups: bankPickups.length,
            totalWeight: bankPickups.reduce((sum, pickup) => 
              sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0),
            lastPickup: lastPickup?.completedAt,
            complianceScore,
          };

          return { ...bank, stats };
        });

        // Calculate compliance distribution
        const complianceStats = wasteBanksWithStats.reduce((acc, bank) => {
          const score = bank.stats?.complianceScore || 0;
          if (score >= 90) acc.high++;
          else if (score >= 70) acc.medium++;
          else acc.low++;
          return acc;
        }, { high: 0, medium: 0, low: 0 });

        // Calculate monthly trends
        const monthlyStats = {};
        pickupsData.forEach(pickup => {
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
              month: date.toLocaleString('default', { month: 'short' }),
              weight: 0,
              pickups: 0,
              compliance: 0,
            };
          }

          monthlyStats[monthKey].pickups++;
          Object.values(pickup.wastes).forEach(waste => {
            monthlyStats[monthKey].weight += waste.weight || 0;
          });
        });

        setData({
          wasteBanks: wasteBanksWithStats,
          complianceStats,
          totalVolume: wasteBanksWithStats.reduce((sum, bank) => sum + (bank.stats?.totalWeight || 0), 0),
          totalPickups: pickupsData.length,
          monthlyData: Object.values(monthlyStats),
        });

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredWasteBanks = data.wasteBanks.filter(bank =>
    bank.profile?.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <Activity className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Waste Bank Monitoring</h1>
                <p className="text-sm text-gray-500">Monitor and analyze waste bank performance</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Building2}
              label="Registered Waste Banks"
              value={data.wasteBanks.length}
              subValue={`${data.complianceStats.high} high compliance`}
            />
            <StatCard
              icon={Scale}
              label="Total Volume Processed"
              value={`${formatNumber(data.totalVolume)} kg`}
              trend={12.5}
            />
            <StatCard
              icon={Activity}
              label="Compliance Rate"
              value={`${Math.round((data.complianceStats.high + data.complianceStats.medium) / 
                data.wasteBanks.length * 100)}%`}
              color="blue"
            />
            <StatCard
              icon={AlertTriangle}
              label="At Risk Facilities"
              value={data.complianceStats.low}
              subValue="Low compliance score"
              color="red"
            />
          </div>

          {/* Compliance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <ChartCard
              title="Compliance Distribution"
              description="Distribution of waste banks by compliance level"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'High Compliance', value: data.complianceStats.high },
                        { name: 'Medium Compliance', value: data.complianceStats.medium },
                        { name: 'Low Compliance', value: data.complianceStats.low },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
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
                        return percent > 0 ? (
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
                        ) : null;
                      }}
                    >
                      {[COMPLIANCE_LEVELS.HIGH.color, COMPLIANCE_LEVELS.MEDIUM.color, COMPLIANCE_LEVELS.LOW.color]
                        .map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Monthly Activity */}
            <ChartCard 
              title="Monthly Activity"
              description="Volume collected and number of pickups by month"
              className="lg:col-span-2"
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
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="weight"
                      name="Volume"
                      fill="#10B981"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="pickups"
                      name="Pickups"
                      fill="#6366F1"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Waste Bank List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Waste Bank Facilities</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search waste banks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredWasteBanks.map(wasteBank => (
                <WasteBankCard
                  key={wasteBank.id}
                  wasteBank={wasteBank}
                  onSelect={setSelectedWasteBank}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GovernmentMonitoring;