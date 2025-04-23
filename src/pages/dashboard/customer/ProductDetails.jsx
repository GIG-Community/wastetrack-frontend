import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Package, Tag, Truck, Star } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Swal from 'sweetalert2';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Product not found',
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
        navigate('/dashboard/customer/marketplace');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load product details',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (value) => {
    const newQuantity = Math.max(1, Math.min(value, product?.stock || 1));
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      imageUrl: product.imageUrl,
      stock: product.stock
    };
    
    navigate('/dashboard/customer/marketplace/checkout', { 
      state: { items: [cartItem] }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

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
          <h1 className="ml-4 text-lg font-semibold text-gray-900">Detail Produk</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-16 pb-20">
        <div className="bg-white">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-72 object-cover"
          />
          
          <div className="p-4">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Tag className="h-4 w-4" />
                <span>{product.category}</span>
                <span>•</span>
                <Package className="h-4 w-4" />
                <span>{product.condition}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600">
                  Rp {product.price.toLocaleString()}
                </span>
                {product.stock > 0 ? (
                  <span className="text-sm text-gray-500">
                    (Stok: {product.stock})
                  </span>
                ) : (
                  <span className="text-sm text-red-500">Stok Habis</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Deskripsi</h2>
              <p className="text-gray-600">{product.description}</p>
            </div>

            {product.features && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Fitur</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Truck className="h-4 w-4" />
              <span>Pengiriman tersedia untuk area tertentu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="flex items-center gap-4 mb-4">
          <label className="font-medium">Jumlah:</label>
          <div className="flex items-center">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              className="px-3 py-1 border rounded-l hover:bg-gray-50"
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
              className="w-16 px-3 py-1 border-t border-b text-center"
            />
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              className="px-3 py-1 border rounded-r hover:bg-gray-50"
              disabled={quantity >= product.stock}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          Lanjut ke Pembayaran
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;