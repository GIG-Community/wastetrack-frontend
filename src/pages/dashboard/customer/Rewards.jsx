// src/pages/dashboard/customer/Rewards.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Award, 
  Star, 
  Crown,
  Package, 
  ChevronRight,
  Clock,
  Trash2,
  Gift,
  Recycle
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const TIER_DETAILS = {
  rookie: {
    Icon: Star,
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    benefits: [
      'Basic pickup service',
      'Points for each pickup',
      'Environmental impact tracking'
    ]
  },
  bronze: {
    Icon: Award,
    color: 'bg-amber-700',
    textColor: 'text-amber-700',
    benefits: [
      'All Rookie benefits',
      'Priority scheduling',
      '10% bonus points',
      'Monthly impact report'
    ]
  },
  silver: {
    Icon: Award,
    color: 'bg-slate-400',
    textColor: 'text-slate-400',
    benefits: [
      'All Bronze benefits',
      'Flexible pickup times',
      '25% bonus points',
      'Quarterly rewards'
    ]
  },
  gold: {
    Icon: Crown,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    benefits: [
      'All Silver benefits',
      'VIP pickup service',
      '50% bonus points',
      'Special recognition'
    ]
  },
  platinum: {
    Icon: Crown,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    benefits: [
      'All Gold benefits',
      'Premium service access',
      'Double points',
      'Exclusive rewards',
      'Environmental leader status'
    ]
  }
};

const Rewards = () => {
  const { userData, currentUser } = useAuth();
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalPickups: 0,
    achievements: []
  });

  // Calculate progress to next tier
  const getNextTierProgress = () => {
    const tiers = {
      rookie: { max: 100, next: 'Bronze' },
      bronze: { max: 200, next: 'Silver' },
      silver: { max: 500, next: 'Gold' },
      gold: { max: 1000, next: 'Platinum' },
      platinum: { max: null, next: null }
    };
    
    const currentTier = userData?.rewards?.tier || 'rookie';
    const currentPoints = userData?.rewards?.points || 0;
    const tierInfo = tiers[currentTier.toLowerCase()];

    if (!tierInfo?.next) return null;

    const progress = (currentPoints / tierInfo.max) * 100;
    return {
      nextTier: tierInfo.next,
      progress: Math.min(progress, 100),
      remaining: tierInfo.max - currentPoints,
      required: tierInfo.max
    };
  };

  useEffect(() => {
    const fetchRewardsData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        // Fetch pickup history for points
        const pickupsRef = collection(db, 'pickups');
        const pickupsQuery = query(
          pickupsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickups = pickupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate points and achievements
        const achievements = calculateAchievements(pickups);
        const pointsHistory = generatePointsHistory(pickups);

        setPointsHistory(pointsHistory);
        setStats({
          totalPoints: userData?.rewards?.points || 0,
          totalPickups: pickups.length,
          achievements
        });
      } catch (error) {
        console.error('Error fetching rewards data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewardsData();
  }, [currentUser, userData]);

  const calculateAchievements = (pickups) => {
    const achievements = [];
    const totalWaste = pickups.reduce((sum, pickup) => sum + pickup.quantity, 0);
    
    // Pickup milestones
    if (pickups.length >= 5) {
      achievements.push({
        title: 'Pickup Pioneer',
        description: 'Complete 5 pickups',
        icon: Package,
        earned: true
      });
    }
    
    // Waste amount milestones
    if (totalWaste >= 20) {
      achievements.push({
        title: 'Waste Warrior',
        description: 'Collect 20 bags of waste',
        icon: Trash2,
        earned: true
      });
    }

    // Points milestones
    if (stats.totalPoints >= 100) {
      achievements.push({
        title: 'Point Collector',
        description: 'Earn 100 points',
        icon: Award,
        earned: true
      });
    }

    return achievements;
  };

  const generatePointsHistory = (pickups) => {
    return pickups.map(pickup => ({
      date: pickup.createdAt,
      points: calculatePickupPoints(pickup),
      description: `Pickup - ${pickup.wasteTypes.join(', ')}`,
      quantity: pickup.quantity
    }));
  };

  const calculatePickupPoints = (pickup) => {
    const basePoints = {
      organic: 5,
      plastic: 8,
      paper: 6,
      metal: 10
    };

    return pickup.wasteTypes.reduce((total, type) => {
      return total + (basePoints[type] * pickup.quantity);
    }, 0);
  };

  const currentTier = userData?.rewards?.tier?.toLowerCase() || 'rookie';
  const currentTierDetails = TIER_DETAILS[currentTier];
  const TierIcon = currentTierDetails.Icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Current Tier Status */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <TierIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold capitalize">
              {userData?.rewards?.tier || 'Rookie'} Tier
            </h2>
            <p className="text-emerald-100">
              {userData?.rewards?.points || 0} total points earned
            </p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {getNextTierProgress() && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {getNextTierProgress().nextTier}</span>
              <span>{Math.round(getNextTierProgress().progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-300 transition-all duration-500"
                style={{ width: `${getNextTierProgress().progress}%` }}
              />
            </div>
            <p className="text-sm text-emerald-100">
              {getNextTierProgress().remaining} points needed for {getNextTierProgress().nextTier}
            </p>
          </div>
        )}
      </div>

      {/* Tier Benefits */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tier Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(TIER_DETAILS).map(([tier, { Icon, color, textColor, benefits }]) => {
            const isCurrentTier = tier === currentTier;
            const isLocked = !isCurrentTier && 
              TIER_DETAILS[currentTier].benefits.length < benefits.length;

            return (
              <div 
                key={tier}
                className={`p-4 rounded-xl border-2 transition-all
                  ${isCurrentTier ? 'border-emerald-500 bg-emerald-50' : 
                    isLocked ? 'border-gray-200 opacity-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
                    <Icon className={`h-5 w-5 ${textColor}`} />
                  </div>
                  <h3 className="font-semibold text-gray-800 capitalize">{tier}</h3>
                  {isLocked && (
                    <span className="text-xs text-gray-500 ml-auto">Locked</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-4 w-4 text-emerald-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Achievements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.achievements.map((achievement, index) => {
            const AchievementIcon = achievement.icon;
            return (
              <div key={index} className="p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <AchievementIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{achievement.title}</h3>
                    <p className="text-sm text-emerald-600">{achievement.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Points History</h2>
        <div className="space-y-4">
          {pointsHistory.map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Gift className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{entry.description}</p>
                  <p className="text-sm text-gray-500">
                    {entry.date.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-emerald-600">+{entry.points} points</p>
                <p className="text-sm text-gray-500">{entry.quantity} bags</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Rewards;