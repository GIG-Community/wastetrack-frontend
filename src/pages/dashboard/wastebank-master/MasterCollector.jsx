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
  Plus,
  Info,
  AlarmClock,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { collection, query, onSnapshot, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

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

// Tooltip component for providing additional information
const Tooltip = ({ children, content }) => (
  <div className="relative flex items-center group">
    {children}
    <div className="absolute z-50 invisible w-48 p-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

const InfoPanel = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="text-left p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <h3 className="mb-1 font-medium text-blue-800">{title}</h3>
            <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
          {isExpanded && (
            <div className="text-sm text-blue-700">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, className = "", tooltip = "" }) => (
  <div className={`bg-white rounded-xl p-4 border border-zinc-200 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-gray-50 rounded-full">
            <Icon className="w-5 h-5 text-zinc-600" />
          </div>
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle className="h-3.5 w-3.5 text-zinc-400" />
            </Tooltip>
          )}
        </div>
        <div>
          <div className="flex items-start gap-1">
            <p className="text-sm font-medium text-zinc-600">{label}</p>
          </div>
        </div>
        <p className="mt-1 text-left text-2xl font-semibold text-zinc-800">{value}</p>
      </div>
    </div>
    {trend && (
      <div className="hidden flex items-start gap-1 mt-2">
        <Activity className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-emerald-600">{trend}</span>
      </div>
    )}
  </div>
);

const MasterCollector = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
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
    let unsubscribe;
    if (userData && userData.id) {
      // console.log('userData tersedia:', userData); // Debug log
      unsubscribe = setupCollectorsListener();
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userData]); // Tambahkan userData sebagai dependency

  const setupCollectorsListener = () => {
    setLoading(true);
    try {
      if (!userData?.id) {
        // console.error('Data pengguna tidak tersedia - userData:', userData);
        return;
      }

      // console.log('Mengambil data petugas untuk bank sampah:', userData.id);
      // console.log('Peran pengguna saat ini:', userData.role);

      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master_collector'),
        where('profile.institution', '==', userData.id)
      );

      // Replace getDocs with onSnapshot for real-time updates
      const unsubscribe = onSnapshot(
        collectorsQuery,
        (snapshot) => {
          // console.log('Ukuran snapshot kueri:', snapshot.size); // Debug log

          const collectorsData = snapshot.docs.map(doc => {
            const data = doc.data();
            // console.log('Data petugas:', data); // Debug individual collector data
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate()
            };
          });

          // console.log('Data petugas yang diproses:', collectorsData);
          setCollectors(collectorsData);

          const activeCount = collectorsData.filter(c => c.status === 'active').length;
          setStats({
            totalCollectors: collectorsData.length,
            activeCollectors: activeCount,
            totalPickups: 0,
            avgRating: 0
          });

          setLoading(false);
        },
        (error) => {
          console.error('Error mengambil data petugas:', error);
          console.error('Detail error:', error.message);
          console.error('Stack error:', error.stack);
          setCollectors([]);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener:', error);
      console.error('Detail error:', error.message);
      console.error('Stack error:', error.stack);
      setCollectors([]);
      setLoading(false);
      return () => { };
    }
  };

  const updateCollectorStatus = async (collectorId, newStatus) => {
    try {
      const collectorRef = doc(db, 'users', collectorId);
      await updateDoc(collectorRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      // No need to refresh the list as onSnapshot will handle it
    } catch (error) {
      console.error('Error memperbarui status petugas:', error);
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

  const formatDate = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-6">
          {/* Header with Action Button */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex text-left items-center gap-4 mb-8">
              <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Users className="w-6 h-6 text-emerald-500" />
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
            {/* <button className="inline-flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-5 h-5" />
              Tambah Petugas
            </button> */}
          </div>

          {/* Information Panel */}
          <InfoPanel title="Informasi">
            <p>
              Halaman ini untuk melihat dan mengelola semua petugas pengumpul sampah yang terdaftar di
              bank sampah Anda. Anda dapat mengaktifkan atau menonaktifkan petugas, serta melihat informasi kontak dan
              lokasi mereka.
              <div className="mt-4">
                <span className="font-semibold">Catatan</span>: Data ditampilkan secara real-time dan akan diperbarui secara otomatis ketika terjadi perubahan.
              </div>
            </p>
          </InfoPanel>

          {/* Stats Overview */}
          <div className="grid justify-start grid-cols-2 gap-4 mb-8 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total Petugas"
              value={stats.totalCollectors}
              trend={`${Math.round((stats.activeCollectors / stats.totalCollectors) * 100) || 0}% Aktif`}
              tooltip="Jumlah total petugas yang terdaftar di bank sampah Anda"
            />
            <StatCard
              icon={UserCheck}
              label="Petugas Aktif"
              value={stats.activeCollectors}
              tooltip="Jumlah petugas yang saat ini berstatus aktif dan dapat melakukan pengumpulan"
            />
            <StatCard
              icon={Package}
              label="Total Pengumpulan"
              value={stats.totalPickups || 0}
              tooltip="Jumlah total pengumpulan sampah yang telah dilakukan oleh semua petugas"
            />
            {/* <StatCard
              icon={Star}
              label="Rata-rata Rating"
              value={stats.avgRating || '0.0'}
              tooltip="Nilai rata-rata rating yang diberikan kepada petugas oleh nasabah"
            /> */}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Cari petugas berdasarkan nama, email, atau telepon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:placeholder:text-sm py-3"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </Select>
          </div>

          {/* Collectors List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
                <p className="text-zinc-500">Memuat data petugas...</p>
              </div>
            </div>
          ) : filteredCollectors.length === 0 ? (
            <div className="py-8 bg-white border rounded-xl border-zinc-200">
              <div className="flex items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-zinc-800">
                    Tidak ada petugas ditemukan
                  </h3>
                  <p className="text-zinc-500">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Coba sesuaikan filter atau kata kunci pencarian Anda'
                      : 'Mulai dengan menambahkan petugas pertama untuk bank sampah Anda'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCollectors.map((collector) => (
                <div
                  key={collector.id}
                  className="p-6 transition-all duration-200 bg-white border rounded-xl border-zinc-200 hover:border-emerald-500/20 hover:shadow-lg"
                >
                  {/* Collector Header */}
                  <div className="flex items-start justify-between mb-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-800 line-clamp-1">
                          {collector.profile?.fullName || 'Petugas Induk Tanpa Nama'}
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
                  <div className="space-y-4 text-start">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <MapPin className="flex-shrink-0 w-5 h-5 mt-1 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-left text-zinc-600">Lokasi</p>
                        <p className="text-sm text-zinc-500 line-clamp-2">
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
                    <div className="flex items-start gap-3 text-start">
                      <PhoneCall className="flex-shrink-0 w-5 h-5 mt-1 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Kontak</p>
                        <p className="text-sm text-zinc-500">{collector.profile?.phone || 'Belum ada nomor telepon'}</p>
                      </div>
                    </div>

                    {/* Joined Date */}
                    <div className="flex items-start gap-3">
                      <AlarmClock className="flex-shrink-0 w-5 h-5 mt-1 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Bergabung Sejak</p>
                        <p className="text-sm text-zinc-500">{formatDate(collector.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 mt-6 border-t border-zinc-200">
                    <Tooltip content="Hubungi petugas induk melalui nomor telepon yang terdaftar">
                      <button
                        onClick={() => collector.profile?.phone ? window.location.href = `tel:${collector.profile.phone}` : null}
                        className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm transition-colors rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!collector.profile?.phone}
                      >
                        <PhoneCall className="w-4 h-4" />
                        Hubungi
                      </button>
                    </Tooltip>
                    <Tooltip content="Kirim email kepada petugas induk">
                      <button
                        onClick={() => collector.email ? window.location.href = `mailto:${collector.email}` : null}
                        className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm transition-colors rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                    </Tooltip>
                    <Tooltip content={collector.status === 'active' ? 'Nonaktifkan petugas induk agar tidak dapat melakukan pengambilan' : 'Aktifkan petugas agar dapat melakukan pengambilan'}>
                      <button
                        onClick={() => updateCollectorStatus(
                          collector.id,
                          collector.status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm w-full justify-center ${collector.status === 'active'
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          } transition-colors`}
                      >
                        {collector.status === 'active' ? (
                          <>
                            <UserX className="w-4 h-4" />
                            Non-aktifkan
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Aktifkan
                          </>
                        )}
                      </button>
                    </Tooltip>
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