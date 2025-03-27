import React, { useState, useEffect } from 'react';
import { 
  BarChart2,
  TreesIcon,
  DropletIcon,
  Recycle,
  Package,
  Download,
  Calendar,
  Filter,
  Users,
  TrendingUp,
  MapPin,
  Loader2,
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  DollarSign,
  Scale,
  Wallet
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
  Bar,
  BarChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Environmental Impact Constants per KG
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
    className={`w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      hover:border-emerald-500/50 
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none bg-no-repeat bg-[right_1rem_center]
      ${className}`}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`
    }}
    {...props}
  />
);

const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, trendSuffix = '%' }) => (
  <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-emerald-50 rounded-lg w-fit group-hover:bg-emerald-100 transition-colors">
          <Icon className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p className="text-2xl font-semibold text-zinc-800 mt-1 group-hover:text-emerald-600 transition-colors">
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-zinc-500 mt-1">{subValue}</p>
          )}
        </div>
      </div>
      {trend && trendValue !== undefined && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
          ${Number(trendValue) >= 0 
            ? 'bg-emerald-50 text-emerald-600' 
            : 'bg-red-50 text-red-600'}`}
        >
          {Number(trendValue) >= 0 ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {Math.abs(Number(trendValue)).toFixed(1)}{trendSuffix}
        </div>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, description, children, className = "" }) => (
  <div className={`bg-white p-6 rounded-xl border border-zinc-200 shadow-sm ${className}`}>
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-800">{title}</h2>
          <InfoTooltip>{description}</InfoTooltip>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="group relative inline-block">
    <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 text-white text-xs rounded-lg w-48 
      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-800" />
    </div>
  </div>
);

