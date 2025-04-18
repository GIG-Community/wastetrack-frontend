import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Eye, X, Scale, Truck, User, Phone, MapPin, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [error, setError] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  });
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    // Always sort by createdAt for consistency with indexes
    setSortField('createdAt');
    fetchOrders();
    fetchOrderStats();
  }, [filter, sortDirection, currentPage]);

  const fetchOrderStats = async () => {
    try {
      const stats = {};
      const statuses = ['pending', 'processing', 'completed', 'cancelled'];

      // Get total orders
      const totalQuery = query(
        collection(db, 'orders'),
        where('sellerId', '==', currentUser.uid)
      );
      const totalSnapshot = await getCountFromServer(totalQuery);
      stats.total = totalSnapshot.data().count;

      // Get count for each status
      for (const status of statuses) {
        const statusQuery = query(
          collection(db, 'orders'),
          where('sellerId', '==', currentUser.uid),
          where('status', '==', status)
        );
        const statusSnapshot = await getCountFromServer(statusQuery);
        stats[status] = statusSnapshot.data().count;
      }

      setOrderStats(stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
      setError('Failed to fetch order statistics');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build the base query with fallback for missing indexes
      let orderQuery;
      
      try {
        if (filter !== 'all') {
          // Try composite index query first
          orderQuery = query(
            collection(db, 'orders'),
            where('sellerId', '==', currentUser.uid),
            where('status', '==', filter),
            orderBy('createdAt', sortDirection)
          );
        } else {
          // Try simple index query
          orderQuery = query(
            collection(db, 'orders'),
            where('sellerId', '==', currentUser.uid),
            orderBy('createdAt', sortDirection)
          );
        }

        // Add pagination
        orderQuery = query(orderQuery, limit(ITEMS_PER_PAGE));
        
        if (lastVisible && currentPage > 1) {
          orderQuery = query(orderQuery, startAfter(lastVisible));
        }

        const querySnapshot = await getDocs(orderQuery);
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);

        let ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Apply filters client-side if index is missing
        if (searchTerm) {
          ordersData = ordersData.filter(order =>
            order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setOrders(ordersData);
      } catch (indexError) {
        if (indexError.code === 'failed-precondition') {
          // Fallback to basic query if index is missing
          console.warn('Missing index, falling back to basic query');
          
          // Basic query without complex filtering
          const basicQuery = query(
            collection(db, 'orders'),
            where('sellerId', '==', currentUser.uid),
            limit(100) // Fetch more items for client-side filtering
          );

          const querySnapshot = await getDocs(basicQuery);
          let ordersData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Apply filters client-side
          if (filter !== 'all') {
            ordersData = ordersData.filter(order => order.status === filter);
          }

          // Sort client-side
          ordersData.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
          });

          if (searchTerm) {
            ordersData = ordersData.filter(order =>
              order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              order.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }

          // Apply pagination client-side
          const start = (currentPage - 1) * ITEMS_PER_PAGE;
          ordersData = ordersData.slice(start, start + ITEMS_PER_PAGE);

          setOrders(ordersData);

          // Show index creation instructions
          setError(
            'For better performance, please create the following indexes in your Firebase Console:\n\n' +
            '1. Collection: orders\n' +
            '   Fields to index:\n' +
            '   - sellerId Ascending\n' +
            '   - createdAt Descending\n\n' +
            '2. Collection: orders\n' +
            '   Fields to index:\n' +
            '   - sellerId Ascending\n' +
            '   - status Ascending\n' +
            '   - createdAt Descending\n\n' +
            'The app will continue to work with reduced performance until indexes are created.'
          );
        } else {
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });
      fetchOrders();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const OrderSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-8"></div>
      </td>
    </tr>
  );

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    preparing: 'bg-purple-100 text-purple-800 border-purple-200',
    ready: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shipping: 'bg-orange-100 text-orange-800 border-orange-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const orderStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'preparing', label: 'Material Preparation' },
    { value: 'ready', label: 'Ready for Pickup' },
    { value: 'shipping', label: 'In Transit' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
    setLastVisible(null);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} role="marketplace" />
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Order Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-gray-500 text-sm">Total Orders</h3>
              <p className="text-2xl font-bold">{orderStats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-yellow-500 text-sm">Pending</h3>
              <p className="text-2xl font-bold">{orderStats.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-blue-500 text-sm">Processing</h3>
              <p className="text-2xl font-bold">{orderStats.processing}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-green-500 text-sm">Completed</h3>
              <p className="text-2xl font-bold">{orderStats.completed}</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Recycling Orders</h1>
            <p className="text-gray-600">Manage your recycling material orders</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Orders</option>
                  {orderStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => fetchOrders()}
                className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Filter size={20} />
                <span>Refresh</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('id')}>Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('customerName')}>Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalWeight')}>Total Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total')}>Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    [...Array(5)].map((_, index) => <OrderSkeleton key={index} />)
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items?.length || 0} types
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.totalWeight?.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Rp {order.total?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.createdAt?.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="text-emerald-600 hover:text-emerald-800 transition-colors"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <Scale className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                        <p className="mt-1 text-sm text-gray-500">Orders will appear here when customers purchase recycling materials.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing page {currentPage} of orders
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={orders.length < ITEMS_PER_PAGE}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {isDetailModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Order Details</h2>
                  <p className="text-gray-600">Order #{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Customer Information</p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.customerName}</p>
                          <p className="text-sm text-gray-600">Customer ID: {selectedOrder.userId}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.customerPhone}</p>
                          <p className="text-sm text-gray-600">Contact Number</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.shippingAddress}</p>
                          <p className="text-sm text-gray-600">{selectedOrder.city} {selectedOrder.postalCode}</p>
                        </div>
                      </div>
                      {selectedOrder.notes && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Notes:</p>
                            <p className="text-sm">{selectedOrder.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Order Information</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedOrder.status]}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Order Date</span>
                        <span>{selectedOrder.createdAt?.toDate().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-medium text-emerald-600">
                          Rp {selectedOrder.total?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Order Items</p>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x Rp {item.price?.toLocaleString()}
                          </p>
                        </div>
                        <p className="font-medium">
                          Rp {(item.quantity * item.price)?.toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <div className="p-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Total Amount</p>
                          <p className="text-sm text-gray-600">{selectedOrder.items?.length} items</p>
                        </div>
                        <p className="text-lg font-semibold text-emerald-600">
                          Rp {selectedOrder.total?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <div className="border-t pt-6">
                    <p className="font-medium mb-4">Update Order Status</p>
                    <div className="flex flex-wrap gap-3">
                      {orderStatuses
                        .filter(s => s.value !== selectedOrder.status && s.value !== 'cancelled')
                        .map(status => (
                          <button
                            key={status.value}
                            onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                            className={`px-4 py-2 rounded-lg text-white transition-colors ${
                              status.value === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' :
                              'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {status.label}
                          </button>
                        ))}
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                  <Truck className="h-4 w-4 mr-2" />
                  <span>Orders are typically processed within 24 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;