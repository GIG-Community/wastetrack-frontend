import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  ClipboardCheck,
  ArrowRight,
  X,
  ChevronLeft,
  Banknote,
  Scale,
  Truck,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  FileBarChart,
  AlertTriangle,
} from 'lucide-react';

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(1);
};

// Base Components
const WasteBankCard = ({ wasteBank, onSelect }) => {
  const lastPickupDate = wasteBank.stats?.lastPickup 
    ? new Date(wasteBank.stats.lastPickup.seconds * 1000)
    : null;
  const daysSinceLastPickup = lastPickupDate 
    ? Math.floor((new Date() - lastPickupDate) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div 
      onClick={() => onSelect(wasteBank)}
      className="group bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:border-emerald-500 
        hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Status Indicator */}
      {daysSinceLastPickup !== null && (
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium
          ${daysSinceLastPickup > 7 
            ? 'bg-amber-50 text-amber-700' 
            : 'bg-emerald-50 text-emerald-700'}`}
        >
          {daysSinceLastPickup > 7 ? 'Inactive' : 'Active'}
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
            <Package className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {wasteBank.profile?.institution || 'Unnamed Waste Bank'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {wasteBank.location?.address || 'No address provided'}
              </span>
            </p>
            {lastPickupDate && (
              <p className="text-xs text-gray-500 mt-2">
                Last active: {lastPickupDate.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 
          transform group-hover:translate-x-1 transition-all" />
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 group-hover:bg-emerald-50/50 transition-colors">
          <p className="text-sm font-medium text-gray-600">Pickups</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-lg font-semibold text-gray-900">
              {wasteBank.stats?.totalPickups || 0}
            </p>
            <p className="text-xs text-gray-500">total</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 group-hover:bg-emerald-50/50 transition-colors">
          <p className="text-sm font-medium text-gray-600">Volume</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-lg font-semibold text-gray-900">
              {(wasteBank.stats?.totalWeight || 0).toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">kg</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 group-hover:bg-emerald-50/50 transition-colors">
          <p className="text-sm font-medium text-gray-600">Value</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(wasteBank.stats?.totalValue || 0)}
            </p>
            <p className="text-xs text-gray-500">Rp</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">Monthly Target</p>
          <p className="text-sm font-medium text-emerald-600">75%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-5 w-5 text-gray-600" />
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {trend && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full
          ${trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-4 w-4 text-gray-500" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
    <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
  </div>
);

const WasteTypeCard = ({ type, data }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 capitalize">{type}</p>
        <p className="text-sm text-gray-500">{data.weight.toFixed(1)} kg</p>
      </div>
      <p className="text-sm font-medium text-emerald-600">
        Rp {data.value.toLocaleString()}
      </p>
    </div>
    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(data.weight / 100, 100)}%` }}
      />
    </div>
  </div>
);

const AlertBadge = ({ type, text }) => {
  const styles = {
    warning: 'bg-amber-50 text-amber-700',
    success: 'bg-emerald-50 text-emerald-700',
    error: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
      {text}
    </span>
  );
};