const Reports = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [reports, setReports] = useState({
    collectionStats: {
      totalPickups: 0,
      totalWeight: 0,
      totalEarnings: 0,
      completedPickups: 0
    },
    financialStats: {
      totalRevenue: 0,
      lastMonthRevenue: 0,
      thisMonthRevenue: 0,
      revenueGrowth: 0,
      averagePerKg: 0
    },
    impactStats: {
      carbonReduced: 0,
      waterSaved: 0,
      treesPreserved: 0,
      landfillSpaceSaved: 0
    },
    wasteTypeDistribution: [],
    monthlyTrends: [],
    revenueByWasteType: []
  });

  useEffect(() => {
    if (currentUser?.uid) {
      fetchReportData();
    }
  }, [dateRange, currentUser?.uid]);

  const calculateImpact = (wastes) => {
    let impact = {
      carbonReduced: 0,
      waterSaved: 0,
      treesPreserved: 0,
      landfillSpaceSaved: 0
    };

    Object.entries(wastes).forEach(([type, data]) => {
      const factors = IMPACT_FACTORS[type];
      if (factors && data.weight) {
        impact.carbonReduced += factors.carbon * data.weight;
        impact.waterSaved += factors.water * data.weight;
        impact.landfillSpaceSaved += factors.landfill * data.weight;
        if (factors.trees) {
          impact.treesPreserved += factors.trees * data.weight;
        }
      }
    });

    return impact;
  };

  const fetchReportData = async () => {
    if (!currentUser?.uid) {
      setError("No user ID found");
      return;
    }

    setLoading(true);
    try {
      // Determine date range
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch completed pickups
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );
      
      const pickupsSnapshot = await getDocs(pickupsQuery);
      const pickupsData = pickupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate period stats
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const thisMonthPickups = pickupsData.filter(p => {
        const date = new Date(p.completedAt.seconds * 1000);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const lastMonthPickups = pickupsData.filter(p => {
        const date = new Date(p.completedAt.seconds * 1000);
        return date.getMonth() === (thisMonth - 1) && date.getFullYear() === thisYear;
      });

      // Calculate financial stats
      const thisMonthRevenue = thisMonthPickups.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      const lastMonthRevenue = lastMonthPickups.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      const totalRevenue = pickupsData.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      const totalWeight = pickupsData.reduce((sum, p) => {
        return sum + Object.values(p.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
      }, 0);

      // Calculate waste type distribution and revenue
      const wasteTypeStats = {};
      pickupsData.forEach(pickup => {
        Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
          if (!wasteTypeStats[type]) {
            wasteTypeStats[type] = { weight: 0, value: 0 };
          }
          wasteTypeStats[type].weight += data.weight || 0;
          wasteTypeStats[type].value += data.value || 0;
        });
      });

      // Prepare report data
      const reportData = {
        collectionStats: {
          totalPickups: pickupsData.length,
          totalWeight,
          totalEarnings: totalRevenue,
          completedPickups: pickupsData.filter(p => p.status === 'completed').length
        },
        financialStats: {
          totalRevenue,
          lastMonthRevenue,
          thisMonthRevenue,
          revenueGrowth: lastMonthRevenue ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0,
          averagePerKg: totalWeight ? (totalRevenue / totalWeight) : 0
        },
        impactStats: calculateImpact(wasteTypeStats),
        wasteTypeDistribution: Object.entries(wasteTypeStats).map(([type, data]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          weight: data.weight,
          value: data.value
        })),
        monthlyTrends: [], // Will be calculated below
        revenueByWasteType: Object.entries(wasteTypeStats).map(([type, data]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          revenue: data.value,
          weight: data.weight,
          averagePrice: data.weight ? (data.value / data.weight) : 0
        }))
      };

      // Calculate monthly trends
      const monthlyData = {};
      pickupsData.forEach(pickup => {
        const date = new Date(pickup.completedAt.seconds * 1000);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: date.toLocaleString('default', { month: 'short' }),
            weight: 0,
            revenue: 0,
            pickups: 0
          };
        }

        monthlyData[monthKey].pickups++;
        monthlyData[monthKey].revenue += pickup.totalValue || 0;
        Object.values(pickup.wastes || {}).forEach(waste => {
          monthlyData[monthKey].weight += waste.weight || 0;
        });
      });

      reportData.monthlyTrends = Object.values(monthlyData);

      setReports(reportData);
      setError(null);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      ...reports
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waste-bank-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50/50">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <button 
            onClick={fetchReportData}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
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
              <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200">
                <BarChart2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Reports & Analytics</h1>
                <p className="text-sm text-zinc-500">Track your waste management performance</p>
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

              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg
                  hover:bg-emerald-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Financial Stats */}
            <StatCard
              icon={Wallet}
              label="Total Revenue"
              value={`Rp ${reports.financialStats.totalRevenue.toLocaleString()}`}
              subValue="All time earnings"
              trend="vs. last month"
              trendValue={reports.financialStats.revenueGrowth}
            />
            <StatCard
              icon={Scale}
              label="Total Weight"
              value={`${reports.collectionStats.totalWeight.toFixed(1)} kg`}
              subValue={`${reports.collectionStats.totalPickups} pickups completed`}
              trend="Average price"
              trendValue={`Rp ${reports.financialStats.averagePerKg.toLocaleString()}`}
              trendSuffix="/kg"
            />

            {/* Environmental Impact */}
            <StatCard
              icon={Recycle}
              label="Carbon Reduction"
              value={`${reports.impactStats.carbonReduced.toFixed(1)} kg`}
              subValue="CO₂ emissions prevented"
            />
            <StatCard
              icon={DropletIcon}
              label="Water Saved"
              value={`${(reports.impactStats.waterSaved / 1000).toFixed(1)} m³`}
              subValue="Water conservation impact"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Trends Chart */}
            <ChartCard 
              title="Monthly Performance" 
              description="Weight collected and revenue trends"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.monthlyTrends}>
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
                      tickFormatter={(value) => `Rp ${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'weight') return [`${value.toFixed(1)} kg`, 'Weight'];
                        return [`Rp ${value.toLocaleString()}`, 'Revenue'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="weight" fill="#10B981" name="weight" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#6366F1" name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Types Distribution */}
            <ChartCard 
              title="Waste Distribution" 
              description="Revenue by waste type"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.revenueByWasteType}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                    >
                      {reports.revenueByWasteType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, entry) => [
                        `Rp ${value.toLocaleString()}`,
                        `${entry.payload.name} (${entry.payload.weight.toFixed(1)} kg)`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-3">
                {reports.revenueByWasteType.map((type, index) => (
                  <div key={type.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-zinc-700">{type.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-800">
                        Rp {type.revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Rp {type.averagePrice.toLocaleString()}/kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Impact Summary */}
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TreesIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Environmental Impact Summary</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Your waste management activities have contributed to:
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Carbon Impact</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {reports.impactStats.carbonReduced.toFixed(1)} kg CO₂
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">emissions prevented</p>
                  </div>
                  
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TreesIcon className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Forest Preservation</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {reports.impactStats.treesPreserved.toFixed(1)} trees
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">equivalent saved</p>
                  </div>

                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Landfill Reduction</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {reports.impactStats.landfillSpaceSaved.toFixed(1)} m³
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

export default Reports;
