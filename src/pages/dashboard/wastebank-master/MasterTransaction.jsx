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
  ChevronRight
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, where, onSnapshot } from 'firebase/firestore';
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

const PickupCard = ({ pickup, onStatusChange, isProcessing }) => {
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
                {pickup.wasteBankName}
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
                <p className="mt-1 text-sm text-gray-600">
                  {typeof pickup.location === 'object' ? pickup.location.address : pickup.location}
                </p>
                {pickup.notes && (
                  <p className="mt-1 text-sm italic text-gray-500">"{pickup.notes}"</p>
                )}
                {pickup.location && pickup.location.coordinates && (
                  <p className="mt-1 text-xs text-gray-500">
                    {pickup.location.coordinates.lat.toFixed(6)}, {pickup.location.coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            {isCompleted ? (
              <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl">
                <Container className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Collection Results</p>
                  <p className="mt-2 text-sm text-emerald-600">
                    Total Value: <span className="font-semibold">{formatCurrency(pickup.totalValue)}</span>
                  </p>
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

const MasterTransaction = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Fetch data when authenticated
  useEffect(() => {
    let unsubscribe;
    
    const fetchData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        console.log("Fetching requests for master bank ID:", currentUser.uid);
        
        // Create the query
        const requestsQuery = query(
          collection(db, 'masterBankRequests'),
          where('masterBankId', '==', currentUser.uid)
        );
        
        // Set up real-time listener
        unsubscribe = onSnapshot(requestsQuery, 
          (snapshot) => {
            console.log(`Found ${snapshot.size} masterBankRequests documents`);
            
            const requestsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              // Calculate derived fields
              totalWeight: Object.values(doc.data().wasteWeights || {})
                .reduce((sum, weight) => sum + Number(weight), 0),
              totalValue: Object.values(doc.data().wastes || {})
                .reduce((sum, waste) => sum + (Number(waste.value) || 0), 0),
            }));
            
            console.log("Retrieved data:", requestsData);
            setRequests(requestsData);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching requests:', error);
            setError('Failed to load collections. Please check your network connection and try again.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up listener:', err);
        setError('Failed to set up data connection. Please reload the page.');
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.uid]);

  const fetchCollectors = async () => {
    try {
      console.log('Fetching collectors for master bank:', currentUser.uid);
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master_collector'),
        where('profile.institution', '==', currentUser.uid)  // Changed to use profile.institution
      );
      const snapshot = await getDocs(collectorsQuery);
      const collectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched collectors:', collectorsData);
      setCollectors(collectorsData);
      return collectorsData;
    } catch (error) {
      console.error('Error fetching collectors:', error);
      return [];
    }
  };

  const openChangeStatusModal = async (request) => {
    // Fetch collectors first
    const currentCollectors = await fetchCollectors();
    
    const statusOptions = [
      { value: 'pending', label: 'Pending', icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
      { value: 'assigned', label: 'Assigned', icon: '🚛', color: 'bg-blue-50 text-blue-600' },
      { value: 'in_progress', label: 'In Progress', icon: '⏳', color: 'bg-green-50 text-green-600' },
      { value: 'completed', label: 'Completed', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
      { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'bg-red-50 text-red-600' }
    ];

    // Format collector options untuk dropdown
    const collectorOptions = currentCollectors
      .map(collector => `
        <option value="${collector.id}" 
          ${request.collectorId === collector.id ? 'selected' : ''}>
          ${collector.profile?.fullName || collector.email || 'Unnamed Collector'}
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
              <span class="text-base">${statusOptions.find(s => s.value === request.status)?.icon}</span>
              <span class="font-medium ${statusOptions.find(s => s.value === request.status)?.color} px-3 py-1 rounded-lg">
                ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
              transition-all shadow-sm text-gray-700">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${request.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Collector Selection -->
          <div id="collectorSelectDiv" class="mb-4" style="display: ${request.status === 'assigned' ? 'block' : 'none'}">
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
        const collectorDiv = document.getElementById('collectorSelectDiv');
        
        if (statusSelect) {
          statusSelect.addEventListener('change', (e) => {
            if (collectorDiv) {
              collectorDiv.style.display = e.target.value === 'assigned' ? 'block' : 'none';
            }
          });
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
      const requestRef = doc(db, 'masterBankRequests', request.id);
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

      await updateDoc(requestRef, updates);

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

  // Filter requests based on status and search term
  const filteredRequests = requests.filter(request => {
    console.log("Filtering request:", request);
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    console.log("Matches status:", matchesStatus, "filterStatus:", filterStatus, "request.status:", request.status);
    
    // If no searchTerm, consider it a match
    const matchesSearch = searchTerm === '' || 
      (request.userName && request.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.location && typeof request.location === 'string' && request.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.location && request.location.address && request.location.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.wasteBankName && request.wasteBankName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    console.log("Matches search:", matchesSearch, "searchTerm:", searchTerm);
    
    return matchesStatus && matchesSearch;
  });
  
  console.log("Filtered requests length:", filteredRequests.length, "out of total:", requests.length);

  // Get counts for each status
  const statusCounts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar 
        role="wastebank_master"
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
                <h1 className="text-2xl font-semibold text-zinc-800">Waste Collections</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage and track all waste collection requests
                </p>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label="Total Collections"
              count={requests.length}
              icon={Package}
              description="All time collections"
            />
            <StatusCard
              label="Pending"
              count={statusCounts.pending || 0}
              icon={Clock}
              description="Awaiting processing"
              className="border-yellow-200"
            />
            <StatusCard
              label="In Progress"
              count={statusCounts.processing || 0}
              icon={Truck}
              description="Currently being processed"
              className="border-blue-200"
            />
            <StatusCard
              label="Completed"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              description="Successfully completed"
              className="border-emerald-200"
            />
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search by customer name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md pl-10"
                />
              </div>
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          {/* Request Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center bg-white border rounded-xl border-zinc-200">
              <Package className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <h3 className="mb-1 text-lg font-medium text-zinc-800">
                No collections found
              </h3>
              <p className="max-w-sm mx-auto text-zinc-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'No waste collections have been recorded yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredRequests.map((request) => (
                <PickupCard
                  key={request.id}
                  pickup={request}
                  onStatusChange={openChangeStatusModal}
                  isProcessing={processing}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MasterTransaction;
