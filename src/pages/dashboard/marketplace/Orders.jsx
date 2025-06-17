import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Eye, X, Scale, Truck, User, Phone, MapPin, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, GeoPoint } from 'firebase/firestore';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [error, setError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  });
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (currentUser?.uid) {
      fetchOrders();
      fetchOrderStats();
    }
  }, [filter, currentPage, currentUser]);

  useEffect(() => {
    if (searchTerm) {
      // Debounce search to prevent too many re-renders
      const delaySearch = setTimeout(() => {
        fetchOrders();
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm]);

  const fetchOrderStats = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const stats = {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0
      };
      const statuses = ['pending', 'processing', 'completed', 'cancelled'];

      // Get total orders
      const totalQuery = query(
        collection(db, 'orders'),
        where('marketplaceId', '==', currentUser.uid)
      );
      const totalSnapshot = await getDocs(totalQuery);
      stats.total = totalSnapshot.docs.length;

      // Get count for each status
      for (const status of statuses) {
        const statusQuery = query(
          collection(db, 'orders'),
          where('marketplaceId', '==', currentUser.uid),
          where('status', '==', status)
        );
        const statusSnapshot = await getDocs(statusQuery);
        stats[status] = statusSnapshot.docs.length;
      }

      setOrderStats(stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
      setError('Failed to fetch order statistics');
    }
  };

  const fetchOrders = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Basic query for marketplace role
      const baseQuery = query(
        collection(db, 'orders'),
        where('marketplaceId', '==', currentUser.uid)
      );

      // If no orders found with marketplaceId, try querying without constraints
      const querySnapshot = await getDocs(baseQuery);
      
      let ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If no orders found with marketplaceId filter, try getting all orders (for testing)
      if (ordersData.length === 0) {
        console.log("No orders found with marketplaceId filter, fetching all orders");
        const allOrdersQuery = query(collection(db, 'orders'));
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        
        ordersData = allOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Sort by creation date (newest first)
      ordersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });

      // Apply filters
      if (filter !== 'all') {
        ordersData = ordersData.filter(order => order.status === filter);
      }

      if (searchTerm) {
        ordersData = ordersData.filter(order =>
          order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply pagination
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedOrders = ordersData.slice(start, start + ITEMS_PER_PAGE);
      
      setOrders(paginatedOrders);
      setTotalOrders(ordersData.length);

    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to access these orders.');
      } else if (error.code === 'failed-precondition') {
        setError('Please ensure you have proper database indexes set up.');
      } else {
        setError('Failed to fetch orders. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdateLoading(true);
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update the selected order locally first for better UX
      if (selectedOrder) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus,
          updatedAt: new Date()
        });
      }
      
      // Refresh the orders list and stats
      await Promise.all([fetchOrders(), fetchOrderStats()]);
      
      // Close the modal if operation was successful
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      setError(`Failed to update order status: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const OrderSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-20 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-16 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-20 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-8 h-4 bg-gray-200 rounded"></div>
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalOrders / ITEMS_PER_PAGE)) {
      setCurrentPage(newPage);
    }
  };

  // Format date safely
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return 'N/A';
    }
    
    try {
      return timestamp.toDate().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format datetime safely
  const formatDateTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return 'N/A';
    }
    
    try {
      return timestamp.toDate().toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Calculate total weight from order items
  const calculateTotalWeight = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + (item.weight * item.quantity || 0), 0);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} role="marketplace" />
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="mx-auto max-w-7xl">
          {/* Order Statistics */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-gray-500">Total Orders</h3>
              <p className="text-2xl font-bold">{orderStats.total}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-yellow-500">Pending</h3>
              <p className="text-2xl font-bold">{orderStats.pending}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-blue-500">Processing</h3>
              <p className="text-2xl font-bold">{orderStats.processing}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-green-500">Completed</h3>
              <p className="text-2xl font-bold">{orderStats.completed}</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Recycling Orders</h1>
            <p className="text-gray-600">Manage your recycling material orders</p>
          </div>

          <div className="p-4 bg-white shadow-sm rounded-xl md:p-6">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
              <div className="flex flex-col items-stretch flex-1 w-full gap-4 md:w-auto md:flex-row md:items-center">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    className="w-full py-2 pl-10 pr-4 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="px-3 py-2 text-gray-700 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                onClick={() => {
                  setCurrentPage(1); // Reset to page 1 when refreshing
                  fetchOrders();
                }}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-white transition-colors rounded-lg md:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                <Filter size={20} />
                <span>Refresh</span>
              </button>
            </div>

            {error && (
              <div className="p-4 mb-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
                {error}
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Materials</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Total Weight</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Total Amount</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    [...Array(5)].map((_, index) => <OrderSkeleton key={index} />)
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {order.customerName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {order.items?.length || 0} types
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {calculateTotalWeight(order.items).toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          Rp {(order.total || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {order.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="transition-colors text-emerald-600 hover:text-emerald-800"
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
                        <Scale className="w-12 h-12 mx-auto text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                        <p className="mt-1 text-sm text-gray-500">Orders will appear here when customers purchase recycling materials.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-700">
                  Showing page {currentPage} of {Math.max(1, Math.ceil(totalOrders / ITEMS_PER_PAGE))}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalOrders / ITEMS_PER_PAGE) || orders.length < ITEMS_PER_PAGE}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Detail Modal */}
        {isDetailModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Order Details</h2>
                  <p className="text-gray-600">Order #{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 text-gray-500 transition-colors rounded-lg hover:text-gray-700 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Customer Information</p>
                    <div className="p-4 space-y-2 rounded-lg bg-gray-50">
                      <div className="flex items-start gap-2">
                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.customerName || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Customer ID: {selectedOrder.userId || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.customerPhone || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Contact Number</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedOrder.shippingAddress || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{selectedOrder.city || 'N/A'} {selectedOrder.postalCode || ''}</p>
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
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {selectedOrder.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Order Date</span>
                        <span>{formatDateTime(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-medium text-emerald-600">
                          Rp {(selectedOrder.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Order Items</p>
                  <div className="border divide-y rounded-lg">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-medium">{item.name || 'Unnamed Item'}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity || 0} x Rp {(item.price || 0).toLocaleString()}
                            </p>
                          </div>
                          <p className="font-medium">
                            Rp {((item.quantity || 0) * (item.price || 0)).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No items found for this order
                      </div>
                    )}
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Total Amount</p>
                          <p className="text-sm text-gray-600">{selectedOrder.items?.length || 0} items</p>
                        </div>
                        <p className="text-lg font-semibold text-emerald-600">
                          Rp {(selectedOrder.total || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <div className="pt-6 border-t">
                    <p className="mb-4 font-medium">Update Order Status</p>
                    {updateLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="w-6 h-6 border-2 border-t-2 border-gray-200 rounded-full border-t-emerald-600 animate-spin"></div>
                        <span className="ml-2">Updating status...</span>
                      </div>
                    ) : (
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
                          className="px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                  <Truck className="w-4 h-4 mr-2" />
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