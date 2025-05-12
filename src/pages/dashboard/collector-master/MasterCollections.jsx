import React, { useState, useEffect } from 'react';
import { 
  Package, ArrowRight, Loader2, Search, CheckCircle2, CalendarIcon,
  User, MapPin, AlertCircle, Scale, ArrowUp, Coins, HelpCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { Link, useNavigate } from 'react-router-dom';
import { calculatePoints, calculateTotalValue, POINTS_CONVERSION_RATE } from '../../../lib/constants';

// Reusable components
const Input = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2.5 bg-white border border-gray-200 rounded-lg
      text-gray-700 text-sm transition-all
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

// Tooltip component for explanations
const Tooltip = ({ text, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-10 w-64 px-3 py-2 -mt-1 text-xs text-white transition-all duration-200 transform scale-0 -translate-x-1/2 bg-gray-800 rounded-lg opacity-0 pointer-events-none bottom-full left-1/2 group-hover:scale-100 group-hover:opacity-100">
      {text}
      <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 -mt-1 left-1/2 -translate-x-1/2 bottom-[-6px]"></div>
    </div>
  </div>
);

const Badge = ({ variant = "default", children }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
};

// Get translated waste type name
const getWasteTypeName = (type) => {
  const typeMap = {
    'plastic': 'Plastik',
    'paper': 'Kertas',
    'glass': 'Kaca',
    'metal': 'Logam',
    'organic': 'Organik',
    'electronic': 'Elektronik'
  };
  return typeMap[type] || type;
};

// Get translated status
const getStatusName = (status) => {
  const statusMap = {
    'pending': 'Menunggu',
    'assigned': 'Ditugaskan',
    'in_progress': 'Sedang Diproses',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan'
  };
  return statusMap[status] || status.replace('_', ' ');
};

const PickupCard = ({ pickup, onSelectPickup }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate total bags and points
  const totalBags = pickup.wastes 
    ? Object.values(pickup.wastes).reduce((sum, waste) => sum + Math.ceil(waste.weight / 5), 0)
    : 0;

  const pointsAmount = pickup.wastes ? calculatePoints(calculateTotalValue(pickup.wastes)) : 0;

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">
              {pickup.userName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={pickup.status}>{getStatusName(pickup.status)}</Badge>
              <span className="text-sm text-gray-500">
                Pengambilan #{pickup.id.slice(-6)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Poin</p>
            <p className="text-sm font-medium text-emerald-600">+{pointsAmount}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{pickup.location}</p>
              {pickup.notes && (
                <p className="mt-1 text-xs italic text-gray-500">"{pickup.notes}"</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{totalBags} kantong total</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {pickup.wastes && Object.entries(pickup.wastes).map(([type, data]) => (
                  <span key={type} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {getWasteTypeName(type)}: {data.weight}kg
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Bank Sampah:</span> {pickup.wasteBankName || 'Tidak ditentukan'}
            </p>
          </div>
          <button
            onClick={() => onSelectPickup(pickup.id)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Perbarui Berat <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CollectorCollections = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showHelp, setShowHelp] = useState(false);
  const itemsPerPage = 6;
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe;

    if (currentUser?.uid) {
      setLoading(true);
      try {
        const pickupsQuery = query(
          collection(db, 'masterBankRequests'),
          where('collectorId', '==', currentUser.uid),
          where('status', '==', 'in_progress')
        );
        
        unsubscribe = onSnapshot(
          pickupsQuery,
          (snapshot) => {
            const pickupsData = snapshot.docs.map(doc => {
              const data = doc.data();
              const totalValue = data.wastes ? calculateTotalValue(data.wastes) : 0;
              return {
                id: doc.id,
                ...data,
                totalValue,
                pointsAmount: calculatePoints(totalValue)
              };
            });

            setPickups(pickupsData);
            setError(null);
            setLoading(false);
          },
          (err) => {
            console.error('Error mengambil data pengambilan sampah:', err);
            setError('Gagal memuat data pengambilan. Silakan coba lagi.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error menyiapkan listener pengambilan sampah:', err);
        setError('Gagal memuat data pengambilan. Silakan coba lagi.');
        setLoading(false);
      }
    }

    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.uid]);

  // Maintained for compatibility with Try Again button
  const fetchInProgressPickups = () => {
    setLoading(true);
    // The actual refresh happens through the onSnapshot listener
    setTimeout(() => {
      if (loading) setLoading(false);
    }, 1000);
  };

  const handleSelectPickup = (pickupId) => {
    navigate(`/dashboard/collector/update-collection/${pickupId}`);
  };

  const filteredAndSortedPickups = pickups
    .filter(pickup => {
      const matchesSearch = pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const pickupDate = pickup.date ? new Date(pickup.date.seconds * 1000) : null;
      const matchesDateRange = (!startDate || !endDate || !pickupDate) ? true : (
        pickupDate >= new Date(startDate) &&
        pickupDate <= new Date(endDate)
      );

      return matchesSearch && matchesDateRange;
    })
    .sort((a, b) => {
      const aValue = a[sortBy]?.seconds || 0;
      const bValue = b[sortBy]?.seconds || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

  const totalPages = Math.ceil(filteredAndSortedPickups.length / itemsPerPage);
  const paginatedPickups = filteredAndSortedPickups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 mt-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, filteredAndSortedPickups.length)} dari{' '}
          {filteredAndSortedPickups.length} hasil
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Sebelumnya
        </button>
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index + 1}
            onClick={() => setCurrentPage(index + 1)}
            className={`px-3 py-1 text-sm border rounded-md ${
              currentPage === index + 1
                ? 'bg-emerald-500 text-white'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="ml-2 text-gray-600">Memuat data pengambilan...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
      <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Manajemen Pengambilan Sampah</h1>
            <p className="text-sm text-gray-500">Perbarui berat sampah dan hitung poin untuk pengambilan yang sedang berlangsung</p>
          </div>
          
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 transition-colors border border-blue-100 rounded-lg bg-blue-50 hover:bg-blue-100"
          >
            <HelpCircle className="w-4 h-4" />
            {showHelp ? 'Sembunyikan Bantuan' : 'Tampilkan Bantuan'}
          </button>
        </div>

        {/* Help Section */}
        {showHelp && (
          <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
            <h3 className="mb-2 font-medium text-blue-700">Panduan Penggunaan:</h3>
            <ul className="ml-6 text-sm text-blue-700 list-disc">
              <li className="mb-1">Halaman ini menampilkan semua pengambilan sampah yang sedang dalam proses pengerjaan oleh Anda.</li>
              <li className="mb-1">Klik tombol "Perbarui Berat" untuk mencatat berat sampah yang sebenarnya pada pengambilan.</li>
              <li className="mb-1">Poin dihitung berdasarkan jenis dan berat sampah yang diambil. 1 poin bernilai Rp {POINTS_CONVERSION_RATE}.</li>
              <li className="mb-1">Gunakan filter pencarian dan tanggal untuk menemukan pengambilan tertentu.</li>
              <li className="mb-1">Data di halaman ini diperbarui secara otomatis (real-time) ketika ada perubahan.</li>
            </ul>
          </div>
        )}

        {/* Filters, Search, and Sort */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 gap-4">
              <Tooltip text="Cari berdasarkan nama pelanggan atau lokasi pengambilan">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari pengambilan..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Tooltip>
              <Tooltip text="Filter berdasarkan rentang tanggal pengambilan">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-gray-500">hingga</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </Tooltip>
            </div>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Urutkan berdasarkan:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('createdAt')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                  ${sortBy === 'createdAt' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Tanggal Dibuat
                {sortBy === 'createdAt' && (
                  <span className="text-xs">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleSort('completedAt')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                  ${sortBy === 'completedAt' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Tanggal Selesai
                {sortBy === 'completedAt' && (
                  <span className="text-xs">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Pengambilan</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{pickups.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <Tooltip text="Nilai 1 poin setara dengan Rp 1.000. Poin dihitung otomatis berdasarkan jenis dan berat sampah.">
            <div className="p-5 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Perhitungan Poin</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-800">
                    1 poin / {POINTS_CONVERSION_RATE} Rp
                  </p>
                  <p className="text-xs text-gray-500">Berdasarkan jenis dan berat sampah</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Coins className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip text="Anda perlu mencatat berat semua jenis sampah yang dikumpulkan">
            <div className="p-5 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Berat yang Diperlukan</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-800">Semua Jenis</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-50">
                  <Scale className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Collections List with Pagination */}
        {error ? (
          <div className="p-4 mb-6 text-red-700 rounded-lg bg-red-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <button
              onClick={fetchInProgressPickups}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredAndSortedPickups.length === 0 ? (
          <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-700">Tidak Ada Pengambilan Sedang Diproses</h3>
            <p className="max-w-md mx-auto mb-6 text-gray-500">
              Saat ini tidak ada pengambilan sampah yang sedang diproses oleh Anda.
              Periksa kembali nanti atau hubungi bank sampah.
            </p>
            <Link
              to="/dashboard/collector/assignments"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Lihat Penugasan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {paginatedPickups.map(pickup => (
                <PickupCard
                  key={pickup.id}
                  pickup={pickup}
                  onSelectPickup={handleSelectPickup}
                />
              ))}
            </div>
            <Pagination />
          </>
        )}
      </main>
    </div>
  );
};

export default CollectorCollections;