const DetailView = ({ wasteBank, pickups, onClose }) => {
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filterType, setFilterType] = useState('all');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'pickups', label: 'Pickup History' },
    { id: 'analytics', label: 'Analytics' },
  ];

  // Filter and sort pickups
  const filteredPickups = pickups
    .filter(pickup => {
      if (filterType === 'all') return true;
      if (filterType === 'recent') {
        const pickupDate = new Date(pickup.completedAt.seconds * 1000);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return pickupDate >= thirtyDaysAgo;
      }
      return true;
    })
    .sort((a, b) => b.completedAt.seconds - a.completedAt.seconds);

  if (selectedPickup) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedPickup(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Back to Overview</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pickup Details</h3>
            <p className="text-sm text-gray-500">
              {new Date(selectedPickup.completedAt?.seconds * 1000).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoCard
              icon={User}
              label="Collector"
              value={selectedPickup.userName}
            />
            <InfoCard
              icon={Phone}
              label="Contact"
              value={selectedPickup.phone}
            />
            <InfoCard
              icon={MapPin}
              label="Location"
              value={selectedPickup.location}
            />
            <InfoCard
              icon={ClipboardCheck}
              label="Status"
              value={selectedPickup.status.charAt(0).toUpperCase() + selectedPickup.status.slice(1)}
            />
            <InfoCard
              icon={Scale}
              label="Total Weight"
              value={`${Object.values(selectedPickup.wastes).reduce((sum, waste) => sum + waste.weight, 0)} kg`}
            />
            <InfoCard
              icon={Banknote}
              label="Total Value"
              value={`Rp ${selectedPickup.totalValue.toLocaleString()}`}
            />
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Waste Details</h4>
            <div className="space-y-3">
              {Object.entries(selectedPickup.wastes).map(([type, data]) => (
                <WasteTypeCard key={type} type={type} data={data} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {wasteBank.profile?.institution}
            </h2>
            <AlertBadge 
              type={wasteBank.stats?.isActive ? 'success' : 'warning'}
              text={wasteBank.stats?.isActive ? 'Active' : 'Inactive'}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {wasteBank.location?.address}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative
              ${selectedTab === tab.id 
                ? 'text-emerald-600' 
                : 'text-gray-500 hover:text-gray-900'}`}
          >
            {tab.label}
            {selectedTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {selectedTab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Truck}
                label="Total Pickups"
                value={pickups.length}
                trend={8.5}
              />
              <StatCard
                icon={Scale}
                label="Total Weight"
                value={`${(pickups.reduce((sum, pickup) => 
                  sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0)).toFixed(1)} kg`}
                trend={12.3}
              />
              <StatCard
                icon={Banknote}
                label="Revenue"
                value={`Rp ${formatNumber(pickups.reduce((sum, pickup) => sum + pickup.totalValue, 0))}`}
                trend={15.7}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Waste Distribution</h4>
              <div className="space-y-3">
                {Object.entries(
                  pickups.reduce((acc, pickup) => {
                    Object.entries(pickup.wastes).forEach(([type, data]) => {
                      if (!acc[type]) acc[type] = { weight: 0, value: 0 };
                      acc[type].weight += data.weight;
                      acc[type].value += data.value;
                    });
                    return acc;
                  }, {})
                ).map(([type, data]) => (
                  <WasteTypeCard key={type} type={type} data={data} />
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Weekly Activity</h4>
              <div className="flex items-end gap-2 h-32">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-emerald-200 rounded-sm"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                    <span className="text-xs text-gray-500">D{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedTab === 'pickups' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">All Time</option>
                  <option value="recent">Last 30 Days</option>
                </select>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {filteredPickups.length} pickups
              </p>
            </div>

            <div className="space-y-3">
              {filteredPickups.map(pickup => (
                <div
                  key={pickup.id}
                  onClick={() => setSelectedPickup(pickup)}
                  className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-white 
                    hover:border-emerald-500 border border-transparent transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="font-medium text-gray-900">{pickup.userName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {new Date(pickup.completedAt?.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Scale className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium text-gray-900">
                          {Object.values(pickup.wastes).reduce((sum, waste) => sum + waste.weight, 0)} kg
                        </p>
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600">
                          Rp {pickup.totalValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(pickup.wastes).map(type => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 
                          rounded-full text-xs font-medium"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Collection Rate</p>
                    <p className="text-sm font-medium text-emerald-600">92%</p>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Processing Time</p>
                    <p className="text-sm font-medium text-emerald-600">85%</p>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Monthly Targets</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Volume Target</p>
                    <p className="text-sm font-medium text-emerald-600">
                      {formatNumber(wasteBank.stats?.totalWeight || 0)} / 1000 kg
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ 
                        width: `${Math.min(((wasteBank.stats?.totalWeight || 0) / 1000) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Pickup Target</p>
                    <p className="text-sm font-medium text-emerald-600">
                      {pickups.length} / 50 pickups
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((pickups.length / 50) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RecyclingHub = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [pickupData, setPickupData] = useState([]);
  const [selectedWasteBank, setSelectedWasteBank] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch waste banks
        const wasteBankQuery = query(collection(db, 'users'));
        const wasteBankSnapshot = await getDocs(wasteBankQuery);
        const wasteBankData = wasteBankSnapshot.docs
          .filter(doc => doc.data().role === 'wastebank_admin')
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

        // Fetch pickups
        const pickupsQuery = query(collection(db, 'pickups'));
        const pickupsSnapshot = await getDocs(pickupsQuery);
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(pickup => pickup.status === 'completed');

        // Calculate waste bank statistics
        const wasteBanksWithStats = wasteBankData.map(bank => {
          const bankPickups = pickupsData.filter(pickup => pickup.wasteBankId === bank.id);
          const lastPickup = bankPickups.length > 0 ? 
            bankPickups.reduce((latest, pickup) => 
              pickup.completedAt.seconds > latest.completedAt.seconds ? pickup : latest
            ) : null;

          const stats = {
            totalPickups: bankPickups.length,
            totalWeight: bankPickups.reduce((sum, pickup) => 
              sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0),
            totalValue: bankPickups.reduce((sum, pickup) => sum + pickup.totalValue, 0),
            lastPickup: lastPickup?.completedAt,
            isActive: lastPickup ? 
              (new Date() - new Date(lastPickup.completedAt.seconds * 1000)) / (1000 * 60 * 60 * 24) <= 7 
              : false
          };
          return { ...bank, stats };
        });

        setWasteBanks(wasteBanksWithStats);
        setPickupData(pickupsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredWasteBanks = wasteBanks.filter(bank => 
    bank.profile?.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Recycling Hub</h1>
                <p className="text-sm text-gray-500">
                  Manage and monitor waste banks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search waste banks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 
                    focus:border-emerald-500 w-64"
                />
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button className="p-2 hover:bg-white rounded-lg transition-colors">
              <Filter className="h-5 w-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-white rounded-lg transition-colors">
                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-medium text-gray-900">Total Collections</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(pickupData.reduce((sum, pickup) => 
                  sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0))} kg
              </p>
              <p className="text-sm text-gray-500 mt-1">
                From {pickupData.length} pickups
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FileBarChart className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-medium text-gray-900">Average Per Pickup</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(pickupData.reduce((sum, pickup) => 
                  sum + Object.values(pickup.wastes).reduce((w, waste) => w + waste.weight, 0), 0) / 
                  (pickupData.length || 1))} kg
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last 30 days
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-medium text-gray-900">Inactive Banks</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {wasteBanks.filter(bank => !bank.stats?.isActive).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                No pickups in 7+ days
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6">
            {selectedWasteBank ? (
              <DetailView 
                wasteBank={selectedWasteBank}
                pickups={pickupData.filter(p => p.wasteBankId === selectedWasteBank.id)}
                onClose={() => setSelectedWasteBank(null)}
              />
            ) : (
              filteredWasteBanks.map(wasteBank => (
                <WasteBankCard
                  key={wasteBank.id}
                  wasteBank={wasteBank}
                  onSelect={setSelectedWasteBank}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RecyclingHub;