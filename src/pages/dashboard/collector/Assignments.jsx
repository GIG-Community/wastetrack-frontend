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
    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
      <MapPin className="w-5 h-5 text-blue-500 mt-1" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-blue-900">Pickup Address</p>
          <p className="text-sm text-blue-700 mt-1">
            {address || 'No address provided'}
          </p>
        </div>
      </div>
    </div>
  );
};

const AssignmentCard = ({ assignment, onStatusChange }) => {
  const navigate = useNavigate();

  const handleStatusChange = async () => {
    const currentStatus = assignment.status;
    
    if (currentStatus === 'assigned') {
      // Tetap menggunakan fungsi yang sama untuk mengubah ke in_progress
      await onStatusChange(assignment, 'in_progress');
    } else if (currentStatus === 'in_progress') {
      // Alih-alih mengubah status, arahkan ke halaman update-collection
      navigate(`/dashboard/collector/update-collection`);
    }
  };

  const getActionButton = () => {
    switch (assignment.status) {
      case 'assigned':
        return (
          <button 
            onClick={handleStatusChange}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Start Collection
          </button>
        );
      case 'in_progress':
        return (
          <button 
            onClick={handleStatusChange}
            className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 
              transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Scale className="w-4 h-4" />
            Record Collection
          </button>
        );
      default:
        return null;
    }
  };


  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Pickup Assignment #{assignment.id.slice(0, 6)}</h3>
            <Badge 
              variant={assignment.status}
              className="mt-1"
            >
              {assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1)}
            </Badge>
          </div>
        </div>
        <Badge variant="default">
          {new Date(assignment.date.seconds * 1000).toLocaleDateString()}
        </Badge>
      </div>

      {/* Customer Info */}
      <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <User className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{assignment.userName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">{assignment.phone || 'No phone number'}</p>
          </div>
        </div>
      </div>

      {/* Pickup Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Pickup Time</p>
            <p className="text-sm font-medium text-gray-900">{assignment.time}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Waste Amount</p>
            <p className="text-sm font-medium text-gray-900">{assignment.quantity} bags</p>
          </div>
        </div>
      </div>

      {/* Location */}
      <LocationDisplay 
        location={assignment.location} 
        coordinates={assignment.coordinates}
      />

      {/* Actions */}
      {(assignment.status === 'assigned' || assignment.status === 'in_progress') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {getActionButton()}
        </div>
      )}
    </div>
  );
};

const Assignments = () => {
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
        collection(db, 'pickups'),
        where('collectorId', '==', currentUser.uid)
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
          quantity: data.quantity || 0,
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
      const pickupRef = doc(db, 'pickups', assignment.id);
      await updateDoc(pickupRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      await fetchAssignments();

      const actionText = newStatus === 'in_progress' ? 'started' : 'completed';
      Swal.fire({
        title: 'Status Updated',
        text: `Pickup has been ${actionText} successfully`,
        icon: 'success',
        confirmButtonColor: '#10B981',
        timer: 2000,
        timerProgressBar: true
      });
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
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">My Assignments</h1>
              <p className="text-sm text-gray-500">Manage your pickup assignments</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Today's Pickups</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {/* {assignments.filter(a => {
                  const today = new Date();
                  const assignmentDate = new Date(a.date.seconds * 1000);
                  return assignmentDate.toDateString() === today.toDateString();
                }).length} */}
                {assignments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">In Progress Pickups</p>
              <p className="text-2xl font-semibold text-blue-600">
                {assignments.filter(a => a.status === 'in_progress').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
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
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-gray-500">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
            <p className="text-gray-500">{error}</p>
            <button
              onClick={fetchAssignments}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 
                transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No assignments found</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'You have no pickup assignments yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard 
              key={assignment.id} 
              assignment={assignment} 
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </main>
  </div>
);
};

export default Assignments;