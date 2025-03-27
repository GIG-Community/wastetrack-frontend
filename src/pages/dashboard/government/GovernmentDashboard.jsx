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
  TrendingUp,
  Scale,
  Target,
  AlertTriangle,
  Activity,
  FileCheck,
  Users,
  Package,
  MapPin,
  Calendar,
  Download,
  ChevronRight,
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(1);
};

// Base Components
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

const AlertCard = ({ type, title, description, action }) => {
  const colors = {
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FileCheck },
    error: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
  };
  const style = colors[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${style.text}`} />
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${style.text}`}>{title}</h4>
          <p className={`text-sm mt-1 ${style.text} opacity-90`}>{description}</p>
        </div>
        {action && (
          <button className={`${style.text} hover:opacity-80`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const GovernmentDashboard = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    summary: {
      totalWasteBanks: 0,
      totalVolume: 0,
      complianceRate: 0,
      activeCollectors: 0,
    },
    alerts: [],
    trends: [],
    distribution: [],
    compliance: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch waste banks and pickups
        const [wasteBankSnapshot, pickupsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'users'))),
          getDocs(query(collection(db, 'pickups'))),
        ]);

        const wasteBankData = wasteBankSnapshot.docs
          .filter(doc => doc.data().role === 'wastebank_admin')
          .map(doc => ({ id: doc.id, ...doc.data() }));

        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(pickup => pickup.status === 'completed');

        // Process monthly trends
        const monthlyData = {};
        pickupsData.forEach(pickup => {
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: date.toLocaleString('default', { month: 'short' }),
              volume: 0,
              pickups: 0,
              wasteBanks: new Set(),
            };
          }

          monthlyData[monthKey].pickups++;
          monthlyData[monthKey].wasteBanks.add(pickup.wasteBankId);
          Object.values(pickup.wastes).forEach(waste => {
            monthlyData[monthKey].volume += waste.weight || 0;
          });
        });

        // Calculate waste type distribution
        const wasteTypes = {};
        let totalVolume = 0;

        pickupsData.forEach(pickup => {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            if (!wasteTypes[type]) {
              wasteTypes[type] = { type, volume: 0 };
            }
            wasteTypes[type].volume += data.weight || 0;
            totalVolume += data.weight || 0;
          });
        });

        // Check compliance and generate alerts
        const alerts = [];
        const now = new Date();
        wasteBankData.forEach(bank => {
          const bankPickups = pickupsData.filter(p => p.wasteBankId === bank.id);
          const lastPickup = bankPickups[bankPickups.length - 1];
          
          if (lastPickup) {
            const lastPickupDate = new Date(lastPickup.completedAt.seconds * 1000);
            const daysSinceLastPickup = Math.floor((now - lastPickupDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastPickup > 7) {
              alerts.push({
                type: 'warning',
                title: 'Inactive Waste Bank',
                description: `${bank.profile?.institution} hasn't processed waste in ${daysSinceLastPickup} days`,
                wasteBankId: bank.id,
              });
            }
          }
        });

        // Calculate compliance rate
        const activeWasteBanks = new Set(pickupsData.map(p => p.wasteBankId)).size;
        const complianceRate = (activeWasteBanks / wasteBankData.length) * 100;

        // Calculate unique collectors
        const activeCollectors = new Set(pickupsData.map(p => p.collectorId)).size;

        setData({
          summary: {
            totalWasteBanks: wasteBankData.length,
            totalVolume,
            complianceRate,
            activeCollectors,
          },
          alerts,
          trends: Object.values(monthlyData),
          distribution: Object.values(wasteTypes),
          waste_banks: wasteBankData,
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
                <Building2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Government Dashboard</h1>
                <p className="text-sm text-gray-500">Waste Management System Overview</p>
              </div>
            </div>

            <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg 
              hover:bg-emerald-600 transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Building2}
              label="Waste Banks"
              value={data.summary.totalWasteBanks}
              subValue="Registered facilities"
            />
            <StatCard
              icon={Scale}
              label="Total Volume"
              value={`${formatNumber(data.summary.totalVolume)} kg`}
              trend={12.5}
            />
            <StatCard
              icon={Target}
              label="Compliance Rate"
              value={`${Math.round(data.summary.complianceRate)}%`}
              subValue="Active facilities"
            />
            <StatCard
              icon={Users}
              label="Active Collectors"
              value={data.summary.activeCollectors}
              trend={8.3}
            />
          </div>

          {/* Alerts Section */}
          {data.alerts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Alerts & Notifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.alerts.map((alert, index) => (
                  <AlertCard
                    key={index}
                    type={alert.type}
                    title={alert.title}
                    description={alert.description}
                    action={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Volume Trends */}
            <ChartCard
              title="Collection Trends"
              description="Monthly waste collection volume and facility participation"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}K kg`}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                      name="Volume"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Distribution */}
            <ChartCard
              title="Waste Type Distribution"
              description="Volume distribution by waste category"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="volume"
                    >
                      {data.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Facility Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Facility</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Location</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Volume</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.waste_banks.slice(0, 5).map((bank) => (
                    <tr key={bank.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg">
                            <Building2 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {bank.profile?.institution || 'Unnamed Facility'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {bank.location?.city || 'Unknown Location'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatNumber(bank.stats?.totalWeight || 0)} kg
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {bank.stats?.lastPickup ? 
                          new Date(bank.stats.lastPickup.seconds * 1000).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GovernmentDashboard;