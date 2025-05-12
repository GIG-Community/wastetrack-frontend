import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  Building2,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Scale,
  ChevronRight,
  BarChart2,
  Filter,
  Calendar,
  TrendingUp,
  Warehouse,
  Clock,
  RotateCw,
  Users,
  Recycle,
  Eye,
  ArrowUpRight,
  Maximize2,
  ArrowDownLeft,
  MapPinOff,
  Banknote,
  Target,
  Network,
  FileBarChart,
  X
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];
const COMPLIANCE_LEVELS = {
  HIGH: { color: '#10B981', label: 'Kepatuhan Tinggi' },
  MEDIUM: { color: '#F59E0B', label: 'Kepatuhan Sedang' },
  LOW: { color: '#EF4444', label: 'Kepatuhan Rendah' },
};

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + ' Juta';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' Ribu';
  return num.toFixed(1);
};

// Card Components
const StatCard = ({ icon: Icon, label, value, trend, subValue, color = "emerald" }) => (
  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800">{value}</p>
          {subValue && (
            <p className="mt-1 text-sm text-gray-500">{subValue}</p>
          )}
        </div>
      </div>
      {trend && (
        <div className={`px-2.5 py-1.5 rounded-lg text-sm font-medium
          ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, description, children, className = '' }) => (
  <div className={`p-6 bg-white border border-gray-200 rounded-xl ${className}`}>
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const WasteBankCard = ({ wasteBank, masterRequests, onSelect }) => {
  const complianceScore = calculateComplianceScore(wasteBank, masterRequests);
  let compliance = 'LOW';
  if (complianceScore >= 90) compliance = 'HIGH';
  else if (complianceScore >= 70) compliance = 'MEDIUM';

  const isMasterBank = wasteBank.role === 'wastebank_master';
  const stats = isMasterBank ? 
    calculateMasterBankStats(wasteBank, masterRequests) :
    calculateWasteBankStats(wasteBank, masterRequests);

  return (
    <div 
      onClick={() => onSelect(wasteBank)}
      className={`p-6 transition-all bg-white border shadow-sm cursor-pointer rounded-xl hover:shadow-md
        ${isMasterBank ? 
          'border-indigo-200 hover:border-indigo-500' : 
          'border-emerald-200 hover:border-emerald-500'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${isMasterBank ? 'bg-indigo-50' : 'bg-emerald-50'}`}>
            {isMasterBank ? 
              <Network className={`w-6 h-6 text-indigo-600`} /> :
              <Building2 className={`w-6 h-6 text-emerald-600`} />
            }
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {wasteBank.profile?.institution || wasteBank.profile?.institutionName || 'Unnamed Bank'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {wasteBank.location?.city}, {wasteBank.location?.province || ''}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 text-sm font-medium rounded-full
          ${isMasterBank ? 'bg-indigo-50 text-indigo-700' : 
           compliance === 'HIGH' ? 'bg-emerald-50 text-emerald-700' :
           compliance === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
           'bg-red-50 text-red-700'}`}
        >
          {isMasterBank ? 'Master Bank' : COMPLIANCE_LEVELS[compliance].label}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {/* Common Stats */}
        <div className="p-3 rounded-lg bg-gray-50">
          <p className="text-sm font-medium text-gray-600">Total Volume</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatNumber(stats.totalVolume)} kg
          </p>
        </div>

        {isMasterBank ? (
          <>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-600">Connected Banks</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {stats.connectedBanks}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-600">Total Transfers</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {stats.totalTransfers}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-600">Collections</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {stats.totalCollections}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-600">Compliance Score</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {Math.round(complianceScore)}%
              </p>
            </div>
          </>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-2 col-span-3 gap-4 mt-2">
          <div className="flex items-center gap-2 p-2 text-sm text-gray-600 rounded-lg bg-gray-50">
            <MapPin className="w-4 h-4" />
            {wasteBank.location?.address || 'No address'}
          </div>
          <div className="flex items-center gap-2 p-2 text-sm text-gray-600 rounded-lg bg-gray-50">
            <Clock className="w-4 h-4" />
            {stats.lastActive ? 
              `Last active: ${new Date(stats.lastActive.seconds * 1000).toLocaleDateString()}` : 
              'No activity'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for calculating actual metrics
const calculateComplianceScore = (wasteBank, masterRequests) => {
  if (wasteBank.role === 'wastebank_master') return 100; // Master banks are always compliant
  
  const bankRequests = masterRequests.filter(req => req.wasteBankId === wasteBank.id);
  const now = new Date();
  
  // Calculate days since last transfer
  const lastRequest = bankRequests.length > 0 ? 
    bankRequests.reduce((latest, req) => 
      req.completedAt?.seconds > (latest.completedAt?.seconds || 0) ? req : latest
    , { completedAt: { seconds: 0 } }) : null;
  
  const daysSinceLastTransfer = lastRequest?.completedAt ? 
    Math.floor((now - new Date(lastRequest.completedAt.seconds * 1000)) / (1000 * 60 * 60 * 24)) : 30;

  // Calculate warehouse utilization
  const dimensions = wasteBank.warehouseDimensions || {};
  const capacity = (dimensions.length || 0) * (dimensions.width || 0) * (dimensions.height || 0);
  const currentVolume = bankRequests.reduce((total, req) => {
    return total + Object.values(req.wastes || {}).reduce((sum, waste) => sum + (waste.weight || 0), 0);
  }, 0);
  
  const utilizationScore = capacity > 0 ? Math.min(100, (currentVolume / capacity) * 100) : 0;
  
  // Calculate transfer frequency score
  const transferFrequencyScore = Math.max(0, 100 - (daysSinceLastTransfer * 3.33)); // Reduce score by ~3.33 points per day

  // Calculate volume efficiency
  const volumeScore = Math.min(100, (currentVolume / 1000) * 10); // 10 points per 100kg

  // Final weighted score
  return Math.round(
    (transferFrequencyScore * 0.4) + // 40% weight on regular transfers
    (utilizationScore * 0.3) + // 30% weight on proper warehouse utilization
    (volumeScore * 0.3) // 30% weight on volume handled
  );
};

const calculateMasterBankStats = (masterBank, masterRequests) => {
  const bankRequests = masterRequests.filter(req => req.masterBankId === masterBank.id);
  const connectedBanks = new Set(bankRequests.map(req => req.wasteBankId));
  
  const totalVolume = bankRequests.reduce((sum, req) => {
    return sum + Object.values(req.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
  }, 0);

  return {
    connectedBanks: connectedBanks.size,
    totalVolume,
    totalTransfers: bankRequests.length
  };
};

const calculateWasteBankStats = (wasteBank, masterRequests) => {
  const bankRequests = masterRequests.filter(req => req.wasteBankId === wasteBank.id);
  
  const totalVolume = bankRequests.reduce((sum, req) => {
    return sum + Object.values(req.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
  }, 0);

  const lastActive = bankRequests.length > 0 ? 
    bankRequests.reduce((latest, req) => 
      req.completedAt?.seconds > (latest.completedAt?.seconds || 0) ? req : latest
    , { completedAt: { seconds: 0 } }).completedAt : null;

  return {
    totalVolume,
    totalCollections: bankRequests.length,
    lastActive
  };
};

const WasteBankDetailPanel = ({ wasteBank, pickups, masterRequests, onClose }) => {
  if (!wasteBank) return null;

  const bankPickups = pickups.filter(pickup => pickup.wasteBankId === wasteBank.id);
  const bankTransfers = masterRequests.filter(req => req.wasteBankId === wasteBank.id);

  // Calculate monthly trends
  const monthlyStats = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = month.toLocaleDateString('default', { month: 'short' });
    monthlyStats[monthKey] = {
      month: monthKey,
      volume: 0,
      pickups: 0,
      value: 0
    };
  }

  bankPickups.forEach(pickup => {
    if (!pickup.completedAt) return;
    const date = new Date(pickup.completedAt.seconds * 1000);
    const monthKey = date.toLocaleDateString('default', { month: 'short' });
    if (monthlyStats[monthKey]) {
      monthlyStats[monthKey].pickups++;
      Object.values(pickup.wastes || {}).forEach(waste => {
        monthlyStats[monthKey].volume += waste.weight || 0;
        monthlyStats[monthKey].value += waste.value || 0;
      });
    }
  });

  // Calculate waste type distribution
  const wasteTypeStats = {};
  bankPickups.forEach(pickup => {
    Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
      if (!wasteTypeStats[type]) {
        wasteTypeStats[type] = { type, weight: 0, value: 0, count: 0 };
      }
      wasteTypeStats[type].weight += data.weight || 0;
      wasteTypeStats[type].value += data.value || 0;
      wasteTypeStats[type].count++;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {wasteBank.profile?.institution || 'Unnamed Bank'}
              </h2>
              <p className="text-sm text-gray-600">
                {wasteBank.location?.address}, {wasteBank.location?.city}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Monthly Activity */}
            <ChartCard
              title="Monthly Activity"
              description="Volume collected and revenue generated"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={Object.values(monthlyStats)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `Rp ${formatNumber(value)}`}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      fill="#10B981"
                      stroke="#10B981"
                      fillOpacity={0.2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="value"
                      name="Value"
                      stroke="#F59E0B"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="pickups"
                      name="Pickups"
                      fill="#6366F1"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution */}
            <ChartCard
              title="Waste Type Distribution"
              description="Volume by waste category"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.values(wasteTypeStats)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="type" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="weight" name="Weight (kg)" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Recent Activity */}
          <ChartCard
            title="Recent Activity"
            description="Latest pickups and transfers"
            className="mt-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Type</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Volume</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Value</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...bankPickups, ...bankTransfers]
                    .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
                    .slice(0, 10)
                    .map(activity => {
                      const volume = Object.values(activity.wastes || {})
                        .reduce((sum, waste) => sum + (waste.weight || 0), 0);
                      const value = Object.values(activity.wastes || {})
                        .reduce((sum, waste) => sum + (waste.value || 0), 0);
                      
                      return (
                        <tr key={activity.id} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(activity.completedAt?.seconds * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {activity.masterBankId ? 'Transfer' : 'Pickup'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatNumber(volume)} kg
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            Rp {formatNumber(value)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full
                              ${activity.status === 'completed' ? 
                                'bg-emerald-50 text-emerald-700' : 
                                'bg-amber-50 text-amber-700'}`}>
                              {activity.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

const MasterWasteBankDetailPanel = ({ masterBank, requests, wasteBanks, onClose }) => {
  if (!masterBank) return null;

  const bankRequests = requests.filter(req => req.masterBankId === masterBank.id);
  const connectedBanks = new Set(bankRequests.map(req => req.wasteBankId));
  
  // Calculate monthly trends
  const monthlyStats = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = month.toLocaleDateString('default', { month: 'short' });
    monthlyStats[monthKey] = {
      month: monthKey,
      volume: 0,
      requests: 0,
      value: 0
    };
  }

  bankRequests.forEach(req => {
    if (!req.completedAt) return;
    const date = new Date(req.completedAt.seconds * 1000);
    const monthKey = date.toLocaleDateString('default', { month: 'short' });
    if (monthlyStats[monthKey]) {
      monthlyStats[monthKey].requests++;
      Object.values(req.wastes || {}).forEach(waste => {
        monthlyStats[monthKey].volume += waste.weight || 0;
        monthlyStats[monthKey].value += waste.value || 0;
      });
    }
  });

  // Calculate waste type distribution
  const wasteTypeStats = {};
  bankRequests.forEach(req => {
    Object.entries(req.wastes || {}).forEach(([type, data]) => {
      if (!wasteTypeStats[type]) {
        wasteTypeStats[type] = { type, weight: 0, value: 0, count: 0 };
      }
      wasteTypeStats[type].weight += data.weight || 0;
      wasteTypeStats[type].value += data.value || 0;
      wasteTypeStats[type].count++;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Network className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {masterBank.profile?.institutionName || 'Unnamed Master Bank'}
              </h2>
              <p className="text-sm text-gray-600">
                {masterBank.location?.address}, {masterBank.location?.city}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Monthly Activity */}
            <ChartCard
              title="Monthly Activity"
              description="Volume processed and number of transfers"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={Object.values(monthlyStats)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      fill="#6366F1"
                      stroke="#6366F1"
                      fillOpacity={0.2}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="requests"
                      name="Transfers"
                      fill="#F59E0B"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution */}
            <ChartCard
              title="Waste Type Distribution"
              description="Volume by waste category"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.values(wasteTypeStats)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="type" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="weight" name="Volume (kg)" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Connected Waste Banks */}
          <ChartCard
            title="Connected Waste Banks"
            description="Waste banks that transfer to this master bank"
            className="mt-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Name</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Location</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Total Transfers</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Total Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(connectedBanks).map(bankId => {
                    const bank = wasteBanks.find(b => b.id === bankId);
                    if (!bank) return null;

                    const bankStats = bankRequests
                      .filter(req => req.wasteBankId === bankId)
                      .reduce((stats, req) => {
                        stats.transfers++;
                        Object.values(req.wastes || {}).forEach(waste => {
                          stats.volume += waste.weight || 0;
                        });
                        return stats;
                      }, { transfers: 0, volume: 0 });

                    return (
                      <tr key={bankId} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {bank.profile?.institution || 'Unnamed Bank'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {bank.location?.city || 'Unknown location'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {bankStats.transfers}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatNumber(bankStats.volume)} kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

const GovernmentMonitoring = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWasteBank, setSelectedWasteBank] = useState(null);
  const [selectedMasterBank, setSelectedMasterBank] = useState(null);
  const [data, setData] = useState({
    wasteBanks: [],
    masterBanks: [],
    pickups: [],
    masterRequests: [],
    complianceStats: {
      high: 0,
      medium: 0,
      low: 0,
    },
    totalVolume: 0,
    totalPickups: 0,
    monthlyData: [],
    wasteTypeBreakdown: [],
  });
  const [filters, setFilters] = useState({
    compliance: 'all', // 'all', 'high', 'medium', 'low'
    sortBy: 'name', // 'name', 'volume', 'compliance', 'activity'
    type: 'all', // 'all', 'master', 'regular'
  });

  useEffect(() => {
    setLoading(true);
    
    try {
      // Create queries
      const wasteBankQuery = query(collection(db, 'users'), where('role', '==', 'wastebank_admin'));
      const masterBankQuery = query(collection(db, 'users'), where('role', '==', 'wastebank_master'));
      const pickupsQuery = query(collection(db, 'pickups'));
      const masterRequestsQuery = query(collection(db, 'masterBankRequests'));
      
      // Keep track of unsubscribe functions for cleanup
      const unsubscribes = [];
      
      // Data collectors
      let wasteBankData = [];
      let masterBankData = [];
      let pickupsData = [];
      let masterRequestsData = [];
      
      // Counter to track when all data sources have loaded
      let dataSourcesLoaded = 0;
      const totalDataSources = 4;
      
      // Process the data when all data sources have loaded
      const processData = () => {
        if (dataSourcesLoaded < totalDataSources) return;
        
        // Process pickups data (filter completed)
        const completedPickups = pickupsData.filter(pickup => pickup.status === 'completed');

        // Process master bank requests with advanced metrics
        const completedMasterRequests = masterRequestsData.filter(request => request.status === 'completed');

        // Calculate waste bank statistics and advanced metrics
        const wasteBanksWithStats = wasteBankData.map(bank => {
          const bankPickups = completedPickups.filter(pickup => pickup.wasteBankId === bank.id);
          const bankTransfers = completedMasterRequests.filter(req => req.wasteBankId === bank.id);
          
          // Calculate efficiency metrics
          const totalPickupVolume = bankPickups.reduce((sum, pickup) => {
            return sum + Object.values(pickup.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
          }, 0);

          const totalTransferVolume = bankTransfers.reduce((sum, transfer) => {
            return sum + Object.values(transfer.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
          }, 0);

          // Calculate warehouse utilization
          const warehouseCapacity = (bank.warehouseDimensions?.length || 0) * 
                                  (bank.warehouseDimensions?.width || 0) * 
                                  (bank.warehouseDimensions?.height || 0);
          
          const currentInventory = Math.max(0, totalPickupVolume - totalTransferVolume);
          const warehouseUtilization = warehouseCapacity > 0 ? 
            (currentInventory / warehouseCapacity) * 100 : 0;

          // Calculate processing efficiency (ratio of transfers to collections)
          const processingEfficiency = bankPickups.length > 0 ? 
            (bankTransfers.length / bankPickups.length) * 100 : 0;

          // Calculate average processing time
          const processingTimes = bankTransfers.map(transfer => {
            const transferDate = transfer.completedAt?.seconds || 0;
            const relatedPickups = bankPickups.filter(pickup => 
              pickup.completedAt?.seconds <= transferDate
            );
            if (relatedPickups.length === 0) return 0;
            const avgPickupTime = relatedPickups.reduce((sum, pickup) => 
              sum + pickup.completedAt?.seconds, 0) / relatedPickups.length;
            return Math.max(0, transferDate - avgPickupTime) / (60 * 60 * 24); // Convert to days
          });

          const averageProcessingTime = processingTimes.length > 0 ? 
            processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

          // Calculate revenue metrics
          const totalRevenue = bankPickups.reduce((sum, pickup) => sum + (pickup.totalValue || 0), 0);
          const monthlyRevenue = {};
          bankPickups.forEach(pickup => {
            const date = new Date(pickup.completedAt?.seconds * 1000);
            const monthKey = date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (pickup.totalValue || 0);
          });

          // Calculate waste type distribution
          const wasteTypeStats = {};
          bankPickups.forEach(pickup => {
            Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
              if (!wasteTypeStats[type]) {
                wasteTypeStats[type] = { weight: 0, value: 0, count: 0 };
              }
              wasteTypeStats[type].weight += data.weight || 0;
              wasteTypeStats[type].value += data.value || 0;
              wasteTypeStats[type].count++;
            });
          });

          // Calculate compliance score with more factors
          const now = new Date();
          const lastPickup = bankPickups.length > 0 ? 
            bankPickups.reduce((latest, pickup) => 
              pickup.completedAt?.seconds > (latest.completedAt?.seconds || 0) ? pickup : latest
            , { completedAt: { seconds: 0 } }) : null;

          const daysSinceLastPickup = lastPickup?.completedAt ? 
            Math.floor((now - new Date(lastPickup.completedAt.seconds * 1000)) / (1000 * 60 * 60 * 24)) : 30;

          const complianceScore = Math.min(100, Math.max(0,
            // Regular activity (30 points)
            (30 - Math.min(30, daysSinceLastPickup)) +
            // Processing efficiency (25 points)
            (Math.min(25, processingEfficiency * 0.25)) +
            // Warehouse utilization (25 points)
            (25 - Math.abs(warehouseUtilization - 50) * 0.5) +
            // Volume handled (20 points)
            (Math.min(20, (totalPickupVolume / 1000) * 2))
          ));

          return {
            ...bank,
            stats: {
              totalPickups: bankPickups.length,
              totalTransfers: bankTransfers.length,
              totalVolume: totalPickupVolume,
              transferVolume: totalTransferVolume,
              warehouseCapacity,
              warehouseUtilization,
              processingEfficiency,
              averageProcessingTime,
              totalRevenue,
              monthlyRevenue,
              wasteTypeStats,
              complianceScore,
              lastPickup: lastPickup?.completedAt,
              performance: {
                pickupFrequency: bankPickups.length / (daysSinceLastPickup || 1),
                revenuePerPickup: bankPickups.length > 0 ? totalRevenue / bankPickups.length : 0,
                volumePerPickup: bankPickups.length > 0 ? totalPickupVolume / bankPickups.length : 0
              }
            }
          };
        });

        // Calculate compliance distribution
        const complianceStats = wasteBanksWithStats.reduce((acc, bank) => {
          const score = bank.stats?.complianceScore || 0;
          if (score >= 90) acc.high++;
          else if (score >= 70) acc.medium++;
          else acc.low++;
          return acc;
        }, { high: 0, medium: 0, low: 0 });

        // Calculate monthly trends
        const monthlyStats = {};
        const today = new Date();
        
        // Initialize 6 months of data
        for (let i = 5; i >= 0; i--) {
          const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthKey = month.toLocaleString('default', { month: 'short' });
          
          monthlyStats[monthKey] = {
            month: monthKey,
            weight: 0,
            pickups: 0,
            transfers: 0,
            compliance: 0,
          };
        }
        
        // Add pickup data
        completedPickups.forEach(pickup => {
          if (!pickup.completedAt) return;
          
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].pickups++;
            
            Object.values(pickup.wastes || {}).forEach(waste => {
              monthlyStats[monthKey].weight += waste.weight || 0;
            });
          }
        });
        
        // Add transfer data
        completedMasterRequests.forEach(request => {
          if (!request.completedAt) return;
          
          const date = new Date(request.completedAt.seconds * 1000);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].transfers++;
          }
        });

        // Calculate waste type breakdown across all pickups
        const wasteTypesMap = {};
        
        completedPickups.forEach(pickup => {
          Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
            if (!wasteTypesMap[type]) {
              wasteTypesMap[type] = { 
                type, 
                volume: 0,
                value: 0,
                count: 0 
              };
            }
            wasteTypesMap[type].volume += data.weight || 0;
            wasteTypesMap[type].value += data.value || 0;
            wasteTypesMap[type].count++;
          });
        });

        setData({
          wasteBanks: wasteBanksWithStats,
          masterBanks: masterBankData,
          pickups: completedPickups,
          masterRequests: completedMasterRequests,
          complianceStats,
          totalVolume: wasteBanksWithStats.reduce((sum, bank) => sum + (bank.stats?.totalWeight || 0), 0),
          totalPickups: completedPickups.length,
          monthlyData: Object.values(monthlyStats),
          wasteTypeBreakdown: Object.values(wasteTypesMap),
        });
        
        setLoading(false);
      };
      
      // Set up real-time listeners for each collection
      
      // Listen for waste banks
      const wasteBankUnsubscribe = onSnapshot(wasteBankQuery, 
        (snapshot) => {
          wasteBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching waste banks:', error);
          setError('Failed to load waste bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(wasteBankUnsubscribe);
      
      // Listen for master banks
      const masterBankUnsubscribe = onSnapshot(masterBankQuery, 
        (snapshot) => {
          masterBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master banks:', error);
          setError('Failed to load master bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterBankUnsubscribe);
      
      // Listen for pickups
      const pickupsUnsubscribe = onSnapshot(pickupsQuery, 
        (snapshot) => {
          pickupsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching pickups:', error);
          setError('Failed to load pickups data');
          setLoading(false);
        }
      );
      unsubscribes.push(pickupsUnsubscribe);
      
      // Listen for master requests
      const masterRequestsUnsubscribe = onSnapshot(masterRequestsQuery, 
        (snapshot) => {
          masterRequestsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master requests:', error);
          setError('Failed to load master requests data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterRequestsUnsubscribe);
      
      // Clean up all listeners when component unmounts
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
      
    } catch (err) {
      console.error('Error setting up listeners:', err);
      setError('Failed to load monitoring data');
      setLoading(false);
    }
  }, []);

  // Filter and sort the waste banks
  const getFilteredWasteBanks = () => {
    let filtered = [...data.wasteBanks];
    
    // Apply compliance filter
    if (filters.compliance !== 'all') {
      filtered = filtered.filter(bank => {
        const score = bank.stats?.complianceScore || 0;
        if (filters.compliance === 'high') return score >= 90;
        if (filters.compliance === 'medium') return score >= 70 && score < 90;
        if (filters.compliance === 'low') return score < 70;
        return true;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(bank =>
        (bank.profile?.institution || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bank.location?.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bank.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return (a.profile?.institution || '').localeCompare(b.profile?.institution || '');
        case 'volume':
          return (b.stats?.totalWeight || 0) - (a.stats?.totalWeight || 0);
        case 'compliance':
          return (b.stats?.complianceScore || 0) - (a.stats?.complianceScore || 0);
        case 'activity':
          return (b.stats?.totalPickups || 0) - (a.stats?.totalPickups || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const filteredWasteBanks = getFilteredWasteBanks();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{error}</h3>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
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
              <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                <Activity className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Pemantauan Bank Sampah</h1>
                <p className="text-sm text-gray-500">Pantau dan analisis kinerja bank sampah</p>
              </div>
            </div>
          </div>

          {/* Panduan Membaca Dashboard */}
          <div className="p-4 mb-8 text-blue-700 rounded-lg bg-blue-50">
            <h2 className="mb-2 text-lg font-semibold">Panduan Membaca Dashboard:</h2>
            <ul className="space-y-2 text-sm">
              <li>• Semua grafik menampilkan data 6 bulan terakhir</li>
              <li>• Angka yang ditampilkan dalam "Ribu" atau "Juta" untuk memudahkan pembacaan</li>
              <li>• Warna hijau menandakan kinerja baik, kuning sedang, dan merah perlu perhatian</li>
              <li>• Klik pada setiap bank sampah untuk melihat detail lengkap</li>
            </ul>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Total Bank Sampah"
              value={data.wasteBanks.length}
              subValue={`${data.complianceStats.high} bank berkinerja baik`}
            />
            <StatCard
              icon={Scale}
              label="Total Volume Sampah"
              value={`${formatNumber(data.totalVolume)} kg`}
              trend={data.monthlyData.length >= 2 ? 
                Math.round((data.monthlyData[data.monthlyData.length-1].weight / 
                  Math.max(0.1, data.monthlyData[data.monthlyData.length-2].weight) * 100) - 100) : 0}
              subValue="Dibandingkan bulan lalu"
            />
            <StatCard
              icon={Activity}
              label="Tingkat Kepatuhan"
              value={`${Math.round((data.complianceStats.high + data.complianceStats.medium) / 
                Math.max(1, data.wasteBanks.length) * 100)}%`}
              color="blue"
              subValue="Bank sampah yang aktif"
            />
            <StatCard
              icon={AlertTriangle}
              label="Bank Perlu Perhatian"
              value={data.complianceStats.low}
              subValue="Kinerja perlu ditingkatkan"
              color="amber"
            />
          </div>

          {/* Compliance Distribution and Monthly Activity */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            <ChartCard
              title="Distribusi Tingkat Kepatuhan"
              description={
                <div className="space-y-2">
                  <p>Pembagian bank sampah berdasarkan kinerja:</p>
                  <ul className="pl-4 text-xs list-disc">
                    <li>Hijau: Kinerja sangat baik ({'>'}90%)</li>
                    <li>Kuning: Kinerja cukup (70-90%)</li>
                    <li>Merah: Perlu peningkatan (&lt;70%)</li>
                  </ul>
                  <p className="mt-2 text-xs italic text-gray-600">
                    Tingkat kepatuhan diukur dari beberapa faktor termasuk: frekuensi pengumpulan, 
                    efisiensi transfer sampah ke bank master, pemanfaatan gudang yang optimal, 
                    dan keteraturan pelaporan. Bank dengan skor rendah memerlukan pembinaan khusus.
                  </p>
                </div>
              }
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Kepatuhan Tinggi', value: data.complianceStats.high },
                        { name: 'Kepatuhan Sedang', value: data.complianceStats.medium },
                        { name: 'Kepatuhan Rendah', value: data.complianceStats.low },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        name
                      }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return percent > 0 ? (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {[COMPLIANCE_LEVELS.HIGH.color, COMPLIANCE_LEVELS.MEDIUM.color, COMPLIANCE_LEVELS.LOW.color]
                        .map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Monthly Activity */}
            <ChartCard 
              title="Aktivitas Bulanan"
              description={
                <div className="space-y-2">
                  <p>Grafik menunjukkan:</p>
                  <ul className="pl-4 text-xs list-disc">
                    <li>Area hijau: Total volume sampah (kg)</li>
                    <li>Batang ungu: Jumlah pengumpulan</li>
                    <li>Batang oranye: Jumlah transfer</li>
                  </ul>
                </div>
              }
              className="lg:col-span-2"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      dataKey="weight"
                      name="Volume"
                      fill="#10B981"
                      stroke="#10B981"
                      fillOpacity={0.2}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="pickups"
                      name="Collections"
                      fill="#6366F1"
                      stackId="a"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="transfers"
                      name="Transfers"
                      fill="#F59E0B"
                      stackId="a"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Waste Type Breakdown */}
          <ChartCard
            title="Analisis Jenis Sampah"
            description={
              <div className="space-y-2">
                <p>Perbandingan volume dan nilai tiap jenis sampah:</p>
                <ul className="pl-4 text-xs list-disc">
                  <li>Batang hijau: Volume dalam kilogram (kg)</li>
                  <li>Batang kuning: Nilai dalam Rupiah (Rp)</li>
                  <li>Klik pada grafik untuk melihat detail</li>
                </ul>
              </div>
            }
            className="mb-8"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.wasteTypeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `${formatNumber(value)} kg`} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => `Rp ${formatNumber(value)}`} 
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Volume') return `${formatNumber(value)} kg`;
                      if (name === 'Value') return `Rp ${formatNumber(value)}`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#10B981" />
                  <Bar yAxisId="right" dataKey="value" name="Value" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Waste Bank Facilities */}
          <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Daftar Bank Sampah</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Informasi lengkap semua bank sampah dalam jaringan
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="text"
                    placeholder="Cari bank sampah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="py-2 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filters.type || 'all'}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Bank</option>
                  <option value="master">Bank Master</option>
                  <option value="regular">Bank Reguler</option>
                </select>
                <select
                  value={filters.compliance}
                  onChange={(e) => setFilters({ ...filters, compliance: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Tingkat</option>
                  <option value="high">Kinerja Tinggi</option>
                  <option value="medium">Kinerja Sedang</option>
                  <option value="low">Perlu Perhatian</option>
                </select>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="name">Urut Nama</option>
                  <option value="volume">Urut Volume</option>
                  <option value="compliance">Urut Kinerja</option>
                  <option value="activity">Urut Aktivitas</option>
                </select>
              </div>
            </div>

            {/* Facility Type Legend */}
            <div className="flex items-center gap-6 p-4 mb-6 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded">
                  <Network className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Bank Sampah Master</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Bank Sampah Reguler</span>
              </div>
              <div className="h-6 border-l border-gray-300" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">Baik</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">Sedang</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-600">Kurang</span>
                </div>
              </div>
            </div>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[...data.masterBanks, ...filteredWasteBanks]
                .filter(bank => {
                  if (filters.type === 'master') return bank.role === 'wastebank_master';
                  if (filters.type === 'regular') return bank.role === 'wastebank_admin';
                  return true;
                })
                .map(wasteBank => (
                  <WasteBankCard
                    key={wasteBank.id}
                    wasteBank={wasteBank}
                    masterRequests={data.masterRequests}
                    onSelect={wasteBank.role === 'wastebank_master' ? 
                      setSelectedMasterBank : 
                      setSelectedWasteBank}
                  />
                ))}
            </div>
          </div>
        </div>
      </main>

      {selectedWasteBank && (
        <WasteBankDetailPanel
          wasteBank={selectedWasteBank}
          pickups={data.pickups}
          masterRequests={data.masterRequests}
          onClose={() => setSelectedWasteBank(null)}
        />
      )}

      {selectedMasterBank && (
        <MasterWasteBankDetailPanel
          masterBank={selectedMasterBank}
          requests={data.masterRequests}
          wasteBanks={data.wasteBanks}
          onClose={() => setSelectedMasterBank(null)}
        />
      )}
    </div>
  );
};

export default GovernmentMonitoring;