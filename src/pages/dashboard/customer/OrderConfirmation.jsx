import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowLeft, Truck, Calendar } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Order not found</h2>
          <p className="mt-2 text-gray-600">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => {
              navigate('/dashboard/customer/marketplace');
              // Set active tab to marketplace when returning
              const event = new CustomEvent('setActiveTab', { detail: 'marketplace' });
              window.dispatchEvent(event);
            }}
            className="mt-4 inline-flex items-center text-emerald-600 hover:text-emerald-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50">
        <div className="flex items-center h-full px-4">
          <button
            onClick={() => {
              navigate('/dashboard/customer/marketplace');
              // Set active tab to marketplace when returning
              const event = new CustomEvent('setActiveTab', { detail: 'marketplace' });
              window.dispatchEvent(event);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-gray-900">Order Confirmation</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-16 px-4 pb-20">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
          <p className="mt-2 text-gray-600">
            Thank you for your order. We'll notify you when your items are on their way.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Order Details</h3>
              <span className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date</span>
                <span className="font-medium">
                  {order.createdAt?.toDate().toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium text-emerald-600">
                  Rp {order.total?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">Cash on Delivery</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b">
            <h3 className="font-semibold mb-4">Shipping Information</h3>
            <div className="space-y-3">
              <div className="flex">
                <span className="w-20 text-gray-600">Name:</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex">
                <span className="w-20 text-gray-600">Phone:</span>
                <span className="font-medium">{order.customerPhone}</span>
              </div>
              <div className="flex">
                <span className="w-20 text-gray-600">Address:</span>
                <span className="font-medium">
                  {order.shippingAddress}, {order.city} {order.postalCode}
                </span>
              </div>
              {order.notes && (
                <div className="flex">
                  <span className="w-20 text-gray-600">Notes:</span>
                  <span className="text-gray-600">{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} x Rp {item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">
                    Rp {(item.quantity * item.price).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Truck className="h-5 w-5 text-emerald-500" />
            <span>Your items will be processed and shipped within 1-2 business days</span>
          </div>
          <button
            onClick={() => {
              navigate('/dashboard/customer/marketplace');
              // Set active tab to marketplace when returning
              const event = new CustomEvent('setActiveTab', { detail: 'marketplace' });
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Return to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;