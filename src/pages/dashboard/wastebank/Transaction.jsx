import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  PhoneCall,
  Users,
  Truck,
  Container,
  TreePine,
  TreePineIcon,
  BoxSelectIcon,
  ChevronRight,
  ChevronLeft,
  Info,
  HelpCircle
} from 'lucide-react';
import { collection, query, doc, updateDoc, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import 'sweetalert2/dist/sweetalert2.css';

// Reusable Components
const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition duration-200 ease-in-out
      placeholder:text-zinc-400
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Tooltip component for additional information - modified to be toggle-based instead of hover
const Tooltip = ({ children, content }) => (
  <div className="relative flex items-start group">
    {children}
    <div className="absolute z-50 invisible w-48 p-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      <div className="text-left">{content}</div>
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

// Hover-based tooltip specifically for help icons (question mark)
const HoverTooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-50 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

// Information panel component - modified with collapsible behavior
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

const StatCard = ({ label, count, icon: Icon, description, className, tooltip }) => (
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
        <p className="mt-1 text-left text-2xl font-semibold text-zinc-800">{count}</p>
        {description && (
          <p className="hidden mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = "default", tooltip }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200"
  };

  const button = (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium 
        transition-all hover:shadow-sm ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
};

const PickupCard = ({ pickup, onStatusChange, onUpdatePoints, isProcessing }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    received: "bg-emerald-100 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200"
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': return Container;
      case 'received': return CheckCircle2;
      case 'completed': return CheckCircle2;
      case 'cancelled': return AlertCircle;
      default: return Package;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Translate status
  const translateStatus = (status) => {
    const statusMap = {
      'pending': 'Menunggu',
      'processing': 'Diproses',
      'received': 'Diterima',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const StatusIcon = getStatusIcon(pickup.status);
  const isDelivery = pickup.deliveryType === 'self-delivery';
  const isCompleted = pickup.status === 'completed';

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md group">
      {/* Status Bar with Delivery Type Indicator */}
      <div className="flex items-center">
        <div className={`h-1 flex-grow ${isDelivery ? 'bg-blue-100' : 'bg-emerald-100'}`} />
        <span className={`px-2 py-0.5 text-xs font-medium ${isDelivery ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isDelivery ? 'Antar Sendiri' : 'Jemput'}
        </span>
      </div>

      <div className="p-6">
        {/* Header with toggle */}
        <div className="flex items-start justify-between mb-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start gap-4">
            <div className="p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50">
              <Users className="w-6 h-6 text-gray-600 transition-colors group-hover:text-emerald-600" />
            </div>
            <div>
              <h3 className=" text-left text-lg font-semibold text-gray-800 transition-colors group-hover:text-emerald-600">
                {pickup.userName}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {pickup.phone || 'Tidak ada nomor telepon'}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusColors[pickup.status]}`}>
                  <StatusIcon className="w-4 h-4" />
                  {translateStatus(pickup.status)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-8 text-right">
            <div>
              <p className="text-xs text-gray-400">Dibuat Pada</p>
              <p className="text-sm font-medium text-gray-600">
                {formatDateTime(pickup.createdAt)}
              </p>
              {isCompleted && pickup.completedAt && (
                <>
                  <p className="mt-2 text-xs text-gray-400">Selesai Pada</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatDateTime(pickup.completedAt)}
                  </p>
                </>
              )}
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200
                ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>

        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <div className="flex transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50 p-4">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                <Calendar className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-700">Jadwal</p>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(pickup.date?.seconds * 1000).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-500">{pickup.time}</p>
              </div>
            </div>


            <div className="flex transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50 p-4">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                <MapPin className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-700">Lokasi</p>
                <p className="mt-1 text-sm text-gray-500">{pickup.location || "(-) Antar Sendiri"}</p>
                {pickup.notes && (
                  <p className="mt-1 text-sm italic text-gray-500">"{pickup.notes}"</p>
                )}
                {/* {pickup.coordinates && (
                  <p className="hidden mt-1 text-xs text-gray-500">
                    {pickup.coordinates.lat.toFixed(6)}, {pickup.coordinates.lng.toFixed(6)}
                  </p>
                )} */}
              </div>
            </div>

            {isCompleted ? (
              <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl">
                <TreePine className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-emerald-700">Hasil Pengumpulan</p>
                  <p className="mt-1 text-sm text-emerald-600">
                    Total Nilai: <span className="font-semibold">{formatCurrency(pickup.totalValue)}</span>
                  </p>
                  {pickup.pointsAmount && (
                    <p className="text-sm text-emerald-600">
                      Poin Diperoleh: <span className="font-semibold">{pickup.pointsAmount}</span> poin
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <Package className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Jenis Sampah</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pickup.wasteTypes?.map((type, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs border rounded-full bg-emerald-50 text-emerald-700 border-emerald-100"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Waste Details Table */}
          {isCompleted && pickup.wastes && (
            <div className="pt-6 mt-6 border-t border-gray-200">
              <h4 className="mb-4 text-sm font-medium text-gray-700">Detail Pengumpulan</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Jenis</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Berat (kg)</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(pickup.wastes).map(([type, data]) => (
                      <tr key={type}>
                        <td className="px-4 py-2 text-sm text-gray-700 capitalize">{type}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">{data.weight.toFixed(1)}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">{formatCurrency(data.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                      <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                        {Object.values(pickup.wastes).reduce((sum, data) => sum + data.weight, 0).toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-right text-emerald-600">
                        {formatCurrency(pickup.totalValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <QuickAction
              icon={Package}
              label="Ubah Status"
              onClick={() => onStatusChange(pickup)}
              variant={pickup.status === 'completed' ? 'success' : 'default'}
            // tooltip="Ubah status pengumpulan sampah"
            />
            {isCompleted && !pickup.pointsAdded && pickup.wastes && (
              <QuickAction
                icon={TreePine}
                label="Tambah Poin"
                variant="success"
                onClick={() => onUpdatePoints(pickup)}
                tooltip="Berikan poin rewards kepada pengguna"
              />
            )}
            {isCompleted && pickup.pointsAdded && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Poin Ditambahkan: {pickup.pointsAmount}
              </span>
            )}
          </div>

          {pickup.status === 'pending' && (
            <QuickAction
              icon={AlertCircle}
              label="Batalkan"
              variant="danger"
              onClick={() => onStatusChange(pickup)}
              tooltip="Batalkan permintaan pengumpulan ini"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Transaction = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const itemsPerPage = 5;

  // Fetch data when authenticated
  useEffect(() => {
    let pickupsUnsubscribe;
    let collectorsUnsubscribe;

    if (currentUser?.uid) {
      // Using closures to manage unsubscribe functions
      const unsubscribes = fetchInitialData();
      pickupsUnsubscribe = unsubscribes.pickupsUnsubscribe;
      collectorsUnsubscribe = unsubscribes.collectorsUnsubscribe;
    }

    // Cleanup function when component unmounts
    return () => {
      if (pickupsUnsubscribe) pickupsUnsubscribe();
      if (collectorsUnsubscribe) collectorsUnsubscribe();
    };
  }, [currentUser?.uid]);

  const fetchInitialData = () => {
    setLoading(true);
    setError(null);

    try {
      // Setup both listeners
      const pickupsUnsubscribe = setupPickupsListener();
      const collectorsUnsubscribe = setupCollectorsListener();

      return { pickupsUnsubscribe, collectorsUnsubscribe };
    } catch (err) {
      setError('Gagal memuat data. Silakan coba lagi.');
      Swal.fire({
        title: 'Error',
        text: 'Gagal memuat data',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
      setLoading(false);
      return { pickupsUnsubscribe: () => { }, collectorsUnsubscribe: () => { } };
    }
  };

  const setupPickupsListener = () => {
    if (!currentUser?.uid) {
      setError('Autentikasi diperlukan');
      return () => { };
    }

    try {
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid)
      );

      // Using onSnapshot instead of getDocs
      const unsubscribe = onSnapshot(
        pickupsQuery,
        (snapshot) => {
          const pickupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setPickups(pickupsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error memantau data pengumpulan:', error);
          setError('Gagal memuat data pengumpulan');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener pengumpulan:', error);
      setLoading(false);
      return () => { };
    }
  };

  const setupCollectorsListener = () => {
    try {
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'collector'),
        where('profile.institution', '==', userData.id)
      );

      // Using onSnapshot instead of getDocs
      const unsubscribe = onSnapshot(
        collectorsQuery,
        (snapshot) => {
          const collectorsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCollectors(collectorsData);
        },
        (error) => {
          console.error('Error memantau data petugas:', error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener petugas:', error);
      return () => { };
    }
  };

  const openChangeStatusModal = async (pickup) => {
    const statusOptions = [
      { value: 'pending', label: 'Menunggu', icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
      { value: 'assigned', label: 'Ditugaskan', icon: '🚛', color: 'bg-blue-50 text-blue-600' },
      // { value: 'in_progress', label: 'Dalam Proses', icon: '⏳', color: 'bg-green-50 text-green-600' },
      // { value: 'completed', label: 'Selesai', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
      { value: 'cancelled', label: 'Dibatalkan', icon: '❌', color: 'bg-red-50 text-red-600' }
    ];

    // Format collector options untuk dropdown
    const collectorOptions = collectors
      .map(collector => `
        <option value="${collector.id}" 
          ${pickup.collectorId === collector.id ? 'selected' : ''}
          ${collector.status !== 'active' ? 'disabled' : ''}>
          ${collector.profile?.fullName || collector.email || 'Petugas Tanpa Nama'}
          ${collector.status !== 'active' ? ' (Tidak Aktif)' : ''}
        </option>
      `).join('');

    const { value: formValues } = await Swal.fire({
      title: 'Perbarui Status Pengumpulan',
      width: 600,
      html: `
        <div class="text-left p-4">
          <!-- Current Status Display -->
          <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-medium text-gray-600 mb-2">Status Saat Ini</p>
            <div class="flex items-center gap-2">
              <span class="text-base">${statusOptions.find(s => s.value === pickup.status)?.icon}</span>
              <span class="font-medium ${statusOptions.find(s => s.value === pickup.status)?.color} px-3 py-1 rounded-lg">
                ${pickup.status === 'pending' ? 'Menunggu' :
          pickup.status === 'assigned' ? 'Ditugaskan' :
            pickup.status === 'in_progress' ? 'Dalam Proses' :
              pickup.status === 'completed' ? 'Selesai' :
                pickup.status === 'cancelled' ? 'Dibatalkan' :
                  pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
              </span>
            </div>
          </div>

          <!-- New Status Selection -->
          <div class="mb-6">
            <label for="newStatus" class="block text-sm font-medium text-gray-700 mb-2">
              Status Baru
            </label>
            <select id="newStatus" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${pickup.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Collector Selection -->
          <div id="collectorSelectDiv" class="mb-4" style="display: ${pickup.status === 'assigned' ? 'block' : 'none'}">
            <label for="collectorSelect" class="block text-sm font-medium text-gray-700 mb-2">
              Tugaskan Petugas
            </label>
            <select id="collectorSelect" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700">
              <option value="">Pilih petugas</option>
              ${collectorOptions}
            </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const statusSelect = document.getElementById('newStatus');
        const collectorDiv = document.getElementById('collectorSelectDiv');

        if (statusSelect && collectorDiv) {
          // Add event listener directly, without depending on external function
          statusSelect.addEventListener('change', (e) => {
            collectorDiv.style.display = e.target.value === 'assigned' ? 'block' : 'none';
          });
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Perbarui Status',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      customClass: {
        container: 'swal-custom-container',
        popup: 'swal-custom-popup rounded-xl',
        confirmButton: 'swal-custom-confirm-button',
        cancelButton: 'swal-custom-cancel-button'
      },
      preConfirm: () => {
        const newStatus = document.getElementById('newStatus').value;
        const collectorId = document.getElementById('collectorSelect')?.value;
        return { newStatus, collectorId };
      }
    });

    if (!formValues) return;

    try {
      setProcessing(true);
      const pickupRef = doc(db, 'pickups', pickup.id);
      const updates = {
        status: formValues.newStatus,
        updatedAt: new Date(),
      };

      if (formValues.newStatus === 'assigned' && formValues.collectorId) {
        updates.collectorId = formValues.collectorId;
      }

      if (formValues.newStatus === 'completed') {
        updates.completedAt = new Date();
      }

      await updateDoc(pickupRef, updates);
      // No need to call fetchPickups() manually since we're using onSnapshot

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: 'Status pengumpulan telah berhasil diperbarui.',
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error memperbarui status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memperbarui status. Silakan coba lagi.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePoints = async (pickup) => {
    if (!pickup.id || pickup.pointsAdded || !pickup.wastes || !pickup.userId) return;

    try {
      setProcessing(true);
      const pickupRef = doc(db, 'pickups', pickup.id);
      const userRef = doc(db, 'users', pickup.userId);

      // Calculate points based on actual waste weights
      let totalPoints = 0;
      Object.entries(pickup.wastes).forEach(([type, data]) => {
        // Basic points calculation: 10 points per kg
        // You can adjust this formula based on your requirements
        const pointsForType = Math.floor(data.weight * 10);
        totalPoints += pointsForType;
      });

      // Get current user data
      const userSnapshot = await getDoc(userRef);
      if (!userSnapshot.exists()) {
        throw new Error('Pengguna tidak ditemukan');
      }

      const userData = userSnapshot.data();
      const currentPoints = userData.rewards?.points || 0;
      const newTotalPoints = currentPoints + totalPoints;

      // Update both pickup and user documents
      await Promise.all([
        updateDoc(pickupRef, {
          pointsAdded: true,
          pointsAddedAt: new Date(),
          pointsAmount: totalPoints
        }),
        updateDoc(userRef, {
          'rewards.points': newTotalPoints,
          updatedAt: new Date()
        })
      ]);

      // No need to call fetchPickups() manually since we're using onSnapshot

      Swal.fire({
        icon: 'success',
        title: 'Poin Ditambahkan',
        text: `${totalPoints} poin telah berhasil ditambahkan. Total poin pelanggan: ${newTotalPoints}`,
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error menambahkan poin:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal menambahkan poin. Silakan coba lagi.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter pickups based on status, search term, and date range
  const filteredPickups = pickups.filter(pickup => {
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const matchesSearch =
      pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickup.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filtering
    const pickupDate = pickup.date ? new Date(pickup.date.seconds * 1000) : null;
    const matchesDateRange = (!startDate || !endDate || !pickupDate) ? true : (
      pickupDate >= new Date(startDate) &&
      pickupDate <= new Date(endDate)
    );

    return matchesStatus && matchesSearch && matchesDateRange;
  });

  // Sort and filter pickups
  const sortedAndFilteredPickups = filteredPickups.sort((a, b) => {
    const aValue = a[sortBy]?.seconds || 0;
    const bValue = b[sortBy]?.seconds || 0;
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedAndFilteredPickups.length / itemsPerPage);
  const paginatedPickups = sortedAndFilteredPickups.slice(
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

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, sortedAndFilteredPickups.length)} dari{' '}
          {sortedAndFilteredPickups.length} hasil
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft />
        </button>
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index + 1}
            onClick={() => setCurrentPage(index + 1)}
            className={`px-3 py-1 text-sm border rounded-md ${currentPage === index + 1
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
          <ChevronRight />
        </button>
      </div>
    </div>
  );

  // Get counts for each status
  const statusCounts = pickups.reduce((acc, pickup) => {
    acc[pickup.status] = (acc[pickup.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Package className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Pengumpulan Sampah</h1>
              <p className="text-sm text-gray-500">
                Kelola dan pantau semua permintaan pengumpulan sampah
              </p>
            </div>
          </div>

          {/* Information Panel with ID for direct access */}
          <div id="infoPanel">
            <InfoPanel title="Informasi">
              <p className="text-left">
                Halaman ini untuk mengelola semua permintaan pengumpulan sampah.
                Anda dapat mengubah status pengumpulan, menugaskan petugas, dan menambahkan poin reward untuk pengguna.
              </p>
              <div className="mt-4">
                <span className="font-semibold">Catatan</span>: Data ditampilkan secara real-time dan akan diperbarui secara otomatis ketika terjadi perubahan.
              </div>
            </InfoPanel>
          </div>

          {/* Status Cards - with less intrusive tooltips */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Pengumpulan"
              count={pickups.length}
              icon={Package}
              // description="Total semua pengumpulan"
              tooltip="Jumlah keseluruhan permintaan pengumpulan yang tercatat dalam sistem"
            />
            <StatCard
              label="Menunggu"
              count={statusCounts.pending || 0}
              icon={Clock}
              // description="Belum diproses"
              className="border-yellow-200"
              tooltip="Permintaan pengumpulan yang belum diproses atau ditugaskan ke petugas"
            />
            <StatCard
              label="Sedang Diproses"
              count={statusCounts.processing || 0}
              icon={Truck}
              // description="Sedang dalam pengumpulan"
              className="border-blue-200"
              tooltip="Permintaan pengumpulan yang sedang dalam proses pengambilan oleh petugas"
            />
            <StatCard
              label="Selesai"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              // description="Berhasil diselesaikan"
              className="border-emerald-200"
              tooltip="Permintaan pengumpulan yang telah berhasil diselesaikan"
            />
          </div>

          {/* Combined Filters, Search, and Sort - Single Row Layout */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Field */}
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Cari berdasarkan nama pelanggan atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:placeholder:text-sm py-3"
                />
              </div>

              {/* Date Range - Compact Inline Format */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="mm/dd/yy"
                  className="w-full md:w-40 py-3"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="mm/dd/yy"
                  className="w-full md:w-40 py-3"
                />
              </div>

              {/* Status Filter with Label */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm text-gray-600 whitespace-nowrap">Status:</span>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full md:w-40 py-3"
                >
                  <option value="all">Semua</option>
                  <option value="pending">Menunggu</option>
                  <option value="processing">Diproses</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </Select>
              </div>

              {/* Sort Dropdown with Label */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm text-gray-600 whitespace-nowrap">Urutkan:</span>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="w-full md:w-40 py-3"
                >
                  <option value="createdAt-desc">Terbaru Dibuat</option>
                  <option value="createdAt-asc">Terlama Dibuat</option>
                  <option value="completedAt-desc">Terbaru Selesai</option>
                  <option value="completedAt-asc">Terlama Selesai</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Pickup Cards with Pagination */}
          <div className="pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="ml-3 text-gray-600">Memuat data pengumpulan...</span>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-red-500">{error}</p>
                <button
                  className="px-4 py-2 mt-4 text-white rounded-lg bg-emerald-500"
                  onClick={fetchInitialData}
                >
                  Coba Lagi
                </button>
              </div>
            ) : sortedAndFilteredPickups.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Tidak ada data pengumpulan ditemukan</p>
                <p className="mt-2 text-sm text-gray-400">Coba sesuaikan filter pencarian Anda</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 mb-6">
                  {paginatedPickups.map((pickup) => (
                    <PickupCard
                      key={pickup.id}
                      pickup={pickup}
                      onStatusChange={openChangeStatusModal}
                      onUpdatePoints={handleUpdatePoints}
                      isProcessing={processing}
                    />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transaction;
