import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Phone, User, CreditCard, Calendar } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Swal from 'sweetalert2';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [items] = useState(location.state?.items || []);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  });

  useEffect(() => {
    if (!location.state?.items) {
      navigate('/dashboard/customer/marketplace');
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        userId: currentUser.uid,
        customerName: formData.fullName,
        customerPhone: formData.phone,
        shippingAddress: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        notes: formData.notes,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: calculateTotal(),
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      Swal.fire({
        title: 'Success!',
        text: 'Your order has been placed successfully',
        icon: 'success',
        confirmButtonColor: '#10B981'
      }).then(() => {
        navigate('/dashboard/customer/marketplace/order-confirmation/' + docRef.id);
      });
    } catch (error) {
      console.error('Error placing order:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to place order. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50">
        <div className="flex items-center h-full px-4">
          <button
            onClick={() => {
              navigate(-1);
              // Set active tab to marketplace when returning
              const event = new CustomEvent('setActiveTab', { detail: 'marketplace' });
              window.dispatchEvent(event);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-gray-900">Checkout</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-16 pb-20 px-4">
        {/* Order Items */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-600">
                  {item.quantity} x Rp {item.price.toLocaleString()}
                </p>
                <p className="text-emerald-600 font-medium">
                  Rp {(item.quantity * item.price).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                Rp {calculateTotal().toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-emerald-600">
                Rp {calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Form */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Shipping Details</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="pl-10 w-full rounded-lg border border-gray-300 p-2.5"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="pl-10 w-full rounded-lg border border-gray-300 p-2.5"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="pl-10 w-full rounded-lg border border-gray-300 p-2.5"
                  placeholder="Enter your complete address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5"
                  placeholder="Enter postal code"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="2"
                className="w-full rounded-lg border border-gray-300 p-2.5"
                placeholder="Any special instructions for delivery"
              />
            </div>
          </form>
        </div>

        {/* Fixed Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Place Order (Rp {calculateTotal().toLocaleString()})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;