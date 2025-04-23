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
  ChevronRight
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, where, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2/dist/sweetalert2.js';
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

const StatusCard = ({ label, count, icon: Icon, description, className }) => (
  <div className={`bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-gray-50 rounded-lg w-fit group-hover:bg-emerald-50 transition-colors">
          <Icon className="w-5 h-5 text-gray-600 transition-colors group-hover:text-emerald-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-800">{count}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = "default" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200"
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
        transition-all hover:shadow-sm ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
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

  const StatusIcon = getStatusIcon(pickup.status);
  const isDelivery = pickup.deliveryType === 'self-delivery';
  const isCompleted = pickup.status === 'completed';

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md group">
      {/* Status Bar with Delivery Type Indicator */}
      <div className="flex items-center">
        <div className={`h-1 flex-grow ${statusColors[pickup.status]?.replace('text-', 'bg-').split(' ')[0]}`} />
        <span className={`px-2 py-0.5 text-xs font-medium ${isDelivery ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isDelivery ? 'Self Delivery' : 'Pickup'}
        </span>
      </div>
      
      <div className="p-6">
        {/* Header with toggle */}
        <div className="flex items-start justify-between mb-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start gap-4">
            <div className="p-3 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50">
              <Users className="w-6 h-6 text-gray-600 transition-colors group-hover:text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 transition-colors group-hover:text-emerald-600">
                {pickup.userName}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {pickup.phone || 'No phone number'}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusColors[pickup.status]}`}>
                  <StatusIcon className="w-4 h-4" />
                  {pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4 text-right">
            <div>
              <p className="text-xs text-gray-400">Created At</p>
              <p className="text-sm font-medium text-gray-600">
                {formatDateTime(pickup.createdAt)}
              </p>
              {isCompleted && pickup.completedAt && (
                <>
                  <p className="mt-2 text-xs text-gray-400">Completed At</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatDateTime(pickup.completedAt)}
                  </p>
                </>
              )}
            </div>
            <ChevronRight 
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 mt-2
                ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>

        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
              <Calendar className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Schedule</p>
                <p className="mt-1 text-sm text-gray-600">
                  {new Date(pickup.date?.seconds * 1000).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-500">{pickup.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
              <MapPin className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Location</p>
                <p className="mt-1 text-sm text-gray-600">{pickup.location}</p>
                {pickup.notes && (
                  <p className="mt-1 text-sm italic text-gray-500">"{pickup.notes}"</p>
                )}
                {pickup.coordinates && (
                  <p className="mt-1 text-xs text-gray-500">
                    {pickup.coordinates.lat.toFixed(6)}, {pickup.coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            {isCompleted ? (
              <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl">
                <TreePine className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Collection Results</p>
                  <p className="mt-2 text-sm text-emerald-600">
                    Total Value: <span className="font-semibold">{formatCurrency(pickup.totalValue)}</span>
                  </p>
                  {pickup.pointsAmount && (
                    <p className="text-sm text-emerald-600">
                      Points Earned: <span className="font-semibold">{pickup.pointsAmount}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <Package className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Waste Types</p>
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
              <h4 className="mb-4 text-sm font-medium text-gray-700">Collection Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Weight (kg)</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Value</th>
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
              label="Change Status"
              onClick={() => onStatusChange(pickup)}
              variant={pickup.status === 'completed' ? 'success' : 'default'}
            />
            {isCompleted && !pickup.pointsAdded && pickup.wastes && (
              <QuickAction
                icon={TreePine}
                label="Add Points"
                variant="success"
                onClick={() => onUpdatePoints(pickup)}
              />
            )}
            {isCompleted && pickup.pointsAdded && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Points Added: {pickup.pointsAmount}
              </span>
            )}
          </div>
          
          {pickup.status === 'pending' && (
            <QuickAction
              icon={AlertCircle}
              label="Cancel"
              variant="danger"
              onClick={() => onStatusChange(pickup)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Transaction = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Fetch data when authenticated
  useEffect(() => {
    if (currentUser?.uid) {
      fetchInitialData();
      fetchCollectors();
    }
  }, [currentUser?.uid]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPickups();
    } catch (err) {
      setError('Failed to load data. Please try again.');
      Swal.fire({
        title: 'Error',
        text: 'Failed to load data',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPickups = async () => {
    if (!currentUser?.uid) {
      setError('Authentication required');
      return;
    }
    
    try {
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(pickupsQuery);
      const pickupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPickups(pickupsData);
    } catch (error) {
      console.error('Error fetching pickups:', error);
      throw error;
    }
  };

  const fetchCollectors = async () => {
    try {
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'collector'),
        where('profile.institution', '==', userData.id)
      );
      const snapshot = await getDocs(collectorsQuery);
      const collectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCollectors(collectorsData);
    } catch (error) {
      console.error('Error fetching collectors:', error);
    }
  };

  const openChangeStatusModal = async (pickup) => {
    const statusOptions = [
      { value: 'pending', label: 'Pending', icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
      { value: 'assigned', label: 'Assigned', icon: '🚛', color: 'bg-blue-50 text-blue-600' },
      { value: 'in_progress', label: 'In Progress', icon: '⏳', color: 'bg-green-50 text-green-600' },
      { value: 'completed', label: 'Completed', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
      { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'bg-red-50 text-red-600' }
    ];

    const handleCollectorSelect = (status) => {
      const collectorDiv = document.getElementById('collectorSelectDiv');
      if (collectorDiv) {
        collectorDiv.style.display = status === 'assigned' ? 'block' : 'none';
      }
    };

    // Format collector options untuk dropdown
    const collectorOptions = collectors
      .map(collector => `
        <option value="${collector.id}" 
          ${pickup.collectorId === collector.id ? 'selected' : ''}
          ${collector.status !== 'active' ? 'disabled' : ''}>
          ${collector.profile?.fullName || collector.email || 'Unnamed Collector'}
          ${collector.status !== 'active' ? ' (Inactive)' : ''}
        </option>
      `).join('');

    const { value: formValues } = await Swal.fire({
      title: 'Update Pickup Status',
      width: 600,
      html: `
        <div class="text-left p-4">
          <!-- Current Status Display -->
          <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-medium text-gray-600 mb-2">Current Status</p>
            <div class="flex items-center gap-2">
              <span class="text-base">${statusOptions.find(s => s.value === pickup.status)?.icon}</span>
              <span class="font-medium ${statusOptions.find(s => s.value === pickup.status)?.color} px-3 py-1 rounded-lg">
                ${pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
              </span>
            </div>
          </div>

          <!-- New Status Selection -->
          <div class="mb-6">
            <label for="newStatus" class="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select id="newStatus" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700" onchange="handleStatusChange(this.value)">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${pickup.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Collector Selection - Always visible but conditionally required -->
          <div id="collectorSelectDiv" class="mb-4">
            <label for="collectorSelect" class="block text-sm font-medium text-gray-700 mb-2">
              Assign Collector
            </label>
            <select id="collectorSelect" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700">
              <option value="">Select a collector</option>
              ${collectorOptions}
            </select>
            <p class="mt-2 text-xs text-gray-500 italic">
              * Only active collectors can be assigned to pickups
            </p>
          </div>
        </div>
      `,
      didOpen: () => {
        const statusSelect = document.getElementById('newStatus');
        if (statusSelect) {
          handleCollectorSelect(statusSelect.value);
          statusSelect.addEventListener('change', (e) => handleCollectorSelect(e.target.value));
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      cancelButtonText: 'Cancel',
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
      await fetchPickups();

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: 'The pickup status has been successfully updated.',
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update status. Please try again.',
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
        throw new Error('User not found');
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

      await fetchPickups();

      Swal.fire({
        icon: 'success',
        title: 'Points Added',
        text: `${totalPoints} points have been successfully added. Customer's total points: ${newTotalPoints}`,
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error updating points:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add points. Please try again.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter pickups based on status and search term
  const filteredPickups = pickups.filter(pickup => {
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const matchesSearch = 
      pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickup.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Pengumpulan Sampah</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola dan pantau semua permintaan pengumpulan sampah
                </p>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label="Total Pengumpulan"
              count={pickups.length}
              icon={Package}
              description="Total semua pengumpulan"
            />
            <StatusCard
              label="Menunggu"
              count={statusCounts.pending || 0}
              icon={Clock}
              description="Belum diproses"
              className="border-yellow-200"
            />
            <StatusCard
              label="Sedang Diproses"
              count={statusCounts.processing || 0}
              icon={Truck}
              description="Sedang dalam pengumpulan"
              className="border-blue-200"
            />
            <StatusCard
              label="Selesai"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              description="Berhasil diselesaikan"
              className="border-emerald-200"
            />
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Cari berdasarkan nama pelanggan atau lokasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </Select>
          </div>

          {/* Pickup Cards */}
          <div className="pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : filteredPickups.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Tidak ada data pengumpulan ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredPickups.map((pickup) => (
                  <PickupCard
                    key={pickup.id}
                    pickup={pickup}
                    onStatusChange={openChangeStatusModal}
                    onUpdatePoints={handleUpdatePoints}
                    isProcessing={processing}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transaction;
