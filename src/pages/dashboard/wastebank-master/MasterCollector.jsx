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
  MapPin,
  Plus
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
        <p className="mt-1 text-2xl font-semibold text-zinc-800">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-emerald-50">
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-1 mt-2">
        <Activity className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-emerald-600">{trend}</span>
      </div>
    )}
  </div>
);

const MasterCollector = () => {
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
    if (userData && userData.id) {
      console.log('userData available:', userData); // Debug log
      fetchCollectors();
    }
  }, [userData]); // Tambahkan userData sebagai dependency

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      if (!userData?.id) {
        console.error('User data not available - userData:', userData);
        return;
      }

      console.log('Fetching collectors for wastebank:', userData.id);
      console.log('Current user role:', userData.role);

      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master_collector'),
        where('profile.institution', '==', userData.id)
      );
      
      const snapshot = await getDocs(collectorsQuery);
      console.log('Query snapshot size:', snapshot.size); // Debug log
      
      const collectorsData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Collector data:', data); // Debug individual collector data
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      console.log('Processed collectors data:', collectorsData);
      setCollectors(collectorsData);
      
      const activeCount = collectorsData.filter(c => c.status === 'active').length;
      setStats({
        totalCollectors: collectorsData.length,
        activeCollectors: activeCount,
        totalPickups: 0,
        avgRating: 0
      });
    } catch (error) {
      console.error('Error fetching collectors:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      setCollectors([]);
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
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Header with Action Button */}
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Users className="w-6 h-6 text-emerald-500" />
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
            <button className="inline-flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-5 h-5" />
              Add Collector
            </button>
          </div>

          {/* Stats Overview - Made more compact on mobile */}
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
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
            <StatCard
              icon={Package}
              label="Total Pickups"
              value={stats.totalPickups || 0}
            />
            <StatCard
              icon={Star}
              label="Average Rating"
              value={stats.avgRating || '0.0'}
            />
          </div>

          {/* Search and Filters - Stack on mobile */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search collectors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {/* Collectors List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredCollectors.length === 0 ? (
            <div className="py-12 text-center bg-white border rounded-xl border-zinc-200">
              <UserX className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <h3 className="mb-1 text-lg font-medium text-zinc-800">
                No collectors found
              </h3>
              <p className="max-w-sm mx-auto text-zinc-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Start by adding your first collector'}
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-5 h-5" />
                Add Collector
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCollectors.map((collector) => (
                <div 
                  key={collector.id}
                  className="p-6 transition-all duration-200 bg-white border rounded-xl border-zinc-200 hover:border-emerald-500/20 hover:shadow-lg"
                >
                  {/* Collector Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-800 line-clamp-1">
                          {collector.profile?.fullName || 'Unnamed Collector'}
                        </h3>
                        <p className="text-sm text-zinc-500 line-clamp-1">{collector.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={collector.status === 'active' ? 'success' : 'warning'}
                      className="flex-shrink-0"
                    >
                      {collector.status || 'inactive'}
                    </Badge>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <MapPin className="flex-shrink-0 w-5 h-5 mt-1 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Location</p>
                        <p className="text-sm text-zinc-800 line-clamp-2">
                          {collector.profile?.location?.address || 'No address provided'}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {[
                            collector.profile?.location?.city,
                            collector.profile?.location?.province
                          ].filter(Boolean).join(', ') || 'Location not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-start gap-3">
                      <PhoneCall className="flex-shrink-0 w-5 h-5 mt-1 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Contact</p>
                        <p className="text-sm text-zinc-800">{collector.profile?.phone || 'No phone number'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 mt-6 border-t border-zinc-200">
                    <button
                      onClick={() => collector.profile?.phone ? window.location.href = `tel:${collector.profile.phone}` : null}
                      className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm transition-colors rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!collector.profile?.phone}
                    >
                      <PhoneCall className="w-4 h-4" />
                      Call
                    </button>
                    <button
                      onClick={() => collector.email ? window.location.href = `mailto:${collector.email}` : null}
                      className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm transition-colors rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                    <button
                      onClick={() => updateCollectorStatus(
                        collector.id, 
                        collector.status === 'active' ? 'inactive' : 'active'
                      )}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm w-full justify-center ${
                        collector.status === 'active' 
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } transition-colors`}
                    >
                      {collector.status === 'active' ? (
                        <>
                          <UserX className="w-4 h-4" />
                          Set Inactive
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Set Active
                        </>
                      )}
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

export default MasterCollector;