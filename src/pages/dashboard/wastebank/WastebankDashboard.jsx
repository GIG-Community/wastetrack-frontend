import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users,
  Package,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Truck,
  Recycle,
  Scale,
  Clock,
  DollarSign
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
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

// Components remain the same...
// (Button and StatCard components stay unchanged)

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

const WastebankDashboard = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCollectors: 0,
    activeCollectors: 0,
    totalPickups: 0,
    totalWaste: 0,
    totalEarnings: 0,
    pendingPickups: 0,
    assignedPickups: 0,
    completedPickups: 0,
    thisMonthWaste: 0,
    lastMonthWaste: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0
  });
  const [pickupTrends, setPickupTrends] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [recentPickups, setRecentPickups] = useState([]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser?.uid]);

  const fetchDashboardData = async () => {
    if (!currentUser?.uid) {
      setError("No user ID found");
      return;
    }

    setLoading(true);
    try {
      // Fetch collectors
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'collector')
      );
      const collectorsSnapshot = await getDocs(collectorsQuery);
      const collectorsData = collectorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all pickups for this waste bank
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid)
      );
      const pickupsSnapshot = await getDocs(pickupsQuery);
      const pickupsData = pickupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate monthly stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      // Function to check if a date is in specified month
      const isInMonth = (timestamp, month, year) => {
        const date = new Date(timestamp.seconds * 1000);
        return date.getMonth() === month && date.getFullYear() === year;
      };

      // Calculate this month's stats
      const thisMonthPickups = pickupsData.filter(p => 
        isInMonth(p.createdAt || p.date, thisMonth, thisYear)
      );

      // Calculate last month's stats
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthPickups = pickupsData.filter(p => 
        isInMonth(p.createdAt || p.date, lastMonth, lastMonthYear)
      );

      // Calculate waste totals and earnings
      const calculateTotals = (pickups) => {
        return pickups.reduce((acc, pickup) => {
          const totalWeight = Object.values(pickup.wastes || {}).reduce((sum, waste) => 
            sum + (waste.weight || 0), 0);
          return {
            weight: acc.weight + totalWeight,
            earnings: acc.earnings + (pickup.totalValue || 0)
          };
        }, { weight: 0, earnings: 0 });
      };

      const thisMonthTotals = calculateTotals(thisMonthPickups);
      const lastMonthTotals = calculateTotals(lastMonthPickups);
      const allTimeTotals = calculateTotals(pickupsData);

      // Status counts
      const pendingPickups = pickupsData.filter(p => p.status === 'pending').length;
      const assignedPickups = pickupsData.filter(p => p.status === 'assigned').length;
      const completedPickups = pickupsData.filter(p => p.status === 'completed').length;

      // Set stats
      setStats({
        totalCollectors: collectorsData.length,
        activeCollectors: collectorsData.filter(c => c.status === 'active').length,
        totalPickups: pickupsData.length,
        totalWaste: allTimeTotals.weight,
        totalEarnings: allTimeTotals.earnings,
        pendingPickups,
        assignedPickups,
        completedPickups,
        thisMonthWaste: thisMonthTotals.weight,
        lastMonthWaste: lastMonthTotals.weight,
        thisMonthEarnings: thisMonthTotals.earnings,
        lastMonthEarnings: lastMonthTotals.earnings
      });

      // Prepare pickup trends (last 7 days with actual weights)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const dayPickups = pickupsData.filter(p => {
          const pickupDate = new Date(p.createdAt?.seconds * 1000 || p.date.seconds * 1000);
          return pickupDate >= date && pickupDate < nextDay;
        });

        const dayTotals = calculateTotals(dayPickups);

        last7Days.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          waste: dayTotals.weight,
          earnings: dayTotals.earnings
        });
      }
      setPickupTrends(last7Days);

      // Prepare waste types data with actual weights
      const wasteTypeTotals = {};
      pickupsData.forEach(pickup => {
        if (pickup.wastes) {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            if (!wasteTypeTotals[type]) {
              wasteTypeTotals[type] = {
                weight: 0,
                value: 0
              };
            }
            wasteTypeTotals[type].weight += data.weight || 0;
            wasteTypeTotals[type].value += data.value || 0;
          });
        }
      });

      const wasteTypeData = Object.entries(wasteTypeTotals).map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        weight: data.weight,
        value: data.value
      }));
      setWasteTypes(wasteTypeData);

      // Set recent pickups (last 5 completed)
      setRecentPickups(
        pickupsData
          .filter(p => p.status === 'completed')
          .sort((a, b) => b.completedAt?.seconds - a.completedAt?.seconds)
          .slice(0, 5)
      );

      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  // Base components
