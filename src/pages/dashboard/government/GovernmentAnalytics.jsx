import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  LineChart,
  Line,
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
  ComposedChart,
  Area,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronDown,
  FileBarChart,
  Calendar,
  ArrowRight,
  Filter,
  Download,
  Signal,
  Target,
  Percent,
  Scale,
  Building2,
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Utility Components
const Select = ({ className = "", ...props }) => (
  <select
    className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      ${className}`}
    {...props}
  />
);

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

const ChartCard = ({ title, description, children, actions }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200">
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
    {children}
  </div>
);

const InsightCard = ({ icon: Icon, title, value, description, trend }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-emerald-50 rounded-lg">
        <Icon className="h-6 w-6 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <div className={`px-2 py-1 rounded-full text-xs font-medium
              ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
            <span className="text-sm text-gray-500">vs. last month</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const GovernmentAnalytics = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [data, setData] = useState({
    wasteBanks: [],
    pickups: [],
    analytics: {
      volume: [],
      compliance: [],
      performance: [],
      regional: [],
      insights: [],
    },
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

        // Process monthly data
        const monthlyData = {};
        pickupsData.forEach(pickup => {
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: date.toLocaleString('default', { month: 'short' }),
              volumeTotal: 0,
              pickupCount: 0,
              wasteBanks: new Set(),
              avgValue: 0,
            };
          }

          monthlyData[monthKey].pickupCount++;
          monthlyData[monthKey].wasteBanks.add(pickup.wasteBankId);
          monthlyData[monthKey].avgValue += pickup.totalValue;

          Object.values(pickup.wastes).forEach(waste => {
            monthlyData[monthKey].volumeTotal += waste.weight || 0;
          });
        });

        // Process regional data
        const regionalData = {};
        wasteBankData.forEach(bank => {
          const region = bank.location?.city || 'Unknown';
          if (!regionalData[region]) {
            regionalData[region] = {
              name: region,
              wasteBanks: 0,
              volume: 0,
              pickups: 0,
            };
          }
          regionalData[region].wasteBanks++;
        });

        pickupsData.forEach(pickup => {
          const bank = wasteBankData.find(b => b.id === pickup.wasteBankId);
          const region = bank?.location?.city || 'Unknown';
          if (regionalData[region]) {
            regionalData[region].pickups++;
            Object.values(pickup.wastes).forEach(waste => {
              regionalData[region].volume += waste.weight || 0;
            });
          }
        });

        // Calculate insights
        const currentMonth = new Date().getMonth();
        const currentMonthData = Object.values(monthlyData)
          .sort((a, b) => new Date(b.month) - new Date(a.month))[0];
        const lastMonthData = Object.values(monthlyData)
          .sort((a, b) => new Date(b.month) - new Date(a.month))[1];

        const volumeGrowth = lastMonthData ? 
          ((currentMonthData.volumeTotal - lastMonthData.volumeTotal) / lastMonthData.volumeTotal * 100) : 0;
        const pickupGrowth = lastMonthData ?
          ((currentMonthData.pickupCount - lastMonthData.pickupCount) / lastMonthData.pickupCount * 100) : 0;

        setData({
          wasteBanks: wasteBankData,
          pickups: pickupsData,
          analytics: {
            volume: Object.values(monthlyData).map(data => ({
              ...data,
              wasteBankCount: data.wasteBanks.size,
              avgValue: data.avgValue / data.pickupCount,
            })),
            regional: Object.values(regionalData),
            insights: [
              {
                title: 'Volume Trend',
                value: `${Math.round(volumeGrowth)}% MoM`,
                trend: volumeGrowth,
                icon: TrendingUp,
                description: 'Monthly volume collection growth rate',
              },
              {
                title: 'Pickup Efficiency',
                value: `${Math.round(pickupGrowth)}% MoM`,
                trend: pickupGrowth,
                icon: Signal,
                description: 'Change in pickup completion rate',
              },
              {
                title: 'Regional Coverage',
                value: `${Object.keys(regionalData).length} Regions`,
                icon: MapPin,
                description: 'Active waste collection regions',
              },
            ],
          },
        });

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

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
                <FileBarChart className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Analytics & Insights</h1>
                <p className="text-sm text-gray-500">Advanced waste management analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-40"
              >
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </Select>
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg 
                hover:bg-emerald-600 transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data.analytics.insights.map((insight, index) => (
              <InsightCard
                key={index}
                icon={insight.icon}
                title={insight.title}
                value={insight.value}
                description={insight.description}
                trend={insight.trend}
              />
            ))}
          </div>

          {/* Volume Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard
              title="Volume & Pickup Trends"
              description="Monthly waste collection volume and pickup counts"
              actions={
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Filter className="h-5 w-5 text-gray-500" />
                </button>
              }
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.analytics.volume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}K kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => value.toFixed(0)}
                    />
                    <Tooltip />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pickupCount"
                      stroke="#6366F1"
                      name="Pickups"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Regional Performance */}
            <ChartCard
              title="Regional Performance"
              description="Waste collection performance by region"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.analytics.regional}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}K kg`}
                    />
                    <Tooltip />
                    <Bar dataKey="volume" fill="#10B981" radius={[4, 4, 0, 0]} name="Volume" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Regional Statistics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Regional Statistics</h3>
                <p className="text-sm text-gray-500">Detailed performance metrics by region</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Region</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Waste Banks</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Volume</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Pickups</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.analytics.regional.map((region) => (
                    <tr key={region.name} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{region.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{region.wasteBanks}</td>
                      <td className="py-3 px-4 text-gray-600">{(region.volume / 1000).toFixed(1)}K kg</td>
                      <td className="py-3 px-4 text-gray-600">{region.pickups}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ 
                                width: `${Math.min(
                                  (region.volume / region.wasteBanks / 1000) * 100, 100
                                )}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round((region.volume / region.wasteBanks / 1000) * 100)}%
                          </span>
                        </div>
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

export default GovernmentAnalytics;