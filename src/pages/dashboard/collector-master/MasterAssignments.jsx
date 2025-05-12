import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  MapPin, 
  Calendar,
  Clock,
  Package,
  User,
  Phone,
  Loader2,
  AlertCircle,
  Filter,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// Reusable components
const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
      text-gray-700 text-sm transition-all
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg 
      text-gray-700 text-sm transition-all
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

const Badge = ({ variant = "default", children, className = "" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Translated status labels
const getStatusLabel = (status) => {
  const statusMap = {
    'assigned': 'Ditugaskan',
    'in_progress': 'Sedang Diproses',
    'completed': 'Selesai', 
    'cancelled': 'Dibatalkan',
    'pending': 'Menunggu'
  };
  return statusMap[status] || status?.charAt(0).toUpperCase() + status?.slice(1) || '';
};

const LocationDisplay = ({ location }) => {
  // Jika location adalah objek kompleks, ambil address-nya
  const address = typeof location === 'object' ? location.address : location;

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50">
      <MapPin className="w-5 h-5 mt-1 text-blue-500" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-blue-900">Alamat Pengambilan</p>
          <p className="mt-1 text-sm text-blue-700">
            {address || 'Alamat tidak tersedia'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Tooltip Component for explanations
const Tooltip = ({ text, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-10 w-48 px-3 py-2 -mt-1 text-xs text-white transition-all duration-200 transform scale-0 -translate-x-1/2 bg-gray-800 rounded-lg opacity-0 pointer-events-none bottom-full left-1/2 group-hover:scale-100 group-hover:opacity-100">
      {text}
      <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 -mt-1 left-1/2 -translate-x-1/2 bottom-[-6px]"></div>
    </div>
  </div>
);

const PickupCard = ({ pickup, onSelect }) => {
  const navigate = useNavigate();
  // Calculate estimated total bags from wasteQuantities
  const totalBags = Object.values(pickup.wasteQuantities || {}).reduce((sum, quantity) => sum + quantity, 0);

  const handleAction = (pickup, newStatus) => {
    if (newStatus === 'in_progress') {
      onSelect(pickup, newStatus);
    } else if (newStatus === 'completed') {
      if (pickup.id) {
        navigate(`/dashboard/collector/update-collection/${pickup.id}`);
      } else {
        Swal.fire({
          title: 'Error',
          text: 'ID pengambilan tidak ditemukan',
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
      }
    }
  };

  // Translated waste type names
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

  return (
    <div className="p-6 transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Pengambilan #{pickup.id?.slice(0, 6)}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={pickup.status}>
                {getStatusLabel(pickup.status)}
              </Badge>
              <Badge variant="default">
                {pickup.deliveryType === 'self-delivery' ? 'Antar Sendiri' : 'Jemput'}
              </Badge>
            </div>
          </div>
        </div>
        <Badge variant="default">{pickup.time}</Badge>
      </div>

      {/* Customer Info */}
      <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-gray-50">
        <User className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{pickup.userName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">{pickup.phone || 'Tidak ada nomor telepon'}</p>
          </div>
          {pickup.wasteBankName && (
            <p className="mt-1 text-sm text-gray-600">
              Bank Sampah: {pickup.wasteBankName}
            </p>
          )}
        </div>
      </div>

      {/* Pickup Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Waktu Pengambilan</p>
            <p className="text-sm font-medium text-gray-900">{pickup.time}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Jumlah Sampah</p>
            <p className="text-sm font-medium text-gray-900">{totalBags} kantong</p>
          </div>
        </div>
      </div>

      {/* Waste Types */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(pickup.wasteQuantities || {}).map(([type, quantity]) => (
            <Badge key={type} variant="default">
              {getWasteTypeName(type)}: {quantity} kantong
            </Badge>
          ))}
        </div>
      </div>

      {/* Location */}
      <LocationDisplay location={pickup.location} />

      {/* Actions */}
      {(pickup.status === 'assigned' || pickup.status === 'in_progress') && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          {pickup.status === 'assigned' ? (
            <button 
              onClick={() => handleAction(pickup, 'in_progress')}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
            >
              <Truck className="w-4 h-4" />
              Mulai Pengambilan
            </button>
          ) : (
            <button 
              onClick={() => handleAction(pickup, 'completed')}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              <Scale className="w-4 h-4" />
              Catat Hasil Pengambilan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MasterAssignments = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showHelp, setShowHelp] = useState(false);
  const itemsPerPage = 6;

  // Keep existing onSnapshot implementation
  useEffect(() => {
    let unsubscribe;

    if (currentUser?.uid) {
      setLoading(true);
      try {
        const assignmentsQuery = query(
          collection(db, 'masterBankRequests'),
          where('collectorId', '==', currentUser.uid),
          where('status', 'in', ['assigned', 'in_progress', 'completed'])
        );
        
        unsubscribe = onSnapshot(
          assignmentsQuery,
          (snapshot) => {
            const assignmentsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                location: data.location || 'Lokasi tidak tersedia',
                userName: String(data.userName || ''),
                status: data.status || 'pending',
                date: data.date || { seconds: Date.now() / 1000 },
                time: data.time || '',
                phone: data.phone || '',
                wasteQuantities: data.wasteQuantities || {},
                ...data
              };
            });
        
            console.log('Data penugasan berhasil diambil:', assignmentsData);
            setAssignments(assignmentsData);
            setError(null);
            setLoading(false);
          },
          (err) => {
            console.error('Error mengambil data penugasan:', err);
            setError('Gagal memuat penugasan. Silakan coba lagi.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error menyiapkan listener penugasan:', err);
        setError('Gagal memuat penugasan. Silakan coba lagi.');
        setLoading(false);
      }
    }

    // Clean up the listener when the component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.uid]);

  const fetchAssignments = async () => {
    setLoading(true);
    setLoading(false);
  };

  const handleStatusChange = async (assignment, newStatus) => {
    try {
      if ((assignment.status === 'assigned' && newStatus === 'in_progress') ||
          (assignment.status === 'in_progress' && newStatus === 'completed')) {
        
        const pickupRef = doc(db, 'masterBankRequests', assignment.id);
        await updateDoc(pickupRef, {
          status: newStatus,
          updatedAt: new Date()
        });

        Swal.fire({
          title: 'Status Diperbarui',
          text: `Pengambilan telah ${newStatus === 'in_progress' ? 'dimulai' : 'diselesaikan'} dengan sukses`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 2000,
          timerProgressBar: true
        });
      }
    } catch (error) {
      console.error('Error memperbarui status pengambilan:', error);
      Swal.fire({
        title: 'Gagal Memperbarui',
        text: 'Gagal memperbarui status pengambilan. Silakan coba lagi.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusFilterLabel = (status) => {
    const statusMap = {
      'all': 'Semua Status',
      'assigned': 'Ditugaskan',
      'in_progress': 'Sedang Diproses',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
  };

  const filteredAndSortedAssignments = assignments.filter(assignment => {
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    const locationMatch = typeof assignment.location === 'string' && 
      assignment.location.toLowerCase().includes(searchTerm.toLowerCase());
    const userNameMatch = typeof assignment.userName === 'string' && 
      assignment.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = !searchTerm || locationMatch || userNameMatch;
    
    const assignmentDate = assignment.date ? new Date(assignment.date.seconds * 1000) : null;
    const matchesDateRange = (!startDate || !endDate || !assignmentDate) ? true : (
      assignmentDate >= new Date(startDate) &&
      assignmentDate <= new Date(endDate)
    );

    return matchesStatus && matchesSearch && matchesDateRange;
  }).sort((a, b) => {
    const aValue = a[sortBy]?.seconds || 0;
    const bValue = b[sortBy]?.seconds || 0;
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const totalPages = Math.ceil(filteredAndSortedAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAndSortedAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 mt-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, filteredAndSortedAssignments.length)} dari{' '}
          {filteredAndSortedAssignments.length} hasil
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Penugasan Saya</h1>
              <p className="text-sm text-gray-500">Kelola tugas pengambilan sampah Anda</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
              <p className="text-sm text-gray-500">Pengambilan Hari Ini</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {assignments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
              <p className="text-sm text-gray-500">Sedang Diproses</p>
              <p className="text-2xl font-semibold text-blue-600">
                {assignments.filter(a => a.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
              <p className="text-sm text-gray-500">Menunggu Diproses</p>
              <p className="text-2xl font-semibold text-blue-600">
                {assignments.filter(a => a.status === 'assigned').length}
              </p>
            </div>
          </div>
        </div>
        
        {/* Help section - can be toggled */}
        <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-blue-800">Panduan Penggunaan</h3>
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-700 hover:text-blue-900"
            >
              {showHelp ? 'Sembunyikan' : 'Tampilkan Panduan'}
            </button>
          </div>
          
          {showHelp && (
            <div className="text-sm text-blue-700">
              <p className="mb-2">Halaman ini menampilkan semua penugasan pengambilan sampah yang diberikan kepada Anda.</p>
              <ul className="ml-4 list-disc">
                <li className="mb-1">Status <strong>Ditugaskan</strong>: Tugas telah diberikan, Anda perlu mengambil sampah di lokasi.</li>
                <li className="mb-1">Status <strong>Sedang Diproses</strong>: Anda sedang dalam proses pengambilan sampah.</li>
                <li className="mb-1">Status <strong>Selesai</strong>: Pengambilan telah selesai dan sampah telah dicatat.</li>
                <li className="mb-1">Klik tombol <strong>Mulai Pengambilan</strong> untuk memulai proses.</li>
                <li className="mb-1">Klik tombol <strong>Catat Hasil Pengambilan</strong> untuk menyelesaikan dan mencatat jenis sampah yang diambil.</li>
                <li className="mb-1">Gunakan filter untuk mencari tugas berdasarkan lokasi, tanggal, atau status.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <Input
                type="text"
                placeholder="Cari berdasarkan lokasi atau nama pelanggan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tooltip text="Pilih rentang tanggal untuk memfilter penugasan berdasarkan tanggal pengambilan">
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

            <Tooltip text="Filter berdasarkan status penugasan">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-48"
              >
                <option value="all">Semua Status</option>
                <option value="assigned">Ditugaskan</option>
                <option value="in_progress">Sedang Diproses</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
            </Tooltip>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Urutkan berdasarkan:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('date')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                  ${sortBy === 'date' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Tanggal Pengambilan
                {sortBy === 'date' && (
                  <span className="text-xs">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
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
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 mb-4 animate-spin text-emerald-500" />
            <p className="text-gray-500">Memuat penugasan...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 mb-4 text-red-500" />
            <p className="text-gray-500">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-4 py-2 mt-4 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredAndSortedAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Truck className="w-12 h-12 mb-4 text-gray-400" />
            <h3 className="mb-1 text-lg font-medium text-gray-900">Tidak ada penugasan ditemukan</h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Coba sesuaikan filter Anda'
                : 'Anda belum memiliki tugas pengambilan sampah'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {paginatedAssignments.map((assignment) => (
                <PickupCard 
                  key={assignment.id} 
                  pickup={assignment} 
                  onSelect={handleStatusChange}
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

export default MasterAssignments;