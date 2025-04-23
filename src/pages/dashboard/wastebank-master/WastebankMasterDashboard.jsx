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
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
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

// Base components and color constants
const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

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
          <Icon className="w-6 h-6 text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-800">{value}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
          ${variant === 'success' ? 'bg-emerald-50 text-emerald-600' : 
           variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-600'}`}
        >
          {variant === 'success' ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {trend_value}
        </div>
      )}
    </div>
    {trend && (
      <p className="mt-2 text-sm text-zinc-500">{trend}</p>
    )}
  </div>
);

const WastebankMasterDashboard = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalWasteBanks: 0,
    activeWasteBanks: 0,
    totalRequests: 0,
    completedRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    totalCollections: 0,
    totalWaste: 0,
    balance: 0,
    pendingPayments: 0,
    institutionName: '',
    location: {
      address: '',
      city: '',
      province: ''
    }
  });
  const [collectionTrends, setCollectionTrends] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

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
      // Fetch master waste bank data
      const wasteBankDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const wasteBankData = wasteBankDoc.data();

      // Fetch all waste banks under this master
      const wasteBanksQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank')
      );
      const wasteBanksSnapshot = await getDocs(wasteBanksQuery);
      const wasteBanksData = wasteBanksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch collection requests
      const requestsQuery = query(
        collection(db, 'masterBankRequests'),
        where('masterBankId', '==', currentUser.uid)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate request stats
      const pendingRequests = requestsData.filter(r => r.status === 'pending').length;
      const inProgressRequests = requestsData.filter(r => r.status === 'in_progress').length;
      const completedRequests = requestsData.filter(r => r.status === 'completed').length;

      // Calculate total waste and collection trends
      const totalWaste = requestsData.reduce((acc, request) => {
        const totalWeight = Object.values(request.wasteWeights || {}).reduce((sum, weight) => sum + weight, 0);
        return acc + totalWeight;
      }, 0);

      // Prepare daily collection trends
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const dayRequests = requestsData.filter(r => {
          const requestDate = r.date?.toDate();
          return requestDate >= date && requestDate < nextDay;
        });

        const dayTotalWaste = dayRequests.reduce((acc, request) => {
          return acc + Object.values(request.wasteWeights || {}).reduce((sum, weight) => sum + weight, 0);
        }, 0);

        last7Days.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          waste: dayTotalWaste,
          requests: dayRequests.length
        });
      }
      setCollectionTrends(last7Days);

      // Calculate waste type distribution
      const wasteTypeTotals = {};
      requestsData.forEach(request => {
        Object.entries(request.wasteWeights || {}).forEach(([type, weight]) => {
          if (!wasteTypeTotals[type]) {
            wasteTypeTotals[type] = {
              name: type,
              weight: 0,
              value: 0
            };
          }
          wasteTypeTotals[type].weight += weight;
          wasteTypeTotals[type].value += (request.wastes?.[type]?.value || 0);
        });
      });

      setWasteTypes(Object.values(wasteTypeTotals));

      // Set recent requests
      setRecentRequests(
        requestsData
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5)
      );

      // Update stats
      setStats({
        totalWasteBanks: wasteBanksData.length,
        activeWasteBanks: wasteBanksData.filter(wb => wb.status === 'active').length,
        totalRequests: requestsData.length,
        completedRequests,
        pendingRequests,
        inProgressRequests,
        totalCollections: completedRequests,
        totalWaste,
        balance: wasteBankData.balance || 0,
        pendingPayments: wasteBankData.pendingPayments || 0,
        institutionName: wasteBankData.profile?.institutionName || '',
        location: wasteBankData.location || {}
      });

      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">Error Loading Dashboard</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
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
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Master Waste Bank Overview</h1>
              <p className="text-sm text-zinc-500">{stats.institutionName}</p>
              <p className="text-xs text-zinc-400">{stats.location.city}, {stats.location.province}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Waste Banks"
              value={stats.totalWasteBanks}
              trend="Active waste banks"
              trend_value={`${stats.activeWasteBanks} active`}
              variant={stats.activeWasteBanks === stats.totalWasteBanks ? 'success' : 'danger'}
            />

            <StatCard
              icon={Package}
              label="Collection Requests"
              value={stats.totalRequests}
              trend="Pending requests"
              trend_value={`${stats.pendingRequests} pending`}
              variant={stats.pendingRequests === 0 ? 'success' : 'danger'}
            />

            <StatCard
              icon={Scale}
              label="Total Waste Collected"
              value={`${stats.totalWaste.toFixed(1)} kg`}
              trend="Completed collections"
              trend_value={`${stats.completedRequests} done`}
              variant="success"
            />

            <StatCard
              icon={DollarSign}
              label="Current Balance"
              value={`Rp ${stats.balance.toLocaleString()}`}
              trend="Pending payments"
              trend_value={`Rp ${stats.pendingPayments.toLocaleString()}`}
              variant={stats.pendingPayments === 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Collection Trends */}
            <div className="p-6 bg-white border lg:col-span-2 rounded-xl border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Collection Trends</h2>
                  <p className="text-sm text-zinc-500">Daily collection request stats</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={collectionTrends}>
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
                      label={{ value: 'Requests', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip />
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
                      dataKey="requests" 
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
            <div className="p-6 bg-white border rounded-xl border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Waste Distribution</h2>
                  <p className="text-sm text-zinc-500">By weight collected</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Recycle className="w-5 h-5 text-emerald-500" />
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100">
                  <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                    {wasteTypes.map((type, index) => (
                      <div key={type.name} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-zinc-700">
                            {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                          </span>
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

          {/* Recent Requests */}
          <div className="bg-white border rounded-xl border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-800">Recent Collection Requests</h2>
                  <p className="text-sm text-zinc-500">Latest waste bank collection requests</p>
                </div>
                <Button variant="secondary" size="sm">
                  View All
                </Button>
              </div>
            </div>

            <div className="divide-y divide-zinc-200">
              {recentRequests.length === 0 ? (
                <div className="p-6 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <h3 className="text-sm font-medium text-zinc-800">No Recent Requests</h3>
                  <p className="mt-1 text-sm text-zinc-500">Collection requests will appear here</p>
                </div>
              ) : (
                recentRequests.map((request) => (
                  <div key={request.id} className="p-6 hover:bg-zinc-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <Truck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-zinc-800">
                              {request.wasteBankName}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full
                              ${request.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'}`}
                            >
                              {request.status.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-600">
                            <Clock className="w-4 h-4" />
                            {request.date.toDate().toLocaleString()}
                            <span className="text-zinc-400">•</span>
                            {request.time}
                          </div>
                          
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(request.wasteWeights || {}).map(([type, weight]) => (
                                <span 
                                  key={type}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-700"
                                >
                                  {type}: {weight}kg
                                  {request.wastes?.[type]?.value && (
                                    <>
                                      <span className="text-zinc-400">•</span>
                                      Rp {request.wastes[type].value.toLocaleString()}
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>

                          {request.notes && (
                            <p className="mt-2 text-sm text-zinc-500">
                              Note: {request.notes}
                            </p>
                          )}
                        </div>
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

export default WastebankMasterDashboard;