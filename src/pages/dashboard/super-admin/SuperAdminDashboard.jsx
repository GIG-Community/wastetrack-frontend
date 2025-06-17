import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  RefreshCcw, 
  Users, 
  Building2, 
  ClipboardList,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

// Reusable Components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ variant = "primary", className = "", children, ...props }) => {
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
    success: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-700"
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        px-4 py-2.5 rounded-lg
        font-medium text-sm
        transition duration-150 ease-in-out
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

const StatsCard = ({ icon: Icon, label, value, trend, className = "" }) => (
  <Card className={`p-6 transition-all duration-200 hover:shadow-md ${className}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <span className={`text-sm font-medium ${
              trend > 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
      <div className="p-3 bg-emerald-50 rounded-xl">
        <Icon className="h-6 w-6 text-emerald-600" />
      </div>
    </div>
  </Card>
);

const LogItem = ({ log }) => {
  const getLogTypeStyles = (type) => {
    const types = {
      success: { icon: CheckCircle, colors: "text-emerald-600 bg-emerald-50" },
      error: { icon: AlertCircle, colors: "text-red-600 bg-red-50" },
      info: { icon: Info, colors: "text-blue-600 bg-blue-50" }
    };
    return types[type] || types.info;
  };

  const { icon: LogIcon, colors } = getLogTypeStyles(log.type);

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50/50 transition-all duration-200">
      <div className={`p-2 rounded-lg shrink-0 ${colors}`}>
        <LogIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{log.message}</p>
        <div className="mt-1 flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1.5" />
            {new Date(log.createdAt?.seconds * 1000).toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1.5" />
            {new Date(log.createdAt?.seconds * 1000).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [wasteBankCount, setWasteBankCount] = useState(0);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUserCount(usersSnapshot.size);
      
      const wasteBanksSnapshot = await getDocs(collection(db, 'wasteBanks'));
      setWasteBankCount(wasteBanksSnapshot.size);
      
      const q = query(
        collection(db, 'logs'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const logsSnapshot = await getDocs(q);
      const logs = logsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        type: Math.random() > 0.5 ? 'success' : 'error' // Simulated for demo
      }));
      setSystemLogs(logs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar 
        role={userData?.role} 
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {userData?.fullName || 'Admin'}
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0"
            >
              <RefreshCcw 
                size={18} 
                className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} 
              />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Loading dashboard data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                  icon={Users}
                  label="Total Users"
                  value={userCount}
                  trend={5.2}
                />
                <StatsCard
                  icon={Building2}
                  label="Waste Banks"
                  value={wasteBankCount}
                  trend={2.1}
                />
                <StatsCard
                  icon={Activity}
                  label="Active Sessions"
                  value="127"
                  trend={-1.5}
                />
                <StatsCard
                  icon={TrendingUp}
                  label="System Uptime"
                  value="99.9%"
                />
              </div>

              {/* System Logs Section */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <ClipboardList className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">System Activity</h2>
                        <p className="text-sm text-gray-500">Recent system events and logs</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      View All Logs
                    </Button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {systemLogs.length > 0 ? (
                    systemLogs.map(log => (
                      <LogItem key={log.id} log={log} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="p-3 bg-gray-50 rounded-full mb-4">
                        <ClipboardList className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">No recent system logs available</p>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;