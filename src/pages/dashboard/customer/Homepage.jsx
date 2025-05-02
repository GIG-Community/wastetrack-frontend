// src/pages/dashboard/customer/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
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

  const navigate = useNavigate();
  // Hanya tampilkan 3 data pickup terbaru
  const displayedPickups = recentPickups.slice(0, 3);
  // Function untuk navigasi ke halaman semua pickup
  const handleViewAllPickups = () => {
    navigate('/dashboard/customer/history'); // Ini masih erorr ehe, navbar e gak metu :v @RayyanFv
  };

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
    if (!currentUser) return;

    let userUnsubscribe = () => {};
    let pickupsUnsubscribe = () => {};
    
    const setupListeners = async () => {
      try {
        setLoading(true);
        
        // Real-time listener untuk user data untuk mendapatkan point terbaru
        userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const userDocData = userDoc.data();
            setStats(prevStats => ({
              ...prevStats,
              points: userDocData?.rewards?.points || 0
            }));
          }
        });
        
        // Real-time listener untuk pickups
        const pickupsQuery = query(
          collection(db, 'pickups'),
          where('userId', '==', currentUser.uid)
        );
        
        pickupsUnsubscribe = onSnapshot(pickupsQuery, (snapshot) => {
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
            points: prevStats.points // Keep the points value from user document
          }));

          setRecentPickups(sortedPickups.slice(0, 5));
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
        setLoading(false);
      }
    };

    setupListeners();

    // Return cleanup function
    return () => {
      userUnsubscribe();
      pickupsUnsubscribe();
    };
  }, [currentUser]);

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
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative p-4 sm:p-6 overflow-hidden text-white rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700">
        <div className="relative z-10">
        <h1 className="mb-2 text-left sm:text-center text-lg sm:text-2xl font-thin">
          Selamat datang kembali, <span className="font-semibold">{userData?.profile?.fullName || 'Pengguna'}</span>!
        </h1>
          {/* <p className="mb-4 text-xs text-left sm:text-sm sm:text-center text-emerald-200">
            Perjalanan ramah lingkungan Anda berlanjut di sini
          </p> */}

          {/* Rewards Display */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
              <div>
                <p className="text-xl text-left font-bold">{stats.points} poin</p>
                {/* <p className="text-xs text-emerald-100">
                  TINGKAT {getCurrentTier(stats.points).toUpperCase()}
                </p> */}
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
      <div className="sm:p-4 sm:bg-white sm:shadow-sm rounded-xl">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Dampak Lingkungan</h2>
        <div className="text-left grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white sm:bg-emerald-50">
            <Recycle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-500 sm:text-emerald-600">CO₂ Berkurang</p>
              <p className="text-md font-bold text-emerald-600 sm-text-emerald-700">
                {formatNumber(stats.impact.carbonReduced || 0)} kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white sm:bg-emerald-50">
            <Droplet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-500 sm:text-emerald-600">Air Terhemat</p>
              <p className="text-md font-bold text-emerald-600 sm:text-emerald-700">
                {formatNumber(stats.impact.waterSaved || 0)} L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white sm:bg-emerald-50">
            <TreesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-500 sm:text-emerald-600">Pohon</p>
              <p className="text-md font-bold text-emerald-600 sm:text-emerald-700">
                {formatNumber(stats.impact.treesPreserved || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white sm:bg-emerald-50">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-500 sm:text-emerald-600">Sampah</p>
              <p className="text-md font-bold text-emerald-600 sm:text-emerald-700">
                {stats.waste.total || 0} ktg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Pickups */}
      <div className="pt-4 sm:p-4 sm:bg-white sm:shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Pengambilan Terbaru</h2>
          {stats.pickups.pending > 0 && (
            <span className="px-2 py-1 text-xs text-yellow-600 rounded-full bg-yellow-50">
              {stats.pickups.pending} menunggu
            </span>
          )}
        </div>
        {displayedPickups.length > 0 ? (
          <div className="space-y-2">
            {displayedPickups.map((pickup) => (
              <div 
                key={pickup.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-white shadow-xs sm:shadow-sm border border-gray-50 hover:border-emerald-100 transition-colors"
              >
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-left font-medium text-gray-800">
                      {pickup.wastes ? 
                        Object.values(pickup.wastes).reduce((total, waste) => 
                          total + Math.ceil((waste.weight || 0) / 5), 0)
                        : pickup.quantity || 0} kantong 
                        {/* • {
                        pickup.wastes ? 
                          Object.keys(pickup.wastes).join(', ') :
                          pickup.wasteTypes.join(', ')
                      } */}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(pickup.date.seconds * 1000).toLocaleDateString('id-ID', {
                        month: 'short',
                        day: 'numeric'
                      })} • {pickup.time}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs capitalize
                  ${pickup.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 
                    pickup.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    pickup.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                    pickup.status === 'assigned' ? 'bg-orange-50 text-orange-600' :
                    pickup.status === 'canceled' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-600'}`}
                >
                  {pickup.status === 'pending' ? 'Menunggu' : 
                  pickup.status === 'completed' ? 'Selesai' : 
                  pickup.status === 'canceled' ? 'Dibatalkan' :
                  pickup.status === 'in_progress' ? 'Perjalanan' :
                  pickup.status === 'assigned' ? 'Proses' :
                  pickup.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center bg-white rounded-lg shadow-sm border border-gray-50">
            <p className="text-sm text-gray-500">Belum ada pengambilan yang dijadwalkan</p>
          </div>
        )}
        
        {recentPickups.length > 3 && (
          <div className="text-center p-2">
            <button 
              onClick={handleViewAllPickups}
              className="bg-transparent text-xs text-emerald-600 hover:text-emerald-700 inline-flex items-center"
            >
              Lihat selengkapnya ({recentPickups.length - 3})
            </button>
          </div>
        )}

        {/* <div className="space-y-3">
          {recentPickups.length > 0 ? (
            recentPickups.map((pickup) => (
              <div key={pickup.id} className="flex items-center justify-between p-3 rounded-lg bg-white">
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
        </div> */}
      </div>

      {/* Eco Tip */}
      <div>
        <div className="p-4 bg-white shadow-xs sm:shadow-sm rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-md text-left font-semibold text-gray-800">Tips Ramah Lingkungan</h2>
              <p className="text-xs text-left text-gray-500">
              Dengan memilah sampah secara tepat, Anda membantu proses daur ulang menjadi lebih efisien
              dan turut mengurangi jejak karbon, demi menciptakan lingkungan yang lebih sehat bagi bumi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
