import React, { useState, useEffect } from 'react';
import { 
  Users,
  Search,
  UserCheck,
  UserX,
  Loader2,
  Package,
  Star,
  Activity,
  CheckCircle2,
  PhoneCall,
  Mail,
  MapPin
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';

// Reusable Components
const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
    text-zinc-700 text-sm transition duration-200 ease-in-out
    placeholder:text-zinc-400
    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}`}
    {...props}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
    text-zinc-700 text-sm transition duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}`}
    {...props}
  />
);

const Badge = ({ variant = "default", children, className = "", ...props }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700"
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, className = "" }) => (
  <div className={`bg-white rounded-xl p-4 border border-zinc-200 ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <p className="text-2xl font-semibold text-zinc-800 mt-1">{value}</p>
      </div>
      <div className="p-2 bg-emerald-50 rounded-lg">
        <Icon className="h-5 w-5 text-emerald-500" />
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-1 mt-2">
        <Activity className="h-4 w-4 text-emerald-500" />
        <span className="text-sm text-emerald-600">{trend}</span>
      </div>
    )}
  </div>
);

const Employees = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalCollectors: 0,
    activeCollectors: 0,
    totalPickups: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchCollectors();
  }, []);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      // Create query to get all users with role 'collector'
      // Simple query without ordering to avoid index requirement
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'collector')
      );
      
      const snapshot = await getDocs(collectorsQuery);
      const collectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCollectors(collectorsData);
      
      // Update stats
      const activeCount = collectorsData.filter(c => c.status === 'active').length;
      setStats({
        totalCollectors: collectorsData.length,
        activeCollectors: activeCount,
        totalPickups: 0, // This would need to be calculated from actual pickup data
        avgRating: 0 // This would need to be calculated from actual rating data
      });
    } catch (error) {
      console.error('Error fetching collectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCollectorStatus = async (collectorId, newStatus) => {
    try {
      const collectorRef = doc(db, 'users', collectorId);
      await updateDoc(collectorRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      await fetchCollectors(); // Refresh the list
    } catch (error) {
      console.error('Error updating collector status:', error);
    }
  };

  const filteredCollectors = collectors.filter(collector => {
    const matchesStatus = filterStatus === 'all' || collector.status === filterStatus;
    const matchesSearch = 
      collector.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collector.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collector.profile?.phone?.includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

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
              <Users className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">
                Collector Management
              </h1>
              <p className="text-sm text-zinc-500">
                Monitor and manage waste collectors
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Collectors"
              value={stats.totalCollectors}
              trend={`${Math.round((stats.activeCollectors/stats.totalCollectors) * 100) || 0}% Active`}
            />
            <StatCard
              icon={UserCheck}
              label="Active Collectors"
              value={stats.activeCollectors}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-48"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {/* Collectors List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredCollectors.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-800 mb-1">
                No collectors found
              </h3>
              <p className="text-zinc-500">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollectors.map((collector) => (
                <div 
                  key={collector.id}
                  className="bg-white rounded-xl p-6 border border-zinc-200"
                >
                  {/* Collector Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-800">
                          {collector.profile?.fullName || 'Unnamed Collector'}
                        </h3>
                        <p className="text-sm text-zinc-500">{collector.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={collector.status === 'active' ? 'success' : 'warning'}
                    >
                      {collector.status || 'inactive'}
                    </Badge>
                  </div>

                  {/* Location Information */}
                  {/* Location Information */}
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="h-5 w-5 text-zinc-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-zinc-600">Location</p>
                      <p className="text-sm text-zinc-800">
                        {collector.profile?.location?.address || 'No address provided'}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {collector.profile?.location?.city || 'No city'}, {collector.profile?.location?.province || 'No province'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="border-t border-zinc-200 pt-4 mt-4">
                    <div className="flex items-start gap-3">
                      <PhoneCall className="h-5 w-5 text-zinc-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Contact</p>
                        <p className="text-sm text-zinc-800">{collector.profile?.phone || 'No phone number'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200">
                    <button
                      onClick={() => collector.profile?.phone ? window.location.href = `tel:${collector.profile.phone}` : null}
                      className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm"
                      disabled={!collector.profile?.phone}
                    >
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </button>
                    <button
                      onClick={() => collector.email ? window.location.href = `mailto:${collector.email}` : null}
                      className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                    <button
                      onClick={() => updateCollectorStatus(
                        collector.id, 
                        collector.status === 'active' ? 'inactive' : 'active'
                      )}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ml-auto ${
                        collector.status === 'active' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {collector.status === 'active' ? 'Set Inactive' : 'Set Active'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Employees;