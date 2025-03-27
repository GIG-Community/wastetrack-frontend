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
  BoxSelectIcon
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, where } from 'firebase/firestore';
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
          <Icon className="w-5 h-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
        </div>
        <p className="text-sm font-medium text-gray-600 mt-3">{label}</p>
        <p className="text-2xl font-semibold text-gray-800 mt-1">{count}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
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
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    assigned: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-green-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200"
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'assigned': return Truck;
      case 'in_progress': return Container;
      case 'completed': return CheckCircle2;
      case 'cancelled': return AlertCircle;
      default: return Package;
    }
  };

  const StatusIcon = getStatusIcon(pickup.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md group">
      {/* Status Bar */}
      <div className={`h-1 w-full ${statusColors[pickup.status]?.replace('text-', 'bg-').split(' ')[0]}`} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-emerald-50 transition-colors">
              <Users className="w-6 h-6 text-gray-600 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-lg group-hover:text-emerald-600 transition-colors">
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
          
          <div className="text-right">
            <p className="text-xs text-gray-400">Pickup ID</p>
            <p className="text-sm font-medium text-gray-600 font-mono mt-0.5">
              {pickup.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl group-hover:bg-emerald-50/50 transition-colors">
            <Calendar className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
            <div>
              <p className="text-sm font-medium text-gray-700">Schedule</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(pickup.date.seconds * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500">at {pickup.time}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl group-hover:bg-emerald-50/50 transition-colors">
            <MapPin className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
            <div>
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-sm text-gray-600 mt-1">{pickup.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl group-hover:bg-emerald-50/50 transition-colors">
            <Package className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
            <div>
              <p className="text-sm font-medium text-gray-700">Waste Details</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pickup.wasteTypes.map((type, index) => (
                  <span 
                    key={index} 
                    className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 
                      rounded-full border border-emerald-100"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                ))}
              </div>
              <p className="text-sm text-emerald-600 font-medium mt-2">
                {pickup.quantity} bags
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <QuickAction
              icon={Package}
              label="Change Status"
              onClick={() => onStatusChange(pickup)}
              variant={pickup.status === 'completed' ? 'success' : 'default'}
            />
            {pickup.status === 'pending' && (
              <QuickAction
                icon={Truck}
                label="Assign Collector"
                variant="success"
                onClick={() => onStatusChange(pickup)}
              />
            )}
          </div>
          
          {pickup.status === 'pending' && (
            <QuickAction
              icon={AlertCircle}
              label="Cancel Pickup"
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
        where('role', '==', 'collector')
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
    // Data untuk status options
    const statusOptions = [
      { value: 'pending', label: 'Pending', icon: '⏳', color: 'bg-yellow-50 text-yellow 600' },
      { value: 'assigned', label: 'Assigned', icon: '🚛', color: 'bg-blue-50 text-blue-600' },
      { value: 'in_progress', label: 'In Progress', icon: '⏳', color: 'bg-green-100 text-white-600' },
      { value: 'completed', label: 'Completed', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
      { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'bg-red-50 text-red-600' }
    ];
  
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
              transition-all shadow-sm text-gray-700">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${pickup.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>
  
          <!-- Collector Selection -->
          <div id="collectorSelectDiv" class="mb-4 transition-all duration-200" 
            style="${pickup.status === 'assigned' ? '' : 'display: none;'}">
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
  
          <!-- Pickup Details -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-sm font-medium text-gray-600 mb-3">Pickup Details</p>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-500">Customer</p>
                <p class="font-medium text-gray-700">${pickup.userName}</p>
              </div>
              <div>
                <p class="text-gray-500">Quantity</p>
                <p class="font-medium text-gray-700">${pickup.quantity} bags</p>
              </div>
              <div>
                <p class="text-gray-500">Location</p>
                <p class="font-medium text-gray-700">${pickup.location}</p>
              </div>
              <div>
                <p class="text-gray-500">Scheduled Time</p>
                <p class="font-medium text-gray-700">${pickup.time}</p>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      customClass: {
        confirmButton: 'swal2-confirm-custom',
        cancelButton: 'swal2-cancel-custom'
      },
      didOpen: () => {
        // Add event listener for status change
        const statusSelect = Swal.getPopup().querySelector('#newStatus');
        const collectorDiv = Swal.getPopup().querySelector('#collectorSelectDiv');
        
        statusSelect.addEventListener('change', function() {
          if (this.value === 'assigned') {
            collectorDiv.style.display = 'block';
            setTimeout(() => {
              collectorDiv.style.opacity = '1';
            }, 0);
          } else {
            collectorDiv.style.opacity = '0';
            setTimeout(() => {
              collectorDiv.style.display = 'none';
            }, 200);
          }
        });
      },
      preConfirm: () => {
        const newStatus = Swal.getPopup().querySelector('#newStatus').value;
        const collectorSelect = Swal.getPopup().querySelector('#collectorSelect');
        const collectorId = collectorSelect ? collectorSelect.value : '';
  
        if (newStatus === 'assigned' && !collectorId) {
          Swal.showValidationMessage('Please select a collector for assigned status');
          return false;
        }
  
        return { newStatus, collectorId };
      }
    });
  
    if (formValues) {
      setProcessing(true);
      try {
        const pickupRef = doc(db, 'pickups', pickup.id);
        const updates = {
          status: formValues.newStatus,
          updatedAt: new Date()
        };
  
        if (formValues.newStatus === 'assigned') {
          updates.collectorId = formValues.collectorId;
        } else if (formValues.newStatus !== 'assigned' && pickup.collectorId) {
          updates.collectorId = null; // Remove collector if status is not assigned
        }
  
        await updateDoc(pickupRef, updates);
        await fetchPickups();
  
        // Success notification
        Swal.fire({
          title: 'Status Updated',
          text: `Pickup has been updated to ${formValues.newStatus}`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 2000,
          timerProgressBar: true
        });
      } catch (error) {
        console.error('Error updating pickup:', error);
        Swal.fire({
          title: 'Update Failed',
          text: 'Failed to update pickup status. Please try again.',
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
      }
      setProcessing(false);
    }
  };
  

  const filteredPickups = pickups.filter(pickup => {
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const matchesSearch = 
      pickup.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Status counts for dashboard overview
  const statusCounts = {
    pending: pickups.filter(p => p.status === 'pending').length,
    assigned: pickups.filter(p => p.status === 'assigned').length,
    in_progress: pickups.filter(p => p.status === 'in_progress').length,
    completed: pickups.filter(p => p.status === 'completed').length,
    cancelled: pickups.filter(p => p.status === 'cancelled').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header with Stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800">Pickup Management</h1>
                  <p className="text-sm text-gray-500">Manage and track waste pickup requests</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <StatusCard
                label="Pending Pickups"
                count={statusCounts.pending}
                icon={Clock}
                description="Awaiting assignment"
              />
              <StatusCard
                label="Assigned"
                count={statusCounts.assigned}
                icon={Truck}
                description="In progress"
              />
              <StatusCard
                label="In Progress"
                count={statusCounts.in_progress}
                icon={Container}
                description="In progress"
              />
              <StatusCard
                label="Completed"
                count={statusCounts.completed}
                icon={CheckCircle2}
                description="Successfully collected"
              />
              <StatusCard
                label="Cancelled"
                count={statusCounts.cancelled}
                icon={AlertCircle}
                description="Cancelled requests"
              />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by location or customer name..."
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
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-gray-500">Loading pickups...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
              <button
                onClick={fetchInitialData}
                className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredPickups.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-1">No pickups found</h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No pickup requests available'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPickups.map((pickup) => (
                <PickupCard
                  key={pickup.id}
                  pickup={pickup}
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

export default Transaction;
