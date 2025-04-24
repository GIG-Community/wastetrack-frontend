import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
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
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  Building2,
  TrendingUp,
  Scale,
  Target,
  AlertTriangle,
  Activity,
  FileCheck,
  Users,
  Package,
  MapPin,
  Calendar,
  Download,
  ChevronRight,
  Warehouse,
  Recycle,
  Banknote,
  BarChart2,
  TrendingUp as TrendingUpIcon,
  ArrowUpDown,
  RotateCw,
  Network,
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Utility function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(1);
};

// Base Components
const StatCard = ({ icon: Icon, label, value, trend, subValue }) => (
  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-emerald-50">
          <Icon className="w-6 h-6 text-emerald-600" />
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

const ChartCard = ({ title, description, children }) => (
  <div className="p-6 bg-white border border-gray-200 rounded-xl">
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const AlertCard = ({ type, title, description, action }) => {
  const colors = {
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FileCheck },
    error: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
  };
  const style = colors[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${style.text}`} />
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${style.text}`}>{title}</h4>
          <p className={`text-sm mt-1 ${style.text} opacity-90`}>{description}</p>
        </div>
        {action && (
          <button className={`${style.text} hover:opacity-80`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const GovernmentDashboard = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    summary: {
      totalWasteBanks: 0,
      totalVolume: 0,
      complianceRate: 0,
      activeCollectors: 0,
    },
    alerts: [],
    trends: [],
    distribution: [],
    compliance: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data sources
        const [
          wasteBankSnapshot, 
          masterBankSnapshot, 
          pickupsSnapshot,
          masterRequestsSnapshot
        ] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'wastebank_admin'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'wastebank_master'))),
          getDocs(query(collection(db, 'pickups'))),
          getDocs(query(collection(db, 'masterBankRequests')))
        ]);

        // Process wastebank data (small waste banks)
        const wasteBankData = wasteBankSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'small' 
        }));

        // Process master waste banks
        const masterBankData = masterBankSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'master' 
        }));
        
        // All waste banks
        const allWasteBanks = [...wasteBankData, ...masterBankData];

        // Process pickup data (small waste bank collections)
        const pickupsData = pickupsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(pickup => pickup.status === 'completed');

        // Process master bank requests (transfers between small & master)
        const masterRequestsData = masterRequestsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(request => request.status === 'completed');

        // Calculate total waste volume handled
        let totalSmallBankVolume = 0;
        let totalMasterBankVolume = 0;

        pickupsData.forEach(pickup => {
          Object.values(pickup.wastes || {}).forEach(waste => {
            totalSmallBankVolume += waste.weight || 0;
          });
        });

        masterRequestsData.forEach(request => {
          Object.values(request.wastes || {}).forEach(waste => {
            totalMasterBankVolume += waste.weightToReduce || waste.weight || 0;
          });
        });

        // Calculate financial metrics
        const totalSmallBankBalance = wasteBankData.reduce((sum, bank) => sum + (bank.balance || 0), 0);
        const totalMasterBankBalance = masterBankData.reduce((sum, bank) => sum + (bank.balance || 0), 0);

        // Process monthly trends for both types of transactions
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // Initialize 6 months of data
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentYear, currentMonth - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyData[monthKey] = {
            month: date.toLocaleString('default', { month: 'short' }),
            smallBankVolume: 0,
            masterBankVolume: 0,
            pickupCount: 0,
            transferCount: 0,
          };
        }
        
        // Fill with pickup data
        pickupsData.forEach(pickup => {
          if (!pickup.completedAt) return;
          
          const date = new Date(pickup.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].pickupCount++;
            
            Object.values(pickup.wastes || {}).forEach(waste => {
              monthlyData[monthKey].smallBankVolume += waste.weight || 0;
            });
          }
        });
        
        // Fill with master bank request data
        masterRequestsData.forEach(request => {
          if (!request.completedAt) return;
          
          const date = new Date(request.completedAt.seconds * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].transferCount++;
            
            Object.values(request.wastes || {}).forEach(waste => {
              monthlyData[monthKey].masterBankVolume += waste.weightToReduce || waste.weight || 0;
            });
          }
        });

        // Calculate waste type distribution
        const wasteTypeDistribution = {};
        
        // Add from pickups
        pickupsData.forEach(pickup => {
          Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
            if (!wasteTypeDistribution[type]) {
              wasteTypeDistribution[type] = { 
                type, 
                smallBankVolume: 0,
                masterBankVolume: 0,
                totalVolume: 0
              };
            }
            wasteTypeDistribution[type].smallBankVolume += data.weight || 0;
            wasteTypeDistribution[type].totalVolume += data.weight || 0;
          });
        });
        
        // Add from master requests
        masterRequestsData.forEach(request => {
          Object.entries(request.wastes || {}).forEach(([type, data]) => {
            if (!wasteTypeDistribution[type]) {
              wasteTypeDistribution[type] = { 
                type, 
                smallBankVolume: 0,
                masterBankVolume: 0,
                totalVolume: 0
              };
            }
            wasteTypeDistribution[type].masterBankVolume += data.weightToReduce || data.weight || 0;
            wasteTypeDistribution[type].totalVolume += data.weightToReduce || data.weight || 0;
          });
        });

        // Generate flow data showing waste bank to master bank transfers
        const wasteBankToMasterFlows = [];
        const wasteBankFlowMap = {};
        
        masterRequestsData.forEach(request => {
          const smallBankId = request.wasteBankId;
          const masterBankId = request.masterBankId;
          const smallBank = wasteBankData.find(b => b.id === smallBankId);
          const masterBank = masterBankData.find(b => b.id === masterBankId);
          
          if (!smallBank || !masterBank) return;
          
          const key = `${smallBankId}-${masterBankId}`;
          if (!wasteBankFlowMap[key]) {
            wasteBankFlowMap[key] = {
              source: smallBank.profile?.institutionName || 'Unknown Small Bank',
              target: masterBank.profile?.institutionName || 'Unknown Master Bank',
              volume: 0,
              count: 0,
              value: 0
            };
          }
          
          let requestVolume = 0;
          let requestValue = 0;
          
          Object.values(request.wastes || {}).forEach(waste => {
            requestVolume += waste.weightToReduce || waste.weight || 0;
            requestValue += waste.value || 0;
          });
          
          wasteBankFlowMap[key].volume += requestVolume;
          wasteBankFlowMap[key].count += 1;
          wasteBankFlowMap[key].value += requestValue || request.totalValue || 0;
        });
        
        Object.values(wasteBankFlowMap).forEach(flow => {
          wasteBankToMasterFlows.push(flow);
        });

        // Generate warehouse capacity data
        const warehouseData = allWasteBanks
          .filter(bank => bank.warehouseDimensions)
          .map(bank => {
            const dimensions = bank.warehouseDimensions || {};
            const capacity = (dimensions.length || 0) * 
                            (dimensions.width || 0) * 
                            (dimensions.height || 0);
            
            // Calculate estimated usage based on recent transactions
            let estimatedUsage = 0;
            if (bank.type === 'small') {
              // For small banks, look at pickups that haven't been transferred
              const relevantPickups = pickupsData.filter(p => 
                p.wasteBankId === bank.id && 
                !masterRequestsData.some(mr => 
                  mr.wasteBankId === bank.id && 
                  mr.collectionIds?.some(c => c.id === p.id)
                )
              );
              
              relevantPickups.forEach(pickup => {
                Object.values(pickup.wastes || {}).forEach(waste => {
                  estimatedUsage += waste.weight || 0;
                });
              });
            } else {
              // For master banks, look at transfers received
              const relevantTransfers = masterRequestsData.filter(mr => 
                mr.masterBankId === bank.id
              );
              
              relevantTransfers.forEach(transfer => {
                Object.values(transfer.wastes || {}).forEach(waste => {
                  estimatedUsage += waste.weightToReduce || waste.weight || 0;
                });
              });
            }
            
            // Assume 1 kg = 0.01 cubic meter for visualization purposes
            const usagePercent = capacity > 0 ? Math.min(100, (estimatedUsage * 0.01 / capacity) * 100) : 0;
            
            return {
              id: bank.id,
              name: bank.profile?.institutionName || bank.profile?.institution || 'Unnamed Facility',
              type: bank.type,
              capacity,
              usedCapacity: estimatedUsage * 0.01,
              usagePercent,
              location: bank.location?.city || 'Unknown',
              dimensions
            };
          });

        // Calculate the number of active collectors in the system
        const activeCollectors = new Set([
          ...pickupsData.map(p => p.collectorId),
          ...masterRequestsData.map(r => r.collectorId)
        ]).size;

        // Check compliance and generate alerts
        const alerts = [];
        const now = new Date();
        
        // Check for inactive waste banks
        wasteBankData.forEach(bank => {
          const bankPickups = pickupsData.filter(p => p.wasteBankId === bank.id);
          const lastPickup = bankPickups[bankPickups.length - 1];
          
          if (lastPickup && lastPickup.completedAt) {
            const lastPickupDate = new Date(lastPickup.completedAt.seconds * 1000);
            const daysSinceLastPickup = Math.floor((now - lastPickupDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastPickup > 7) {
              alerts.push({
                type: 'warning',
                title: 'Inactive Waste Bank',
                description: `${bank.profile?.institutionName || 'A waste bank'} hasn't processed waste in ${daysSinceLastPickup} days`,
                wasteBankId: bank.id,
              });
            }
          }
        });
        
        // Check for warehouse capacity issues
        warehouseData.forEach(warehouse => {
          if (warehouse.usagePercent > 80) {
            alerts.push({
              type: 'warning',
              title: 'Warehouse Capacity Warning',
              description: `${warehouse.name} is at ${Math.round(warehouse.usagePercent)}% capacity`,
              wasteBankId: warehouse.id,
            });
          }
        });

        // Calculate compliance rate
        const activeWasteBanks = new Set(pickupsData.map(p => p.wasteBankId)).size;
        const complianceRate = wasteBankData.length > 0 ? 
          (activeWasteBanks / wasteBankData.length) * 100 : 0;

        // Update state with all processed data
        setData({
          summary: {
            totalWasteBanks: wasteBankData.length,
            totalMasterBanks: masterBankData.length,
            totalVolume: totalSmallBankVolume + totalMasterBankVolume,
            smallBankVolume: totalSmallBankVolume,
            masterBankVolume: totalMasterBankVolume,
            totalBalance: totalSmallBankBalance + totalMasterBankBalance,
            complianceRate,
            activeCollectors,
          },
          wasteBanks: wasteBankData,
          masterBanks: masterBankData,
          allBanks: allWasteBanks,
          pickups: pickupsData,
          masterRequests: masterRequestsData,
          alerts,
          monthlyTrends: Object.values(monthlyData),
          wasteTypeDistribution: Object.values(wasteTypeDistribution),
          wasteBankFlows: wasteBankToMasterFlows,
          warehouseData,
        });

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
                <Building2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Government Dashboard</h1>
                <p className="text-sm text-gray-500">Waste Management System Overview</p>
              </div>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600">
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Total Waste Banks"
              value={data.summary.totalWasteBanks + data.summary.totalMasterBanks}
              subValue={`${data.summary.totalWasteBanks} Small, ${data.summary.totalMasterBanks} Master`}
            />
            <StatCard
              icon={Scale}
              label="Total Volume"
              value={`${formatNumber(data.summary.totalVolume)} kg`}
              trend={(data.summary.totalVolume > 0 && data.monthlyTrends && data.monthlyTrends.length >= 2) ? 
                Math.round((data.monthlyTrends[data.monthlyTrends.length-1].smallBankVolume + data.monthlyTrends[data.monthlyTrends.length-1].masterBankVolume) / 
                (data.monthlyTrends[data.monthlyTrends.length-2].smallBankVolume + data.monthlyTrends[data.monthlyTrends.length-2].masterBankVolume + 0.001) * 100 - 100) : 0}
            />
            <StatCard
              icon={Banknote}
              label="Total Balance"
              value={`Rp ${formatNumber(data.summary.totalBalance)}`}
              subValue="Across all waste banks"
            />
            <StatCard
              icon={Users}
              label="Active Collectors"
              value={data.summary.activeCollectors}
              subValue="Last 30 days"
            />
          </div>

          {/* Alerts Section */}
          {data.alerts?.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Alerts & Notifications</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.alerts.map((alert, index) => (
                  <AlertCard
                    key={index}
                    type={alert.type}
                    title={alert.title}
                    description={alert.description}
                    action={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Waste Bank Hierarchy */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Waste Bank Structure</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Master Bank Card */}
              {data.masterBanks?.length > 0 && data.masterBanks.map((masterBank, idx) => (
                <div key={masterBank.id} className="p-6 overflow-hidden bg-white border border-indigo-200 shadow-sm rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50">
                        <Warehouse className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{masterBank.profile?.institutionName || 'Master Waste Bank'}</h3>
                        <p className="text-sm text-gray-500">{masterBank.location?.city || 'Unknown Location'}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 text-xs font-medium text-indigo-700 rounded-full bg-indigo-50">
                      Master Bank
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="text-lg font-medium text-gray-900">Rp {formatNumber(masterBank.balance || 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">Warehouse</p>
                      <p className="text-lg font-medium text-gray-900">
                        {masterBank.warehouseDimensions ? 
                          `${masterBank.warehouseDimensions.length}x${masterBank.warehouseDimensions.width}x${masterBank.warehouseDimensions.height}m` : 
                          'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Connected Waste Banks</h4>
                    <div className="pr-2 space-y-2 overflow-y-auto max-h-32">
                      {data.wasteBankFlows
                        .filter(flow => flow.target === masterBank.profile?.institutionName)
                        .map((flow, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-md bg-emerald-50">
                                <Building2 className="w-3 h-3 text-emerald-600" />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{flow.source}</span>
                            </div>
                            <div className="text-xs text-gray-500">{formatNumber(flow.volume)} kg</div>
                          </div>
                        ))}
                      {data.wasteBankFlows.filter(flow => flow.target === masterBank.profile?.institutionName).length === 0 && (
                        <p className="text-sm italic text-gray-500">No connected waste banks</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {data.wasteBanks?.length > 0 && data.wasteBanks.slice(0, 2).map((bank, idx) => (
                <div key={bank.id} className="p-6 bg-white border shadow-sm rounded-xl border-emerald-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{bank.profile?.institutionName || bank.profile?.institution || 'Small Waste Bank'}</h3>
                        <p className="text-sm text-gray-500">{bank.location?.city || 'Unknown Location'}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                      Local Bank
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="text-lg font-medium text-gray-900">Rp {formatNumber(bank.balance || 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-500">Warehouse</p>
                      <p className="text-lg font-medium text-gray-900">
                        {bank.warehouseDimensions ? 
                          `${bank.warehouseDimensions.length}x${bank.warehouseDimensions.width}x${bank.warehouseDimensions.height}m` : 
                          'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Transfer Activity</h4>
                    {data.wasteBankFlows
                      .filter(flow => flow.source === bank.profile?.institutionName)
                      .map((flow, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">{flow.target}</span>
                          </div>
                          <div className="text-sm text-gray-600">{formatNumber(flow.volume)} kg</div>
                        </div>
                      ))}
                    {data.wasteBankFlows.filter(flow => flow.source === bank.profile?.institutionName).length === 0 && (
                      <p className="text-sm italic text-gray-500">No transfer activity</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Monthly Collection Trends */}
            <ChartCard
              title="Collection Trends"
              description="Monthly waste volume by bank type"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${formatNumber(value)} kg`}
                    />
                    <Tooltip formatter={(value) => `${formatNumber(value)} kg`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="smallBankVolume"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                      name="Small Waste Banks"
                      stackId="1"
                    />
                    <Area
                      type="monotone"
                      dataKey="masterBankVolume"
                      stroke="#6366F1"
                      fill="#6366F1"
                      fillOpacity={0.2}
                      name="Master Waste Banks"
                      stackId="1"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution */}
            <ChartCard
              title="Waste Type Distribution"
              description="Volume by waste category and bank type"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.wasteTypeDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis tickFormatter={(value) => `${formatNumber(value)} kg`} />
                    <Tooltip formatter={(value) => `${formatNumber(value)} kg`} />
                    <Legend />
                    <Bar dataKey="smallBankVolume" stackId="a" name="Small Banks" fill="#10B981" />
                    <Bar dataKey="masterBankVolume" stackId="a" name="Master Banks" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Transaction Flow & Warehouse Capacity */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Transaction Activity */}
            <ChartCard
              title="Transaction Activity"
              description="Monthly transaction count by type"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="pickupCount"
                      name="Customer Collections"
                      fill="#10B981"
                      barSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="transferCount"
                      name="Master Transfers"
                      fill="#6366F1"
                      barSize={20}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pickupCount"
                      stroke="#10B981"
                      dot={false}
                      activeDot={false}
                      style={{ opacity: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Warehouse Capacity */}
            <ChartCard
              title="Warehouse Utilization"
              description="Current capacity utilization by facility"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.warehouseData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => `${Math.round(value)}%`} />
                    <Legend />
                    <Bar 
                      dataKey="usagePercent" 
                      name="Used Capacity"
                      fill={(entry) => entry.type === 'master' ? '#6366F1' : '#10B981'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Facilities Table */}
          <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Facilities Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Facility</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Type</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Location</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Balance</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Warehouse Size</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allBanks?.slice(0, 5).map((bank) => (
                    <tr key={bank.id} className="border-b border-gray-200">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${bank.type === 'master' ? 'bg-indigo-50' : 'bg-emerald-50'} rounded-lg`}>
                            {bank.type === 'master' ? 
                              <Warehouse className={`h-4 w-4 ${bank.type === 'master' ? 'text-indigo-600' : 'text-emerald-600'}`} /> :
                              <Building2 className={`h-4 w-4 ${bank.type === 'master' ? 'text-indigo-600' : 'text-emerald-600'}`} />
                            }
                          </div>
                          <span className="font-medium text-gray-900">
                            {bank.profile?.institutionName || bank.profile?.institution || 'Unnamed Facility'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                          ${bank.type === 'master' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {bank.type === 'master' ? 'Master Bank' : 'Local Bank'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {bank.location?.city || 'Unknown Location'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        Rp {formatNumber(bank.balance || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {bank.warehouseDimensions ? 
                          `${bank.warehouseDimensions.length}x${bank.warehouseDimensions.width}x${bank.warehouseDimensions.height}m` : 
                          'Not set'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${bank.status === 'active' ? 
                          'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {bank.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GovernmentDashboard;