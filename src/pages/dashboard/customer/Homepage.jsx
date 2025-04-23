// src/pages/dashboard/customer/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Camera, 
  Calendar, 
  Award, 
  Trash2, 
  Recycle, 
  Lightbulb,
  Droplet,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  TreesIcon
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  calculatePoints, 
  calculateTotalValue, 
  calculateEnvironmentalImpact,
  TIER_THRESHOLDS,
  getCurrentTier
} from '../../../lib/constants';

const HomePage = () => {
  const { userData, currentUser } = useAuth();
  const [recentPickups, setRecentPickups] = useState([]);
  const [stats, setStats] = useState({
    pickups: { total: 0, pending: 0, completed: 0 },
    waste: { total: 0 },
    impact: {
      carbonReduced: 0,
      waterSaved: 0,
      treesPreserved: 0,
      landfillSpaceSaved: 0
    },
    points: 0
  });
  const [loading, setLoading] = useState(true);

  const calculateNextTier = () => {
    const currentPoints = userData?.rewards?.points || 0;
    const currentTier = getCurrentTier(currentPoints);
    const tierInfo = TIER_THRESHOLDS[currentTier];

    if (!tierInfo.next) return null;

    const nextTierInfo = TIER_THRESHOLDS[tierInfo.next];
    const progress = ((currentPoints - tierInfo.min) / (nextTierInfo.min - tierInfo.min)) * 100;
    const remaining = Math.max(0, nextTierInfo.min - currentPoints);

    return {
      nextTier: tierInfo.next,
      progress: Math.min(progress, 100),
      remaining,
      required: nextTierInfo.min
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const pickupsRef = collection(db, 'pickups');
        const pickupsQuery = query(
          pickupsRef,
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(pickupsQuery);
        const pickupData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            totalValue: data.wastes ? calculateTotalValue(data.wastes) : 0,
            pointsAmount: calculatePoints(data.wastes ? calculateTotalValue(data.wastes) : 0),
            wasteTypes: Array.isArray(data.wasteTypes) ? data.wasteTypes : [],
            status: data.status || 'pending',
            date: data.date || { seconds: Date.now() / 1000 }
          };
        });

        // Sort by date for recent pickups
        const sortedPickups = pickupData.sort((a, b) => 
          (b.date?.seconds || 0) - (a.date?.seconds || 0)
        );

        // Calculate impact using centralized function
        const impact = calculateEnvironmentalImpact(pickupData);

        // Update state with calculated values
        setStats(prevStats => ({
          ...impact,
          points: userData?.rewards?.points || 0
        }));

        setRecentPickups(sortedPickups.slice(0, 5));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userData?.rewards?.points]);

  const formatNumber = (num, decimals = 1) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return Number(num).toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Hero Section */}
      <div className="relative p-6 overflow-hidden text-white rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700">
        <div className="relative z-10">
          <h1 className="mb-2 text-2xl font-bold">
            Selamat datang kembali, {userData?.profile?.fullName || 'Pengguna'}!
          </h1>
          <p className="mb-4 text-sm text-emerald-50">
            Perjalanan ramah lingkungan Anda berlanjut di sini
          </p>

          {/* Rewards Display */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-300" />
              <div>
                <p className="text-lg font-bold">{stats.points} poin</p>
                <p className="text-xs text-emerald-100">
                  TINGKAT {getCurrentTier(stats.points).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {calculateNextTier() && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-emerald-100">
                <span>{getCurrentTier(stats.points).toUpperCase()}</span>
                <span>{calculateNextTier().nextTier.toUpperCase()}</span>
              </div>
              <div className="w-full h-2 overflow-hidden rounded-full bg-emerald-200/30">
                <div 
                  className="h-full transition-all duration-500 bg-emerald-300"
                  style={{ width: `${calculateNextTier().progress}%` }}
                />
              </div>
              <p className="text-xs text-emerald-100">
                {calculateNextTier().remaining} poin untuk ke tingkat {calculateNextTier().nextTier}
              </p>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-8 rounded-full bg-emerald-400 opacity-20" />
        <div className="absolute bottom-0 left-0 w-24 h-24 transform -translate-x-8 translate-y-8 rounded-full bg-emerald-400 opacity-20" />
      </div>

      {/* Environmental Impact Grid */}
      <div className="p-4 bg-white shadow-sm rounded-xl">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Dampak Lingkungan</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
            <Recycle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">CO₂ Berkurang</p>
              <p className="text-lg font-bold text-emerald-700">
                {formatNumber(stats.impact.carbonReduced || 0)} kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
            <Droplet className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">Air Terhemat</p>
              <p className="text-lg font-bold text-emerald-700">
                {formatNumber(stats.impact.waterSaved || 0)} L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
            <TreesIcon className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">Pohon</p>
              <p className="text-lg font-bold text-emerald-700">
                {formatNumber(stats.impact.treesPreserved || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
            <Package className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">Sampah</p>
              <p className="text-lg font-bold text-emerald-700">
                {stats.waste.total || 0} kantong
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Pickups */}
      <div className="p-4 bg-white shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Pengambilan Terbaru</h2>
          {stats.pickups.pending > 0 && (
            <span className="px-2 py-1 text-xs text-yellow-600 rounded-full bg-yellow-50">
              {stats.pickups.pending} menunggu
            </span>
          )}
        </div>

        <div className="space-y-3">
          {recentPickups.length > 0 ? (
            recentPickups.map((pickup) => (
              <div key={pickup.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex gap-3">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {pickup.wastes ? 
                        // New format: Sum up the total bags from wastes
                        Object.values(pickup.wastes).reduce((total, waste) => 
                          total + Math.ceil((waste.weight || 0) / 5), 0)
                        : pickup.quantity || 0} kantong • {
                        pickup.wastes ? 
                          Object.keys(pickup.wastes).join(', ') :
                          pickup.wasteTypes.join(', ')
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(pickup.date.seconds * 1000).toLocaleDateString('id-ID', {
                        month: 'short',
                        day: 'numeric'
                      })} • {pickup.time}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                  ${pickup.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 
                    pickup.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-gray-50 text-gray-600'}`}
                >
                  {pickup.status === 'pending' ? 'Menunggu' : 
                   pickup.status === 'completed' ? 'Selesai' : 
                   pickup.status}
                </span>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-center text-gray-500">Belum ada pengambilan yang dijadwalkan</p>
          )}
        </div>
      </div>

      {/* Eco Tip */}
      <div className="p-6 bg-white shadow-sm rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-800">Tips Ramah Lingkungan</h2>
            <p className="text-sm text-gray-600">
              Dengan memilah sampah dengan benar, Anda membantu meningkatkan efisiensi daur ulang
              dan mengurangi jejak karbon Anda. Setiap kantong daur ulang berkontribusi untuk planet yang lebih sehat!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
