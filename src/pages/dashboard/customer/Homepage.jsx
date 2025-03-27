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
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const POINTS_SYSTEM = {
  organic: { points: 5, carbon: 0.5, water: 10, landfill: 0.1 },
  plastic: { points: 8, carbon: 2.5, water: 50, landfill: 0.2, trees: 0.1 },
  paper: { points: 6, carbon: 1.5, water: 30, landfill: 0.15, trees: 0.2 },
  metal: { points: 10, carbon: 5, water: 100, landfill: 0.3 }
};

const TIER_THRESHOLDS = {
  rookie: { min: 0, max: 99, next: 'bronze' },
  bronze: { min: 100, max: 199, next: 'silver' },
  silver: { min: 200, max: 499, next: 'gold' },
  gold: { min: 500, max: 999, next: 'platinum' },
  platinum: { min: 1000, max: Infinity, next: null }
};

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
    const currentTier = userData?.rewards?.tier || 'rookie';
    const currentPoints = userData?.rewards?.points || 0;
    const tierInfo = TIER_THRESHOLDS[currentTier];

    if (!tierInfo.next) return null;

    const nextTierInfo = TIER_THRESHOLDS[tierInfo.next];
    const progress = ((currentPoints - tierInfo.min) / (nextTierInfo.min - tierInfo.min)) * 100;
    const remaining = nextTierInfo.min - currentPoints;

    return {
      nextTier: tierInfo.next,
      progress: Math.min(progress, 100),
      remaining,
      required: nextTierInfo.min
    };
  };

  const calculateImpact = (pickups) => {
    return pickups.reduce((impact, pickup) => {
      pickup.wasteTypes.forEach(type => {
        const factors = POINTS_SYSTEM[type];
        const quantity = pickup.quantity;

        // Update points and basic waste stats
        impact.points += factors.points * quantity;
        impact.waste.total += quantity;

        // Update pickup stats
        impact.pickups.total++;
        if (pickup.status === 'completed') impact.pickups.completed++;
        if (pickup.status === 'pending') impact.pickups.pending++;

        // Update environmental impact
        impact.impact.carbonReduced += factors.carbon * quantity;
        impact.impact.waterSaved += factors.water * quantity;
        impact.impact.landfillSpaceSaved += factors.landfill * quantity;
        if (factors.trees) {
          impact.impact.treesPreserved += factors.trees * quantity;
        }
      });
      return impact;
    }, {
      points: 0,
      pickups: { total: 0, pending: 0, completed: 0 },
      waste: { total: 0 },
      impact: {
        carbonReduced: 0,
        waterSaved: 0,
        treesPreserved: 0,
        landfillSpaceSaved: 0
      }
    });
  };

  const updateUserRewards = async (newPoints) => {
    if (!currentUser?.uid || newPoints === userData?.rewards?.points) return;

    try {
      let newTier = 'rookie';
      for (const [tier, threshold] of Object.entries(TIER_THRESHOLDS)) {
        if (newPoints >= threshold.min) newTier = tier;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'rewards.points': newPoints,
        'rewards.tier': newTier
      });
    } catch (error) {
      console.error('Error updating rewards:', error);
    }
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
        const pickupData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by date for recent pickups
        const sortedPickups = pickupData.sort((a, b) => 
          b.createdAt.seconds - a.createdAt.seconds
        );

        // Calculate impact and update stats
        const impact = calculateImpact(pickupData);
        setStats(impact);
        setRecentPickups(sortedPickups.slice(0, 5));

        // Update user rewards if necessary
        await updateUserRewards(impact.points);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const formatNumber = (num, decimals = 1) => {
    return Number(num).toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 p-6 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {userData?.profile?.fullName || 'User'}!
          </h1>
          <p className="text-emerald-50 text-sm mb-4">
            Your eco-journey continues here
          </p>

          {/* Rewards Display */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-300" />
              <div>
                <p className="text-lg font-bold">{stats.points} pts</p>
                <p className="text-xs text-emerald-100">
                  {userData?.rewards?.tier?.toUpperCase() || 'ROOKIE'} TIER
                </p>
              </div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {calculateNextTier() && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-emerald-100">
                <span>{userData?.rewards?.tier?.toUpperCase()}</span>
                <span>{calculateNextTier().nextTier.toUpperCase()}</span>
              </div>
              <div className="w-full bg-emerald-200/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-emerald-300 transition-all duration-500"
                  style={{ width: `${calculateNextTier().progress}%` }}
                />
              </div>
              <p className="text-xs text-emerald-100">
                {calculateNextTier().remaining} points to {calculateNextTier().nextTier}
              </p>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 rounded-full opacity-20 transform translate-x-16 -translate-y-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400 rounded-full opacity-20 transform -translate-x-8 translate-y-8" />
      </div>

      {/* Environmental Impact Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Environmental Impact</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Recycle className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-600">CO₂ Reduced</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {formatNumber(stats.impact.carbonReduced)} kg
            </p>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-600">Water Saved</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {formatNumber(stats.impact.waterSaved / 1000)} m³
            </p>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TreesIcon className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-600">Trees Preserved</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {formatNumber(stats.impact.treesPreserved)}
            </p>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-600">Waste Managed</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {stats.waste.total} bags
            </p>
          </div>
        </div>
      </div>

      {/* Recent Pickups */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Pickups</h2>
          {stats.pickups.pending > 0 && (
            <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-sm">
              {stats.pickups.pending} pending
            </span>
          )}
        </div>

        <div className="space-y-4">
          {recentPickups.length > 0 ? (
            recentPickups.map((pickup) => (
              <div key={pickup.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {pickup.wasteTypes.length} type{pickup.wasteTypes.length > 1 ? 's' : ''} • {pickup.quantity} bag{pickup.quantity > 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock className="h-4 w-4" />
                        {new Date(pickup.date.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {' at '}{pickup.time}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4" />
                        {pickup.location}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                    ${pickup.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 
                      pickup.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-gray-50 text-gray-600'}`}
                  >
                    {pickup.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No pickups scheduled yet</p>
          )}
        </div>
      </div>

      {/* Eco Tip */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Lightbulb className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Eco Tip</h2>
            <p className="text-gray-600 text-sm">
              By properly sorting your waste, you're helping to increase recycling efficiency 
              and reduce your carbon footprint. Each bag of recyclables contributes to a healthier planet!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
