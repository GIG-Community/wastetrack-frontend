// src/pages/dashboard/customer/History.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  Filter,
  SortAsc,
  Package
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const History = () => {
  const { currentUser } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPickups = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        // Simplified query without complex ordering
        const pickupsRef = collection(db, 'pickups');
        const baseQuery = query(
          pickupsRef,
          where('userId', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(baseQuery);
        let pickupData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Client-side sorting
        pickupData = pickupData.sort((a, b) => {
          if (sortOrder === 'desc') {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return a.createdAt.seconds - b.createdAt.seconds;
        });

        setPickups(pickupData);
      } catch (error) {
        console.error('Error fetching pickups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPickups();
  }, [currentUser, sortOrder]);

  const filteredPickups = pickups.filter(pickup => {
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const matchesSearch = 
      pickup.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickup.wasteTypes?.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pickup History</h1>
        <p className="text-gray-600">View and track all your pickup requests</p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by location or waste type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-200 rounded text-black placeholder-gray-400"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-200 text-black px-4 py-2 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="bg-gray-200 text-black px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <SortAsc className="h-5 w-5" />
          {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {/* Pickup List or Empty State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filteredPickups.length > 0 ? (
        <div className="space-y-4">
          {filteredPickups.map((pickup) => (
            <div key={pickup.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {new Date(pickup.date.seconds * 1000).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-sm text-gray-500">at {pickup.time}</span>
                  </div>
                  <div className="text-sm text-gray-600">{pickup.location}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                  ${pickup.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    pickup.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-800'}`}
                >
                  {pickup.status}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div>
                  <div className="text-sm text-gray-600">Waste Types:</div>
                  <div className="font-medium">
                    {pickup.wasteTypes.map(type => 
                      type.charAt(0).toUpperCase() + type.slice(1)
                    ).join(', ')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Quantity:</div>
                  <div className="font-medium">{pickup.quantity} bags</div>
                </div>
              </div>

              {pickup.note && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Note:</span> {pickup.note}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No pickups found</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your filters'
              : 'Schedule your first pickup to get started'}
          </p>
        </div>
      )}
    </div>
  );
};

export default History;