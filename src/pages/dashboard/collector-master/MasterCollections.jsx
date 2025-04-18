import React, { useState, useEffect } from 'react';
import { 
  Package, ArrowRight, Loader2, Search, CalendarIcon,
  User, MapPin, AlertCircle, Scale, ArrowUp
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { Link, useNavigate } from 'react-router-dom';

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

const PickupCard = ({ pickup, onSelectPickup }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total bags
  const totalBags = pickup.wastes 
    ? Object.values(pickup.wastes).reduce((sum, waste) => sum + Math.ceil(waste.weight / 5), 0)
    : 0;

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">
              {pickup.userName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={pickup.status}>{pickup.status.replace('_', ' ')}</Badge>
              <span className="text-sm text-gray-500">
                Pickup #{pickup.id.slice(-6)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{pickup.location?.address || 'No address specified'}</p>
              {pickup.notes && (
                <p className="mt-1 text-xs italic text-gray-500">"{pickup.notes}"</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{totalBags} bags total</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {pickup.wastes && Object.entries(pickup.wastes).map(([type, data]) => (
                  <span key={type} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {type}: {data.weight}kg
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Waste Bank:</span> {pickup.wasteBankName || 'Not specified'}
            </p>
          </div>
          <button
            onClick={() => onSelectPickup(pickup.id)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Update Weight <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const MasterCollections = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.uid) {
      fetchInProgressPickups();
    }
  }, [currentUser?.uid]);

  const fetchInProgressPickups = async () => {
    setLoading(true);
    try {
      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('collectorId', '==', currentUser.uid),
        where('status', '==', 'in_progress')
      );
      
      const snapshot = await getDocs(pickupsQuery);
      const pickupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPickups(pickupsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setError('Failed to load pickup collections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPickup = (pickupId) => {
    navigate(`/dashboard/collector-master/update-collection/${pickupId}`);
  };

  // Filter pickups based on search term
  const filteredPickups = pickups.filter(pickup => 
    pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pickup.location?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
            <h1 className="text-2xl font-semibold text-gray-800">Collection Management</h1>
            <p className="text-sm text-gray-500">Update waste weights for in-progress collections</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search collections..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Collections</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{pickups.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Weight Needed</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">All Types</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50">
                <Scale className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Collections List */}
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
              Try Again
            </button>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-700">No In-Progress Collections</h3>
            <p className="max-w-md mx-auto mb-6 text-gray-500">
              There are currently no in-progress collections assigned to you.
              Check back later or contact the waste bank.
            </p>
            <Link
              to="/dashboard/collector-master/assignments"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Go to Assignments <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPickups.map(pickup => (
              <PickupCard
                key={pickup.id}
                pickup={pickup}
                onSelectPickup={handleSelectPickup}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MasterCollections;