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
import { collection, query, getDocs, where, updateDoc, doc } from 'firebase/firestore';
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

const LocationDisplay = ({ location }) => {
  // Jika location adalah objek kompleks, ambil address-nya
  const address = typeof location === 'object' ? location.address : location;

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50">
      <MapPin className="w-5 h-5 mt-1 text-blue-500" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-blue-900">Pickup Address</p>
          <p className="mt-1 text-sm text-blue-700">
            {address || 'No address provided'}
          </p>
        </div>
      </div>
    </div>
  );
};

const PickupCard = ({ pickup, onSelect }) => {
  const navigate = useNavigate();
  // Calculate estimated total bags from wasteQuantities
  const totalBags = Object.values(pickup.wasteQuantities || {}).reduce((sum, quantity) => sum + quantity, 0);

  const handleAction = (pickup, newStatus) => {
    if (newStatus === 'in_progress') {
      onSelect(pickup, newStatus);
    } else if (newStatus === 'completed') {
      if (pickup.id) {
        navigate(`/dashboard/collector-master/update-collection/${pickup.id}`);
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Could not find pickup ID',
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
      }
    }
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
            <h3 className="font-medium text-gray-900">Pickup #{pickup.id?.slice(0, 6)}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={pickup.status}>
                {pickup.status?.charAt(0).toUpperCase() + pickup.status?.slice(1)}
              </Badge>
              <Badge variant="default">
                {pickup.deliveryType === 'self-delivery' ? 'Self Delivery' : 'Pickup'}
              </Badge>
            </div>
          </div>
        </div>
        <Badge variant="default">{pickup.time}</Badge>
      </div>

      {/* Pickup Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Pickup Time</p>
            <p className="text-sm font-medium text-gray-900">{pickup.time}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Waste Amount</p>
            <p className="text-sm font-medium text-gray-900">{totalBags} bags</p>
          </div>
        </div>
      </div>

      {/* Waste Types */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(pickup.wasteQuantities || {}).map(([type, quantity]) => (
            <Badge key={type} variant="default">
              {type}: {quantity} bag{quantity !== 1 ? 's' : ''}
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
              Start Collection
            </button>
          ) : (
            <button 
              onClick={() => handleAction(pickup, 'completed')}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              <Scale className="w-4 h-4" />
              Record Collection
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MasterAssignment = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAssignments();
    }
  }, [currentUser?.uid]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const assignmentsQuery = query(
        collection(db, 'masterBankRequests'),
        where('collectorId', '==', currentUser.uid),
        where('status', 'in', ['assigned', 'in_progress', 'completed'])
      );
      
      const snapshot = await getDocs(assignmentsQuery);
      const assignmentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          location: data.location || 'No location provided',
          userName: String(data.userName || ''),
          status: data.status || 'pending',
          date: data.date || { seconds: Date.now() / 1000 },
          time: data.time || '',
          phone: data.phone || '',
          wasteQuantities: data.wasteQuantities || {},
          ...data
        };
      });
  
      console.log('Fetched assignments:', assignmentsData);
      setAssignments(assignmentsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (assignment, newStatus) => {
    try {
      // Only allow status transitions: assigned -> in_progress -> completed
      if ((assignment.status === 'assigned' && newStatus === 'in_progress') ||
          (assignment.status === 'in_progress' && newStatus === 'completed')) {
        
        const pickupRef = doc(db, 'masterBankRequests', assignment.id);
        await updateDoc(pickupRef, {
          status: newStatus,
          updatedAt: new Date()
        });

        await fetchAssignments();

        Swal.fire({
          title: 'Status Updated',
          text: `Pickup has been ${newStatus === 'in_progress' ? 'started' : 'completed'} successfully`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 2000,
          timerProgressBar: true
        });
      }
    } catch (error) {
      console.error('Error updating pickup status:', error);
      Swal.fire({
        title: 'Update Failed',
        text: 'Failed to update pickup status. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    
    const locationMatch = typeof assignment.location === 'string' && 
      assignment.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const userNameMatch = typeof assignment.userName === 'string' && 
      assignment.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearch = !searchTerm || locationMatch || userNameMatch;
    
    return matchesStatus && matchesSearch;
  });

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
              <h1 className="text-2xl font-semibold text-gray-800">My Assignments</h1>
              <p className="text-sm text-gray-500">Manage your pickup assignments</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
              <p className="text-sm text-gray-500">In Progress Pickups</p>
              <p className="text-2xl font-semibold text-blue-600">
                {assignments.filter(a => a.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
              <p className="text-sm text-gray-500">Pending Pickups</p>
              <p className="text-2xl font-semibold text-blue-600">
                {assignments.filter(a => a.status === 'assigned').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
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
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 mb-4 animate-spin text-emerald-500" />
            <p className="text-gray-500">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 mb-4 text-red-500" />
            <p className="text-gray-500">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-4 py-2 mt-4 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
          <Truck className="w-12 h-12 mb-4 text-gray-400" />
          <h3 className="mb-1 text-lg font-medium text-gray-900">No assignments found</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'You have no pickup assignments yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredAssignments.map((assignment) => (
            <PickupCard 
              key={assignment.id} 
              pickup={assignment} 
              onSelect={handleStatusChange}
            />
          ))}
        </div>
      )}
    </main>
  </div>
);
};

export default MasterAssignment;