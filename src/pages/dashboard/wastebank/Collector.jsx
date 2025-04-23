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
        where('role', '==', 'collector'),
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Action Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">
                  Manajemen Petugas
                </h1>
                <p className="text-sm text-zinc-500">
                  Pantau dan kelola petugas pengumpul sampah
                </p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
              <Plus className="h-5 w-5" />
              Tambah Petugas
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Petugas"
              value={stats.totalCollectors}
              trend={`${Math.round((stats.activeCollectors/stats.totalCollectors) * 100) || 0}% Aktif`}
            />
            <StatCard
              icon={UserCheck}
              label="Petugas Aktif"
              value={stats.activeCollectors}
            />
            <StatCard
              icon={Package}
              label="Total Pengumpulan"
              value={stats.totalPickups || 0}
            />
            <StatCard
              icon={Star}
              label="Rata-rata Rating"
              value={stats.avgRating || '0.0'}
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Cari petugas..."
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
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </Select>
          </div>

          {/* Collectors List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredCollectors.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
              <UserX className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-800 mb-1">
                Tidak ada petugas ditemukan
              </h3>
              <p className="text-zinc-500 max-w-sm mx-auto">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Coba sesuaikan filter atau kata kunci pencarian'
                  : 'Mulai dengan menambahkan petugas pertama'}
              </p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                <Plus className="h-5 w-5" />
                Tambah Petugas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCollectors.map((collector) => (
                <div 
                  key={collector.id}
                  className="bg-white rounded-xl p-6 border border-zinc-200 hover:border-emerald-500/20 hover:shadow-lg transition-all duration-200"
                >
                  {/* Collector Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-800 line-clamp-1">
                          {collector.profile?.fullName || 'Petugas Tanpa Nama'}
                        </h3>
                        <p className="text-sm text-zinc-500 line-clamp-1">{collector.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={collector.status === 'active' ? 'success' : 'warning'}
                      className="flex-shrink-0"
                    >
                      {collector.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-zinc-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Lokasi</p>
                        <p className="text-sm text-zinc-800 line-clamp-2">
                          {collector.profile?.location?.address || 'Alamat belum diisi'}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {[
                            collector.profile?.location?.city,
                            collector.profile?.location?.province
                          ].filter(Boolean).join(', ') || 'Lokasi belum ditentukan'}
                        </p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-start gap-3">
                      <PhoneCall className="h-5 w-5 text-zinc-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Kontak</p>
                        <p className="text-sm text-zinc-800">{collector.profile?.phone || 'Belum ada nomor telepon'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-zinc-200">
                    <button
                      onClick={() => collector.profile?.phone ? window.location.href = `tel:${collector.profile.phone}` : null}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 justify-center"
                      disabled={!collector.profile?.phone}
                    >
                      <PhoneCall className="h-4 w-4" />
                      Hubungi
                    </button>
                    <button
                      onClick={() => collector.email ? window.location.href = `mailto:${collector.email}` : null}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm hover:bg-emerald-100 transition-colors flex-1 justify-center"
                    >
                      <Mail className="h-4 w-4" />
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
                          <UserX className="h-4 w-4" />
                          Non-aktifkan
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Aktifkan
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

export default Employees;