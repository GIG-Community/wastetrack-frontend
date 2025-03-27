// src/pages/dashboard/customer/TrackPickup.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2,
  Truck,
  UserCheck,
  Calendar,
  AlertCircle,
  Search
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const PICKUP_STATUS = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    label: 'Pending',
    description: 'Waiting for confirmation'
  },
  confirmed: {
    icon: CheckCircle2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    label: 'Confirmed',
    description: 'Pickup has been confirmed'
  },
  onRoute: {
    icon: Truck,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    label: 'On Route',
    description: 'Driver is on the way'
  },
  completed: {
    icon: UserCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    label: 'Completed',
    description: 'Pickup completed successfully'
  },
  cancelled: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    label: 'Cancelled',
    description: 'Pickup was cancelled'
  }
};

const TrackPickup = () => {
  const { currentUser } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPickups = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const pickupsRef = collection(db, 'pickups');
        const pickupsQuery = query(
          pickupsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(pickupsQuery);
        const pickupData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPickups(pickupData);
        if (pickupData.length > 0) {
          setSelectedPickup(pickupData[0]);
        }
      } catch (error) {
        console.error('Error fetching pickups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPickups();
  }, [currentUser]);

  const filteredPickups = pickups.filter(pickup => {
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const matchesSearch = pickup.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header and Filters */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Track Pickups</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            {Object.entries(PICKUP_STATUS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pickup List */}
        <div className="lg:col-span-1 space-y-4">
          {filteredPickups.length > 0 ? (
            filteredPickups.map((pickup) => {
              const statusInfo = PICKUP_STATUS[pickup.status];
              const StatusIcon = statusInfo.icon;

              return (
                <button
                  key={pickup.id}
                  onClick={() => setSelectedPickup(pickup)}
                  className={`w-full p-4 rounded-xl text-left transition-all
                    ${pickup.id === selectedPickup?.id 
                      ? 'bg-emerald-50 border-2 border-emerald-500' 
                      : 'bg-white border border-gray-200 hover:border-emerald-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                        <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {pickup.wasteTypes.length} types • {pickup.quantity} bags
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(pickup.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusInfo.bgColor} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-800">No pickups found</h3>
              <p className="text-gray-500 mt-1">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Schedule your first pickup to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Pickup Details */}
        {selectedPickup && (
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">
                    Pickup Details
                  </h2>
                  <p className="text-gray-500">
                    Tracking ID: {selectedPickup.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize
                  ${PICKUP_STATUS[selectedPickup.status].bgColor} 
                  ${PICKUP_STATUS[selectedPickup.status].color}`}
                >
                  {PICKUP_STATUS[selectedPickup.status].label}
                </span>
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {/* Date & Time */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Scheduled For</p>
                    <p className="text-gray-600">
                      {formatDate(selectedPickup.date)} at {selectedPickup.time}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Pickup Location</p>
                    <p className="text-gray-600">{selectedPickup.location}</p>
                  </div>
                </div>

                {/* Waste Details */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Waste Details</p>
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        Types: {selectedPickup.wasteTypes.map(type => 
                          type.charAt(0).toUpperCase() + type.slice(1)
                        ).join(', ')}
                      </p>
                      <p className="text-gray-600">
                        Quantity: {selectedPickup.quantity} bags
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes if any */}
                {selectedPickup.note && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Additional Notes</p>
                      <p className="text-gray-600">{selectedPickup.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-6">Status Timeline</h3>
              <div className="space-y-6">
                {Object.entries(PICKUP_STATUS).map(([status, info], index) => {
                  const StatusIcon = info.icon;
                  const isActive = index <= Object.keys(PICKUP_STATUS)
                    .indexOf(selectedPickup.status);
                  const isLast = index === Object.keys(PICKUP_STATUS).length - 1;

                  return (
                    <div key={status} className="flex items-start gap-4">
                      <div className={`relative flex items-center justify-center
                        ${!isLast ? 'h-20' : 'h-8'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                          ${isActive ? info.bgColor : 'bg-gray-100'}`}>
                          <StatusIcon className={`h-5 w-5
                            ${isActive ? info.color : 'text-gray-400'}`} />
                        </div>
                        {!isLast && (
                          <div className={`absolute top-8 h-12 w-0.5 
                            ${isActive ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium 
                          ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                          {info.label}
                        </p>
                        <p className={`text-sm 
                          ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                          {info.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackPickup;