import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  Search,
  ShoppingCart,
  Filter,
  Package,
  Tag,
  ChevronDown
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import DevelopmentModal from '../../../components/DevelopmentModal';

const CustomerMarketplace = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData, currentUser } = useAuth();
  const { language, translations } = useLanguage();
  const t = translations[language].products;
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isDevelopmentModalOpen, setIsDevelopmentModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua Produk' },
    { id: 'recycledPaper', label: 'Kertas Daur Ulang' },
    { id: 'recycledPlastic', label: 'Plastik Daur Ulang' },
    { id: 'compost', label: 'Kompos' },
    { id: 'recycledCrafts', label: 'Kerajinan Daur Ulang' },
    { id: 'recycledRawMaterials', label: 'Bahan Baku Daur Ulang' },
    { id: 'ecoFriendlyProducts', label: 'Produk Ramah Lingkungan' }
  ];

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return () => unsubscribe && unsubscribe();
  }, [selectedCategory, selectedCondition, searchTerm]);

  const fetchProducts = () => {
    try {
      setLoading(true);
      let productsRef = collection(db, 'products');

      let queryConstraints = [where('status', '==', 'available')];

      if (selectedCategory !== 'all') {
        queryConstraints.push(where('category', '==', selectedCategory));
      }

      if (selectedCondition !== 'all') {
        queryConstraints.push(where('condition', '==', selectedCondition));
      }

      const productsQuery = query(
        productsRef,
        ...queryConstraints
      );

      const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        let fetchedProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (searchTerm) {
          fetchedProducts = fetchedProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        if (priceRange.min !== '') {
          fetchedProducts = fetchedProducts.filter(product =>
            product.price >= Number(priceRange.min)
          );
        }
        if (priceRange.max !== '') {
          fetchedProducts = fetchedProducts.filter(product =>
            product.price <= Number(priceRange.max)
          );
        }

        fetchedProducts.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?.seconds * 1000 || 0);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?.seconds * 1000 || 0);
          return dateB - dateA;
        });

        setProducts(fetchedProducts);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching products:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to fetch products. Please try again.',
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up products listener:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to fetch products. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
      setLoading(false);
      return null;
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem.quantity === 1) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    }
  };

  const handleCheckout = async () => {
    try {
      const orderData = {
        userId: currentUser.uid,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'orders'), orderData);

      setCart([]);
      Swal.fire({
        title: 'Success!',
        text: 'Your order has been placed successfully',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error placing order:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to place order. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    }
  };

  const handleDevelopment = () => {
    setIsDevelopmentModalOpen(true);
  }

  return (
    <div className="sm:min-h-screen sm:bg-gray-50">
      <div className="sm:p-4">
        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari produk ramah lingkungan"
                className="text-sm w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full text-sm px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-100"
            >
              <Filter className="w-5 h-5" />
              Filter
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 space-y-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Category Filter */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg text-sm border border-gray-300 p-2.5"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Rentang Harga</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-1/2 rounded-lg text-sm border border-gray-300 p-2.5"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-1/2 rounded-lg border text-sm border-gray-300 p-2.5"
                  />
                </div>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Kondisi</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                >
                  <option value="all">Semua Kondisi</option>
                  <option value="readyToUse">Siap Pakai</option>
                  <option value="preOrder">Pre-Order</option>
                  <option value="madeToOrder">Made to Order</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map(product => (
              <div
                key={product.id}
                className="overflow-hidden transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                // onClick={() => navigate(`/dashboard/customer/marketplace/product/${product.id}`)}
                onClick={() => handleDevelopment()}
              >
                <div className="aspect-w-1 aspect-h-1">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-40"
                  />
                </div>
                <div className="px-2 py-4 space-y-1">
                  <h3 className="text-sm text-left font-medium text-gray-800 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-semibold text-emerald-600">
                      {product.price.toLocaleString()} poin
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Development Modal */}
        <DevelopmentModal
          isOpen={isDevelopmentModalOpen}
          onClose={() => setIsDevelopmentModalOpen(false)}
        />

        {/* Fixed Cart Button */}
        {cart.length > 0 && (
          <button
            onClick={() => navigate('/dashboard/customer/marketplace/checkout', {
              state: { items: cart }
            })}
            className="fixed z-50 p-4 text-white rounded-full shadow-lg bottom-20 right-4 bg-emerald-600 hover:bg-emerald-700"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-2 -right-2">
                {cart.length}
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerMarketplace;