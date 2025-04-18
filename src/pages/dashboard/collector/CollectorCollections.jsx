import React, { useState, useEffect } from 'react';
import { 
  Package, ArrowRight, Loader2, Search, CheckCircle2, CalendarIcon,
  User, MapPin, AlertCircle, Scale, ArrowUp, Coins
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

  // Calculate total bags and points
  const totalBags = pickup.wastes 
    ? Object.values(pickup.wastes).reduce((sum, waste) => sum + Math.ceil(waste.weight / 5), 0)
    : 0;

  const pointsAmount = pickup.wastes ? calculatePoints(calculateTotalValue(pickup.wastes)) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
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
          <div className="text-right">
            <p className="text-xs text-gray-500">Points</p>
            <p className="text-sm font-medium text-emerald-600">+{pointsAmount}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{pickup.location}</p>
              {pickup.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">"{pickup.notes}"</p>
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

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Waste Bank:</span> {pickup.wasteBankName || 'Not specified'}
            </p>
          </div>
          <button
            onClick={() => onSelectPickup(pickup.id)}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            Update Weight <ArrowRight className="w-4 h-4" />
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
        collection(db, 'pickups'),
        where('collectorId', '==', currentUser.uid),
        where('status', '==', 'in_progress')
      );
      
      const snapshot = await getDocs(pickupsQuery);
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
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setError('Failed to load pickup collections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPickup = (pickupId) => {
    navigate(`/dashboard/collector/update-collection/${pickupId}`);
  };

  // Filter pickups based on search term
  const filteredPickups = pickups.filter(pickup => 
    pickup.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pickup.location?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Collection Management</h1>
            <p className="text-sm text-gray-500">Update waste weights and calculate points for in-progress collections</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Collections</p>
                <p className="text-2xl font-semibold text-gray-800 mt-1">{pickups.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Points Calculation</p>
                <p className="text-2xl font-semibold text-gray-800 mt-1">
                  1 pt / {POINTS_CONVERSION_RATE} Rp
                </p>
                <p className="text-xs text-gray-500">Based on waste type and weight</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Coins className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Weight Needed</p>
                <p className="text-2xl font-semibold text-gray-800 mt-1">All Types</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Scale className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Collections List */}
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
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
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No In-Progress Collections</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              There are currently no in-progress collections assigned to you.
              Check back later or contact the waste bank.
            </p>
            <Link
              to="/dashboard/collector/assignments"
              className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
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

export default CollectorCollections;