const Button = ({ 
  variant = "primary", 
  size = "md",
  className = "", 
  children, 
  ...props 
}) => {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-700",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5",
    lg: "px-6 py-3"
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, trend_value, variant = "success", className = "" }) => (
  <div className={`bg-white rounded-xl p-6 border border-zinc-200 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <div className="p-2.5 bg-zinc-100 rounded-lg w-fit">
          <Icon className="h-6 w-6 text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p className="text-2xl font-semibold text-zinc-800 mt-1">{value}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
          ${variant === 'success' ? 'bg-emerald-50 text-emerald-600' : 
           variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-600'}`}
        >
          {variant === 'success' ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {trend_value}
        </div>
      )}
    </div>
    {trend && (
      <p className="text-sm text-zinc-500 mt-2">{trend}</p>
    )}
  </div>
);

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
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200">
              <Building2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Waste Bank Overview</h1>
              <p className="text-sm text-zinc-500">Analytics and performance metrics</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Earnings Card */}
            <StatCard
              icon={DollarSign}
              label="Total Earnings"
              value={`Rp ${stats.totalEarnings.toLocaleString()}`}
              trend="vs last month"
              trend_value={`${((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100 || 0).toFixed(1)}%`}
              variant={stats.thisMonthEarnings >= stats.lastMonthEarnings ? 'success' : 'danger'}
            />
            
            {/* Waste Collection Card */}
            <StatCard
              icon={Scale}
              label="Total Waste Collected"
              value={`${stats.totalWaste.toFixed(1)} kg`}
              trend="vs last month"
              trend_value={`${((stats.thisMonthWaste - stats.lastMonthWaste) / stats.lastMonthWaste * 100 || 0).toFixed(1)}%`}
              variant={stats.thisMonthWaste >= stats.lastMonthWaste ? 'success' : 'danger'}
            />

            {/* Pickups Status Card */}
            <StatCard
              icon={Package}
              label="Pickup Status"
              value={stats.completedPickups}
              trend="Current pickups"
              trend_value={`${stats.pendingPickups} pending`}
              variant={stats.pendingPickups === 0 ? 'success' : 'danger'}
            />

            {/* Collectors Card */}
            <StatCard
              icon={Users}
              label="Collectors"
              value={stats.totalCollectors}
              trend="Active collectors"
              trend_value={`${stats.activeCollectors} active`}
              variant="success"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pickup Trends */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Collection Trends</h2>
                  <p className="text-sm text-zinc-500">Daily waste collection stats</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pickupTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717A"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#71717A"
                      fontSize={12}
                      label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#10B981"
                      fontSize={12}
                      label={{ value: 'Earnings (Rp)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'waste' ? `${value} kg` : `Rp ${value.toLocaleString()}`,
                        name === 'waste' ? 'Weight' : 'Earnings'
                      ]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="waste" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      dot={{ stroke: '#6366F1', fill: '#fff', strokeWidth: 2, r: 4 }}
                      activeDot={{ stroke: '#6366F1', fill: '#6366F1', strokeWidth: 0, r: 6 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ stroke: '#10B981', fill: '#fff', strokeWidth: 2, r: 4 }}
                      activeDot={{ stroke: '#10B981', fill: '#10B981', strokeWidth: 0, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste Types Distribution */}
            <div className="bg-white rounded-xl p-6 border border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Waste Distribution</h2>
                  <p className="text-sm text-zinc-500">By weight collected</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Recycle className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="flex flex-col h-80">
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={wasteTypes}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="weight"
                      >
                        {wasteTypes.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value.toFixed(1)} kg (Rp ${props.payload.value.toLocaleString()})`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="border-t border-zinc-100 pt-4 mt-4">
                  <div className="grid grid-cols-1 gap-2">
                    {wasteTypes.map((type, index) => (
                      <div key={type.name} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-zinc-700">{type.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-800">
                            {type.weight.toFixed(1)} kg
                          </p>
                          <p className="text-xs text-zinc-500">
                            Rp {type.value.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Pickups */}
          <div className="bg-white rounded-xl border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Recent Collections</h2>
                  <p className="text-sm text-zinc-500">Latest completed waste collections</p>
                </div>
                <Button variant="secondary" size="sm">
                  View All
                </Button>
              </div>
            </div>

            <div className="divide-y divide-zinc-200">
              {recentPickups.length === 0 ? (
                <div className="p-6 text-center">
                  <Package className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-zinc-800">No Recent Collections</h3>
                  <p className="text-sm text-zinc-500 mt-1">Completed collections will appear here</p>
                </div>
              ) : (
                recentPickups.map((pickup) => (
                  <div key={pickup.id} className="p-6 hover:bg-zinc-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Scale className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-zinc-800">
                              {pickup.userName}
                            </h3>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-600">
                            <Clock className="h-4 w-4" />
                            {new Date(pickup.completedAt.seconds * 1000).toLocaleString()}
                          </div>
                          
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(pickup.wastes || {}).map(([type, data]) => (
                                <span 
                                  key={type}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-lg text-xs font-medium text-zinc-700"
                                >
                                  {type}: {data.weight}kg
                                  <span className="text-zinc-400">•</span>
                                  Rp {data.value.toLocaleString()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">
                          Rp {pickup.totalValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Total Value
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WastebankDashboard;