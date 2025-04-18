import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, Scale } from 'lucide-react';
import { collection, getDocs, query, limit, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const MarketplaceDashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [marketplaceStats, setMarketplaceStats] = useState({
    totalMaterialTypes: 0,
    activeOrders: 0,
    totalWeightRecycled: 0,
    growthRates: {
      materials: 0,
      orders: 0,
      recycledWeight: 0
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topMaterials, setTopMaterials] = useState([]);
  const [recyclingData, setRecyclingData] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        // Fetch products count and calculate growth
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsCount = productsSnapshot.size;
        
        // Get last month's products for growth rate
        const lastMonth = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const lastMonthProducts = await getDocs(
          query(collection(db, 'products'), 
          where('createdAt', '>', lastMonth))
        );
        const materialGrowth = ((lastMonthProducts.size / productsCount) * 100).toFixed(1);

        // Fetch orders with status tracking
        const ordersSnapshot = await getDocs(
          query(collection(db, 'orders'), 
          orderBy('createdAt', 'desc'))
        );
        
        const orders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const activeOrders = orders.filter(order => 
          ['pending', 'processing', 'preparing', 'ready', 'shipping'].includes(order.status)
        );
        const completedOrders = orders.filter(order => order.status === 'completed');
        
        // Calculate total recycled weight
        const totalWeight = completedOrders.reduce((sum, order) => 
          sum + (order.totalWeight || 0), 0
        );
        
        // Calculate order growth rate
        const lastMonthOrders = orders.filter(order => 
          order.createdAt?.toDate() > lastMonth.toDate()
        );
        const orderGrowth = ((lastMonthOrders.length / orders.length) * 100).toFixed(1);

        // Calculate recycling weight growth
        const lastMonthWeight = lastMonthOrders.reduce((sum, order) => 
          sum + (order.totalWeight || 0), 0
        );
        const weightGrowth = ((lastMonthWeight / totalWeight) * 100).toFixed(1);

        // Prepare recycling data for chart
        const last7Days = [...Array(7)].map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        }).reverse();

        const recyclingByDay = last7Days.map((day, index) => {
          const dayOrders = completedOrders.filter(order => 
            order.createdAt?.toDate().toLocaleDateString('en-US', { weekday: 'short' }) === day
          );
          return {
            name: day,
            weight: dayOrders.reduce((sum, order) => sum + (order.totalWeight || 0), 0),
            value: dayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
          };
        });

        // Prepare category distribution data
        const categories = {};
        productsSnapshot.docs.forEach(doc => {
          const category = doc.data().category;
          categories[category] = (categories[category] || 0) + 1;
        });

        const categoryChartData = Object.entries(categories)
          .map(([name, value]) => ({
            name,
            value,
            weight: completedOrders.reduce((sum, order) => {
              const categoryItems = order.items?.filter(item => item.category === name) || [];
              return sum + categoryItems.reduce((itemSum, item) => itemSum + (item.weight || 0), 0);
            }, 0)
          }))
          .sort((a, b) => b.weight - a.weight);

        // Update all states
        setRecyclingData(recyclingByDay);
        setCategoryDistribution(categoryChartData);

        setMarketplaceStats({
          totalMaterialTypes: productsCount,
          activeOrders: activeOrders.length,
          totalWeightRecycled: totalWeight,
          growthRates: {
            materials: materialGrowth,
            orders: orderGrowth,
            recycledWeight: weightGrowth
          }
        });

        setRecentOrders(orders.slice(0, 5));
        
        // Set top materials by recycled weight
        const materialsSnapshot = await getDocs(
          query(collection(db, 'products'), 
          orderBy('soldCount', 'desc'),
          limit(5))
        );
        setTopMaterials(materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

      } catch (error) {
        console.error('Error fetching marketplace data:', error);
      }
    };

    fetchMarketplaceData();
  }, []);

  // Simplified stats array
  const stats = [
    {
      title: 'Material Types',
      value: marketplaceStats.totalMaterialTypes.toString(),
      icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />,
      change: `${marketplaceStats.growthRates.materials}%`,
    },
    {
      title: 'Active Orders',
      value: marketplaceStats.activeOrders.toString(),
      icon: <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />,
      change: `${marketplaceStats.growthRates.orders}%`,
    },
    {
      title: 'Total Recycled',
      value: `${marketplaceStats.totalWeightRecycled.toLocaleString()} kg`,
      icon: <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />,
      change: `${marketplaceStats.growthRates.recycledWeight}%`,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} role="marketplace" />
      <main className={`flex-1 p-4 sm:p-6 md:p-8 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Recycling Marketplace</h1>
          <p className="text-sm md:text-base text-gray-600">Monitor your recycling materials marketplace</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                  {stat.icon}
                </div>
                <span className={`text-xs md:text-sm font-medium ${
                  parseFloat(stat.change) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1 md:mb-2">{stat.title}</h3>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Recycling Activity</h2>
            <div className="w-full h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recyclingData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#10B981"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#3B82F6"
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="weight" 
                    name="Weight (kg)"
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="value" 
                    name="Value (Rp)"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Recent Orders</h2>
            {recentOrders.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm md:text-base text-gray-800">
                        {order.items?.[0]?.name} 
                        {order.items?.length > 1 ? ` +${order.items.length - 1} more` : ''}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">Order #{order.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm md:text-base text-emerald-600">
                        {order.totalWeight?.toLocaleString()} kg
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm md:text-base">No recent orders</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Top Materials</h2>
            {topMaterials.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {topMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm md:text-base text-gray-800">{material.name}</p>
                      <p className="text-xs md:text-sm text-gray-600">{material.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm md:text-base text-emerald-600">
                        Rp {material.price?.toLocaleString()}/kg
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {material.soldCount || 0} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm md:text-base">No materials available</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketplaceDashboard;