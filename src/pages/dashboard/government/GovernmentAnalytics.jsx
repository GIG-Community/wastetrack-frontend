import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
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
  ComposedChart,
  Area,
  Line
} from 'recharts';
import {
  Building2,
  TrendingUp,
  Scale,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  FileBarChart,
  Filter,
  Download,
  Clock,
  Target,
  Users
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

const Analytics = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [analytics, setAnalytics] = useState({
    summary: {
      totalVolume: 0,
      totalTransactions: 0,
      avgProcessingTime: 0,
      networkEfficiency: 0,
      revenueGenerated: 0,
      wasteReductionRate: 0,
      participationRate: 0,
      environmentalImpact: 0
    },
    wasteBankStats: [],
    wasteTypeDistribution: [],
    regionPerformance: [],
    policyRecommendations: []
  });

  useEffect(() => {
    setLoading(true);
    
    // Create query references
    const wasteBanksQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['wastebank_admin', 'wastebank_master'])
    );
    const pickupsQuery = query(collection(db, 'pickups'));
    const masterRequestsQuery = query(collection(db, 'masterBankRequests'));

    // Data containers
    let wasteBanks = [];
    let pickups = [];
    let masterRequests = [];
    let dataLoaded = 0;
    const totalQueries = 3;

    // Process data and update state when all data is loaded
    const processData = () => {
      if (dataLoaded < totalQueries) return;
      
      try {
        // Filter completed transactions
        const completedPickups = pickups.filter(p => p.status === 'completed');
        const completedMasterRequests = masterRequests.filter(r => r.status === 'completed');

        // Calculate total waste volume and value
        let totalVolume = 0;
        let totalValue = 0;
        let wasteTypes = {};

        // Process pickups data
        completedPickups.forEach(pickup => {
          Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
            totalVolume += data.weight || 0;
            totalValue += data.value || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = {
                type,
                volume: 0,
                value: 0,
                count: 0
              };
            }
            wasteTypes[type].volume += data.weight || 0;
            wasteTypes[type].value += data.value || 0;
            wasteTypes[type].count++;
          });
        });

        // Process master requests data
        completedMasterRequests.forEach(request => {
          Object.entries(request.wastes || {}).forEach(([type, data]) => {
            totalVolume += data.weight || 0;
            totalValue += data.value || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = {
                type,
                volume: 0,
                value: 0,
                count: 0
              };
            }
            wasteTypes[type].volume += data.weight || 0;
            wasteTypes[type].value += data.value || 0;
            wasteTypes[type].count++;
          });
        });

        // Calculate network efficiency
        const activeWasteBanks = new Set(
          [...completedPickups, ...completedMasterRequests].map(t => t.wasteBankId)
        );
        const networkEfficiency = (activeWasteBanks.size / Math.max(1, wasteBanks.length)) * 100;

        // Calculate processing times
        const processingTimes = completedMasterRequests.map(request => {
          const createdTime = request.createdAt?.seconds || 0;
          const completedTime = request.completedAt?.seconds || 0;
          return (completedTime - createdTime) / 3600; // Convert to hours
        });

        const avgProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Regional performance calculation
        const regions = {};
        wasteBanks.forEach(bank => {
          const region = bank.profile?.location?.city || 'Unknown';
          if (!regions[region]) {
            regions[region] = {
              name: region,
              totalVolume: 0,
              totalValue: 0,
              wasteBankCount: 0,
              processingCapacity: 0
            };
          }
          regions[region].wasteBankCount++;
          
          // Calculate warehouse capacity
          if (bank.warehouseDimensions) {
            regions[region].processingCapacity += 
              (bank.warehouseDimensions.length || 0) * 
              (bank.warehouseDimensions.width || 0) * 
              (bank.warehouseDimensions.height || 0);
          }
        });

        // Update regional stats with actual transaction data
        [...completedPickups, ...completedMasterRequests].forEach(transaction => {
          const region = wasteBanks.find(b => b.id === transaction.wasteBankId)?.profile?.location?.city || 'Unknown';
          if (regions[region]) {
            Object.values(transaction.wastes || {}).forEach(waste => {
              regions[region].totalVolume += waste.weight || 0;
              regions[region].totalValue += waste.value || 0;
            });
          }
        });

        // Generate policy recommendations based on actual data
        const policyRecommendations = [
          {
            title: "Optimasi Jaringan",
            description: `Efisiensi jaringan saat ini adalah ${networkEfficiency.toFixed(1)}%. ${
              networkEfficiency < 70 
                ? "Pertimbangkan untuk menambah cakupan bank sampah di daerah yang belum terlayani."
                : "Fokus pada pengoptimalan operasi bank sampah yang ada."
            }`,
            priority: networkEfficiency < 70 ? "Tinggi" : "Sedang"
          },
          {
            title: "Efisiensi Pemrosesan",
            description: `Rata-rata waktu pemrosesan: ${avgProcessingTime.toFixed(1)} jam. ${
              avgProcessingTime > 24 
                ? "Lakukan langkah-langkah untuk mengurangi keterlambatan pemrosesan."
                : "Pertahankan standar pemrosesan yang efisien saat ini."
            }`,
            priority: avgProcessingTime > 24 ? "Tinggi" : "Rendah"
          },
          {
            title: "Pengelolaan Jenis Sampah",
            description: `Jenis sampah terbanyak: ${
              Object.entries(wasteTypes)
                .sort((a, b) => b[1].volume - a[1].volume)[0]?.[0] || 'Tidak ada data'
            }. Pertimbangkan untuk mengoptimalkan rute pengumpulan berdasarkan distribusi jenis sampah.`,
            priority: "Sedang"
          }
        ];

        // Update analytics state with actual data
        setAnalytics({
          summary: {
            totalVolume,
            totalTransactions: completedPickups.length + completedMasterRequests.length,
            avgProcessingTime,
            networkEfficiency,
            revenueGenerated: totalValue,
            wasteReductionRate: totalVolume / (timeRange === 'month' ? 30 : 365),
            participationRate: networkEfficiency,
            environmentalImpact: totalVolume * 2.5 // Approximate CO2 reduction factor
          },
          wasteBankStats: wasteBanks.map(bank => ({
            id: bank.id,
            name: bank.profile?.institutionName || 'Bank Tanpa Nama',
            balance: bank.balance || 0,
            volume: completedPickups
              .filter(p => p.wasteBankId === bank.id)
              .reduce((sum, p) => sum + Object.values(p.wastes || {})
                .reduce((s, w) => s + (w.weight || 0), 0), 0)
          })),
          wasteTypeDistribution: Object.values(wasteTypes),
          regionPerformance: Object.values(regions),
          policyRecommendations
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error processing analytics data:', error);
        setLoading(false);
      }
    };

    // Set up real-time listeners
    const unsubscribes = [];

    // Listen for waste banks data
    const wasteBanksUnsubscribe = onSnapshot(wasteBanksQuery, 
      (snapshot) => {
        wasteBanks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        dataLoaded++;
        processData();
      },
      (error) => {
        console.error('Error fetching waste banks:', error);
        setLoading(false);
      }
    );
    unsubscribes.push(wasteBanksUnsubscribe);

    // Listen for pickups data
    const pickupsUnsubscribe = onSnapshot(pickupsQuery, 
      (snapshot) => {
        pickups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        dataLoaded++;
        processData();
      },
      (error) => {
        console.error('Error fetching pickups:', error);
        setLoading(false);
      }
    );
    unsubscribes.push(pickupsUnsubscribe);

    // Listen for master requests data
    const masterRequestsUnsubscribe = onSnapshot(masterRequestsQuery, 
      (snapshot) => {
        masterRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        dataLoaded++;
        processData();
      },
      (error) => {
        console.error('Error fetching master requests:', error);
        setLoading(false);
      }
    );
    unsubscribes.push(masterRequestsUnsubscribe);

    // Cleanup function to unsubscribe from all listeners when component unmounts
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [timeRange]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="p-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Analisis Pengelolaan Sampah</h1>
            <p className="mt-2 text-gray-600">Wawasan lengkap dari {analytics.summary.totalTransactions} transaksi</p>
            
            <div className="flex items-center mt-6 space-x-4">
              <div className="p-4 text-blue-700 rounded-lg bg-blue-50">
                <p className="text-sm font-medium">Panduan Membaca:</p>
                <p className="text-sm">Halaman ini menampilkan rangkuman data pengelolaan sampah. Anda dapat memilih rentang waktu dan melihat detail dari setiap grafik.</p>
              </div>
            </div>
            
            <div className="flex items-center mt-4 space-x-4">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg ${
                  timeRange === 'month'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-4 py-2 rounded-lg ${
                  timeRange === 'year'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tahun Ini
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Scale}
              label="Total Volume Sampah"
              value={`${analytics.summary.totalVolume.toFixed(1)} kg`}
              subValue={`${analytics.summary.wasteReductionRate.toFixed(1)} kg/hari`}
              description="Jumlah total sampah yang dikumpulkan dalam kilogram"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Nilai Ekonomi"
              value={formatCurrency(analytics.summary.revenueGenerated)}
              subValue="Total nilai ekonomi"
              description="Nilai rupiah dari semua sampah yang dikumpulkan"
            />
            <SummaryCard
              icon={Users}
              label="Efisiensi Jaringan"
              value={`${analytics.summary.networkEfficiency.toFixed(1)}%`}
              subValue={`${analytics.wasteBankStats.length} bank sampah`}
              description="Persentase bank sampah yang aktif berkontribusi"
            />
            <SummaryCard
              icon={Target}
              label="Dampak Lingkungan"
              value={`${analytics.summary.environmentalImpact.toFixed(1)} kg CO₂`}
              subValue="Pengurangan emisi karbon"
              description="Perkiraan pengurangan emisi karbon dari sampah yang dikelola"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
            {/* Waste Type Distribution */}
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Distribusi Jenis Sampah</h3>
              <p className="mb-3 text-sm text-gray-600">Perincian sampah berdasarkan jenisnya (persentase dari total volume)</p>
              
              <div className="p-3 mb-4 text-sm border border-blue-100 rounded-lg bg-blue-50">
                <p className="font-medium text-blue-700">Cara Membaca Grafik Ini:</p>
                <ul className="pl-4 mt-1 text-blue-700 list-disc">
                  <li>Setiap bagian lingkaran mewakili satu jenis sampah</li>
                  <li>Semakin besar bagian, semakin banyak jumlah sampahnya</li>
                  <li>Persentase menunjukkan proporsi dari total sampah</li>
                  <li>Jenis sampah dengan jumlah kecil digabung sebagai "Lainnya"</li>
                </ul>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        // Process data to combine small waste types into "Others"
                        const threshold = analytics.summary.totalVolume * 0.05; // 5% threshold
                        const significantTypes = [];
                        let othersVolume = 0;
                        let othersValue = 0;
                        
                        // First pass: separate significant types and collect others
                        analytics.wasteTypeDistribution.forEach(item => {
                          if (item.volume >= threshold) {
                            significantTypes.push(item);
                          } else {
                            othersVolume += item.volume;
                            othersValue += item.value;
                          }
                        });
                        
                        // Add "Others" category if there are small waste types
                        if (othersVolume > 0) {
                          significantTypes.push({
                            type: "Lainnya",
                            volume: othersVolume,
                            value: othersValue
                          });
                        }
                        
                        return significantTypes;
                      })()}
                      dataKey="volume"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={30}
                      paddingAngle={2}
                      label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#999999', strokeWidth: 0.5, strokeDasharray: '2 2' }}
                    >
                      {analytics.wasteTypeDistribution.length > 0 && 
                        (() => {
                          // Process data for colors
                          const threshold = analytics.summary.totalVolume * 0.05;
                          const significantTypes = [];
                          let hasOthers = false;
                          
                          analytics.wasteTypeDistribution.forEach(item => {
                            if (item.volume >= threshold) {
                              significantTypes.push(item);
                            } else {
                              hasOthers = true;
                            }
                          });
                          
                          if (hasOthers) {
                            significantTypes.push({ type: "Lainnya" });
                          }
                          
                          return significantTypes.map((entry, index) => (
                            <Cell 
                              key={index} 
                              fill={entry.type === "Lainnya" ? "#9CA3AF" : COLORS[index % COLORS.length]} 
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                          ));
                        })()
                      }
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value.toFixed(1)} kg (${((value/analytics.summary.totalVolume)*100).toFixed(1)}%)`, 
                        `${props.payload.type}`
                      ]}
                      labelFormatter={() => 'Volume Sampah'}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {analytics.wasteTypeDistribution.length > 0 && (
                <div className="mt-2 text-xs text-center text-gray-500">
                  <span>Jenis sampah terbanyak: {analytics.wasteTypeDistribution.sort((a, b) => b.volume - a.volume)[0]?.type} 
                  ({((analytics.wasteTypeDistribution.sort((a, b) => b.volume - a.volume)[0]?.volume / 
                     analytics.summary.totalVolume) * 100).toFixed(0)}% dari total)</span>
                  <br />
                  <span className="text-xs">Catatan: Jenis sampah dengan volume kurang dari 5% digabung sebagai "Lainnya"</span>
                </div>
              )}
            </div>

            {/* Regional Performance */}
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Kinerja per Wilayah</h3>
              
              <div className="p-3 mb-4 text-sm border border-blue-100 rounded-lg bg-blue-50">
                <p className="font-medium text-blue-700">Cara Membaca Grafik Ini:</p>
                <ul className="pl-4 mt-1 text-blue-700 list-disc">
                  <li>Batang hijau menunjukkan volume sampah dalam kilogram (kg)</li>
                  <li>Batang ungu menunjukkan nilai ekonomi dalam Rupiah (Rp)</li>
                  <li>Setiap kelompok batang mewakili satu wilayah</li>
                  <li>Semakin tinggi batang, semakin tinggi nilai/volumenya</li>
                </ul>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.regionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#10B981" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6366F1" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalVolume" name="Volume (kg)" fill="#10B981" />
                    <Bar yAxisId="right" dataKey="totalValue" name="Nilai (Rp)" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Policy Recommendations */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Rekomendasi Kebijakan</h3>
            <div className="p-3 mb-4 text-sm border border-blue-100 rounded-lg bg-blue-50">
              <p className="font-medium text-blue-700">Tentang Rekomendasi:</p>
              <p className="mt-1 text-blue-700">
                Rekomendasi ini dibuat berdasarkan analisis data yang terkumpul. Prioritas 
                ditandai dengan warna yang berbeda - merah untuk prioritas tinggi, kuning untuk 
                sedang, dan hijau untuk rendah.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {analytics.policyRecommendations.map((policy, index) => (
                <div key={index} className="p-6 bg-white border-l-4 shadow-sm rounded-xl border-emerald-500">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-800">{policy.title}</h4>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      policy.priority === 'Tinggi' ? 'bg-red-100 text-red-800' :
                      policy.priority === 'Sedang' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {policy.priority}
                    </span>
                  </div>
                  <p className="text-gray-600">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Waste Bank Performance */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Kinerja Bank Sampah</h3>
            <div className="p-3 mb-4 text-sm border border-blue-100 rounded-lg bg-blue-50">
              <p className="font-medium text-blue-700">Cara Membaca Bagian Ini:</p>
              <ul className="pl-4 mt-1 text-blue-700 list-disc">
                <li>Setiap kartu menunjukkan kinerja satu bank sampah</li>
                <li>Batang hijau menunjukkan persentase kontribusi volume</li>
                <li>Semakin panjang batang, semakin besar kontribusi bank tersebut</li>
                <li>Saldo menunjukkan nilai ekonomi yang dimiliki bank tersebut saat ini</li>
              </ul>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analytics.wasteBankStats.map((bank, index) => (
                <div key={index} className="p-6 bg-white shadow-sm rounded-xl">
                  <h4 className="font-medium text-gray-800">{bank.name}</h4>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Volume Diproses</span>
                        <span className="font-medium">{bank.volume.toFixed(1)} kg</span>
                      </div>
                      <div className="h-2 mt-1 bg-gray-200 rounded-full">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min((bank.volume / analytics.summary.totalVolume) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Saldo Saat Ini</span>
                        <span className="font-medium">{formatCurrency(bank.balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, subValue, description }) => (
  <div className="p-6 bg-white shadow-sm rounded-xl">
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2 rounded-lg bg-emerald-50">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{subValue}</p>
        {description && (
          <p className="mt-2 text-xs text-blue-600">{description}</p>
        )}
      </div>
    </div>
  </div>
);

export default Analytics;