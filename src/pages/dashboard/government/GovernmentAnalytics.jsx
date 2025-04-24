import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
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
  Line
} from 'recharts';
import {
  Building2,
  TrendingUp,
  Scale,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  FileBarChart,
  Filter,
  Download,
  Clock,
  Target,
  Users
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

const Analytics = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [analytics, setAnalytics] = useState({
    summary: {
      totalVolume: 0,
      totalTransactions: 0,
      avgProcessingTime: 0,
      networkEfficiency: 0,
      revenueGenerated: 0,
      wasteReductionRate: 0,
      participationRate: 0,
      environmentalImpact: 0
    },
    wasteBankStats: [],
    wasteTypeDistribution: [],
    regionPerformance: [],
    policyRecommendations: []
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data from collections
        const wasteBanksQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['wastebank_admin', 'wastebank_master'])
        );
        const pickupsQuery = query(collection(db, 'pickups'));
        const masterRequestsQuery = query(collection(db, 'masterBankRequests'));

        const [wasteBanksSnap, pickupsSnap, masterRequestsSnap] = await Promise.all([
          getDocs(wasteBanksQuery),
          getDocs(pickupsQuery),
          getDocs(masterRequestsQuery)
        ]);

        const wasteBanks = wasteBanksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const pickups = pickupsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p.status === 'completed');

        const masterRequests = masterRequestsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(r => r.status === 'completed');

        // Calculate total waste volume and value
        let totalVolume = 0;
        let totalValue = 0;
        let wasteTypes = {};

        // Process pickups data
        pickups.forEach(pickup => {
          Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
            totalVolume += data.weight || 0;
            totalValue += data.value || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = {
                type,
                volume: 0,
                value: 0,
                count: 0
              };
            }
            wasteTypes[type].volume += data.weight || 0;
            wasteTypes[type].value += data.value || 0;
            wasteTypes[type].count++;
          });
        });

        // Process master requests data
        masterRequests.forEach(request => {
          Object.entries(request.wastes || {}).forEach(([type, data]) => {
            totalVolume += data.weight || 0;
            totalValue += data.value || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = {
                type,
                volume: 0,
                value: 0,
                count: 0
              };
            }
            wasteTypes[type].volume += data.weight || 0;
            wasteTypes[type].value += data.value || 0;
            wasteTypes[type].count++;
          });
        });

        // Calculate network efficiency
        const activeWasteBanks = new Set(
          [...pickups, ...masterRequests].map(t => t.wasteBankId)
        );
        const networkEfficiency = (activeWasteBanks.size / Math.max(1, wasteBanks.length)) * 100;

        // Calculate processing times
        const processingTimes = masterRequests.map(request => {
          const createdTime = request.createdAt?.seconds || 0;
          const completedTime = request.completedAt?.seconds || 0;
          return (completedTime - createdTime) / 3600; // Convert to hours
        });

        const avgProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Regional performance calculation
        const regions = {};
        wasteBanks.forEach(bank => {
          const region = bank.profile?.location?.city || 'Unknown';
          if (!regions[region]) {
            regions[region] = {
              name: region,
              totalVolume: 0,
              totalValue: 0,
              wasteBankCount: 0,
              processingCapacity: 0
            };
          }
          regions[region].wasteBankCount++;
          
          // Calculate warehouse capacity
          if (bank.warehouseDimensions) {
            regions[region].processingCapacity += 
              (bank.warehouseDimensions.length || 0) * 
              (bank.warehouseDimensions.width || 0) * 
              (bank.warehouseDimensions.height || 0);
          }
        });

        // Update regional stats with actual transaction data
        [...pickups, ...masterRequests].forEach(transaction => {
          const region = wasteBanks.find(b => b.id === transaction.wasteBankId)?.profile?.location?.city || 'Unknown';
          if (regions[region]) {
            Object.values(transaction.wastes || {}).forEach(waste => {
              regions[region].totalVolume += waste.weight || 0;
              regions[region].totalValue += waste.value || 0;
            });
          }
        });

        // Generate policy recommendations based on actual data
        const policyRecommendations = [
          {
            title: "Network Optimization",
            description: `Current network efficiency is ${networkEfficiency.toFixed(1)}%. ${
              networkEfficiency < 70 
                ? "Consider expanding waste bank coverage in underserved areas."
                : "Focus on optimizing existing waste bank operations."
            }`,
            priority: networkEfficiency < 70 ? "High" : "Medium"
          },
          {
            title: "Processing Efficiency",
            description: `Average processing time: ${avgProcessingTime.toFixed(1)} hours. ${
              avgProcessingTime > 24 
                ? "Implement measures to reduce processing delays."
                : "Maintain current efficient processing standards."
            }`,
            priority: avgProcessingTime > 24 ? "High" : "Low"
          },
          {
            title: "Waste Type Management",
            description: `Most collected waste type: ${
              Object.entries(wasteTypes)
                .sort((a, b) => b[1].volume - a[1].volume)[0][0]
            }. Consider optimizing collection routes based on waste type distribution.`,
            priority: "Medium"
          }
        ];

        // Update analytics state with actual data
        setAnalytics({
          summary: {
            totalVolume,
            totalTransactions: pickups.length + masterRequests.length,
            avgProcessingTime,
            networkEfficiency,
            revenueGenerated: totalValue,
            wasteReductionRate: totalVolume / (timeRange === 'month' ? 30 : 365),
            participationRate: networkEfficiency,
            environmentalImpact: totalVolume * 2.5 // Approximate CO2 reduction factor
          },
          wasteBankStats: wasteBanks.map(bank => ({
            id: bank.id,
            name: bank.profile?.institutionName || 'Unnamed Bank',
            balance: bank.balance || 0,
            volume: pickups
              .filter(p => p.wasteBankId === bank.id)
              .reduce((sum, p) => sum + Object.values(p.wastes || {})
                .reduce((s, w) => s + (w.weight || 0), 0), 0)
          })),
          wasteTypeDistribution: Object.values(wasteTypes),
          regionPerformance: Object.values(regions),
          policyRecommendations
        });

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Waste Management Analytics</h1>
            <p className="mt-2 text-gray-600">Comprehensive insights from {analytics.summary.totalTransactions} transactions</p>
            
            <div className="flex items-center mt-4 space-x-4">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg ${
                  timeRange === 'month'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-4 py-2 rounded-lg ${
                  timeRange === 'year'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                This Year
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Scale}
              label="Total Volume"
              value={`${analytics.summary.totalVolume.toFixed(1)} kg`}
              subValue={`${analytics.summary.wasteReductionRate.toFixed(1)} kg/day`}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Revenue Generated"
              value={formatCurrency(analytics.summary.revenueGenerated)}
              subValue="Total economic impact"
            />
            <SummaryCard
              icon={Users}
              label="Network Efficiency"
              value={`${analytics.summary.networkEfficiency.toFixed(1)}%`}
              subValue={`${analytics.wasteBankStats.length} waste banks`}
            />
            <SummaryCard
              icon={Target}
              label="Environmental Impact"
              value={`${analytics.summary.environmentalImpact.toFixed(1)} kg CO₂`}
              subValue="Emissions reduction"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
            {/* Waste Type Distribution */}
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Waste Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.wasteTypeDistribution}
                      dataKey="volume"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {analytics.wasteTypeDistribution.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)} kg`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regional Performance */}
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Regional Performance</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.regionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#10B981" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6366F1" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalVolume" name="Volume (kg)" fill="#10B981" />
                    <Bar yAxisId="right" dataKey="totalValue" name="Value (Rp)" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Policy Recommendations */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Policy Recommendations</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {analytics.policyRecommendations.map((policy, index) => (
                <div key={index} className="p-6 bg-white border-l-4 shadow-sm rounded-xl border-emerald-500">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-800">{policy.title}</h4>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      policy.priority === 'High' ? 'bg-red-100 text-red-800' :
                      policy.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {policy.priority}
                    </span>
                  </div>
                  <p className="text-gray-600">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Waste Bank Performance */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Waste Bank Performance</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analytics.wasteBankStats.map((bank, index) => (
                <div key={index} className="p-6 bg-white shadow-sm rounded-xl">
                  <h4 className="font-medium text-gray-800">{bank.name}</h4>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Volume Processed</span>
                        <span className="font-medium">{bank.volume.toFixed(1)} kg</span>
                      </div>
                      <div className="h-2 mt-1 bg-gray-200 rounded-full">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min((bank.volume / analytics.summary.totalVolume) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Balance</span>
                        <span className="font-medium">{formatCurrency(bank.balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, subValue }) => (
  <div className="p-6 bg-white shadow-sm rounded-xl">
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2 rounded-lg bg-emerald-50">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{subValue}</p>
      </div>
    </div>
  </div>
);

export default Analytics;