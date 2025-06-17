import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash, Search, ImageIcon, Upload, Globe } from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Swal from 'sweetalert2';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import Sidebar from '../../../components/Sidebar';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    stock: '',
    imageUrl: '',
    imageFile: null,
    condition: '',
    minimumOrder: '1',
    status: 'available',
    city: '',
    postalCode: '',
    shippingAddress: ''
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { language, toggleLanguage, translations } = useLanguage();
  const t = translations[language].products;

  const categories = [
    'recycledPaper',
    'recycledPlastic',
    'compost',
    'recycledCrafts',
    'recycledRawMaterials',
    'ecoFriendlyProducts'
  ];

  const conditions = [
    'readyToUse',
    'preOrder',
    'madeToOrder'
  ];

  const statusOptions = [
    { value: 'available', color: 'emerald' },
    { value: 'limited', color: 'yellow' },
    { value: 'out_of_stock', color: 'red' }
  ];

  const [productStats, setProductStats] = useState({
    total: 0,
    available: 0,
    limited: 0,
    out_of_stock: 0
  });

  const calculateProductStats = (productsData) => {
    const stats = {
      total: productsData.length,
      available: 0,
      limited: 0,
      out_of_stock: 0
    };

    productsData.forEach(product => {
      switch (product.status) {
        case 'available':
          stats.available++;
          break;
        case 'limited':
          stats.limited++;
          break;
        case 'out_of_stock':
          stats.out_of_stock++;
          break;
        default:
          break;
      }
    });

    setProductStats(stats);
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let productsQuery = query(
        collection(db, 'products'),
        where('sellerId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(productsQuery);
      let productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (searchTerm) {
        productsData = productsData.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setProducts(productsData);
      calculateProductStats(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const loadingSwal = Swal.fire({
        title: t.messages.processing,
        text: t.messages.pleaseWait,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      let imageUrl = formData.imageUrl;

      // Handle image upload if there's a new image file
      if (formData.imageFile) {
        setIsUploading(true);
        try {
          const fileName = `products/${currentUser.uid}/${Date.now()}-${formData.imageFile.name}`;
          const storageRef = ref(storage, fileName);
          
          // Upload the file
          const uploadTask = uploadBytes(storageRef, formData.imageFile);
          
          // Wait for upload to complete
          const snapshot = await uploadTask;
          
          // Get the download URL
          imageUrl = await getDownloadURL(snapshot.ref);

          // If updating, delete old image if it exists and is a storage URL
          if (selectedProduct?.imageUrl && selectedProduct.imageUrl.includes('firebase')) {
            try {
              const oldImageRef = ref(storage, selectedProduct.imageUrl);
              await deleteObject(oldImageRef);
            } catch (deleteError) {
              console.error('Error deleting old image:', deleteError);
            }
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Gagal mengunggah gambar');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      const productData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        stock: parseInt(formData.stock),
        imageUrl,
        condition: formData.condition,
        minimumOrder: parseInt(formData.minimumOrder) || 1,
        status: formData.status || 'available',
        sellerId: currentUser.uid,
        city: formData.city,
        postalCode: formData.postalCode,
        shippingAddress: formData.shippingAddress,
        updatedAt: new Date()
      };

      if (!selectedProduct) {
        productData.createdAt = new Date();
        productData.soldCount = 0;
        await addDoc(collection(db, 'products'), productData);
        await Swal.fire({
          icon: 'success',
          title: t.messages.success,
          text: t.messages.productAdded,
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        const productRef = doc(db, 'products', selectedProduct.id);
        await updateDoc(productRef, productData);
        await Swal.fire({
          icon: 'success',
          title: t.messages.success,
          text: t.messages.productUpdated,
          timer: 1500,
          showConfirmButton: false
        });
      }

      if (loadingSwal) {
        loadingSwal.close();
      }

      setIsModalOpen(false);
      setSelectedProduct(null);
      setFormData({
        name: '',
        category: '',
        price: '',
        description: '',
        stock: '',
        imageUrl: '',
        imageFile: null,
        condition: '',
        minimumOrder: '1',
        status: 'available',
        city: '',
        postalCode: '',
        shippingAddress: ''
      });
      
      await fetchProducts();
      
    } catch (error) {
      console.error('Error saving product:', error);
      Swal.close();
      
      await Swal.fire({
        icon: 'error',
        title: t.messages.error,
        text: error.message || t.messages.saveError
      });
    }
  };

  const handleDelete = async (productId, imageUrl) => {
    try {
      const result = await Swal.fire({
        title: t.messages.deleteConfirm,
        text: t.messages.deleteWarning,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#EF4444',
        confirmButtonText: t.messages.deleteYes
      });

      if (result.isConfirmed) {
        const loadingSwal = Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while we delete the product',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Delete product document first
        const productRef = doc(db, 'products', productId);
        await deleteDoc(productRef);

        // Then try to delete image if exists
        if (imageUrl) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }

        // Tutup loading dialog
        if (loadingSwal) {
          loadingSwal.close();
        }

        // Refresh data
        await fetchProducts();
        
        await Swal.fire({
          icon: 'success',
          title: t.messages.success,
          text: t.messages.productDeleted,
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      // Tutup loading dialog jika terjadi error
      Swal.close();
      
      await Swal.fire({
        icon: 'error',
        title: t.messages.error,
        text: t.messages.saveError
      });
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || '',
      imageFile: null,
      condition: product.condition || '',
      minimumOrder: product.minimumOrder?.toString() || '1',
      status: product.status || 'available',
      city: product.city || '',
      postalCode: product.postalCode || '',
      shippingAddress: product.shippingAddress || ''
    });
    setIsModalOpen(true);
  };

  const ProductSkeleton = () => (
    <div className="p-4 space-y-3 border rounded-lg animate-pulse">
      <div className="h-40 mb-4 bg-gray-200 rounded-lg"/>
      <div className="w-3/4 h-4 bg-gray-200 rounded"/>
      <div className="w-1/2 h-4 bg-gray-200 rounded"/>
      <div className="w-1/4 h-4 bg-gray-200 rounded"/>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} role="marketplace" />
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full hover:bg-gray-100"
              title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              <Globe className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Add Product Statistics */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-gray-500">Total Products</h3>
              <p className="text-2xl font-bold">{productStats.total}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-emerald-500">Available</h3>
              <p className="text-2xl font-bold">{productStats.available}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-yellow-500">Limited Stock</h3>
              <p className="text-2xl font-bold">{productStats.limited}</p>
            </div>
            <div className="p-4 bg-white shadow-sm rounded-xl">
              <h3 className="text-sm text-red-500">Out of Stock</h3>
              <p className="text-2xl font-bold">{productStats.out_of_stock}</p>
            </div>
          </div>

          <div className="p-4 bg-white shadow-sm rounded-xl md:p-6">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
              <div className="flex items-center w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    className="w-full py-2 pl-10 pr-4 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setFormData({
                    name: '',
                    category: '',
                    price: '',
                    description: '',
                    stock: '',
                    imageUrl: '',
                    imageFile: null,
                    condition: '',
                    minimumOrder: '1',
                    status: 'available',
                    city: '',
                    postalCode: '',
                    shippingAddress: ''
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-white transition-colors rounded-lg md:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus size={20} />
                <span>{t.addProduct}</span>
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, index) => (
                  <ProductSkeleton key={index} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div key={product.id} className="overflow-hidden transition-shadow border rounded-lg hover:shadow-lg">
                    <div className="bg-gray-100 aspect-w-16 aspect-h-9">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800 line-clamp-1">{product.name}</h3>
                          <p className="text-sm text-gray-500">{t.categories[product.category]}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            statusOptions.find(s => s.value === product.status)?.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                            statusOptions.find(s => s.value === product.status)?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {t.status[product.status]}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-1 rounded hover:bg-gray-100"
                              title={t.editProduct}
                            >
                              <Edit size={16} className="text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id, product.imageUrl)}
                              className="p-1 rounded hover:bg-gray-100"
                              title={t.messages.deleteConfirm}
                            >
                              <Trash size={16} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-emerald-600">
                          {language === 'id' ? 'Rp ' : '$ '}{product.price?.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{t.stock}: {product.stock}</p>
                      </div>
                      {product.city && (
                        <div className="text-sm text-gray-600">
                          <p className="line-clamp-1">
                            📍 {product.city} {product.postalCode}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs text-gray-800 bg-gray-100 rounded-full">
                          {t.conditions[product.condition]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t.noProducts}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.noProductsSubtext}</p>
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="mb-4 text-xl font-semibold">
                {selectedProduct ? t.editProduct : t.addNewProduct}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {t.productName}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.productNamePlaceholder}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {t.category}
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">{t.selectCategory}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {t.categories[category]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {t.condition}
                  </label>
                  <select
                    required
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">{t.selectCondition}</option>
                    {conditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {t.conditions[condition]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {t.description}
                  </label>
                  <textarea
                    required
                    placeholder={t.descriptionPlaceholder}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      {t.price}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      {t.stock}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {t.minimumOrder}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {t.productImage}
                  </label>
                  
                  <div className="flex flex-col gap-4 mt-1">
                    {/* Preview area */}
                    {(formData.imageUrl || formData.imageFile) && (
                      <div className="relative w-full h-48 overflow-hidden bg-gray-100 rounded-lg">
                        <img
                          src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : formData.imageUrl}
                          alt="Preview"
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            imageUrl: '',
                            imageFile: null
                          })}
                          className="absolute p-1 text-white bg-red-500 rounded-full top-2 right-2 hover:bg-red-600"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    )}

                    {/* Upload and URL inputs */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50">
                          <Upload className="w-5 h-5 mr-2 text-gray-400" />
                          <span>{formData.imageFile ? t.changeImage : t.uploadImage}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setFormData({
                                  ...formData,
                                  imageFile: file,
                                  imageUrl: '' // Clear URL when file is selected
                                });
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex-1">
                        <input
                          type="url"
                          placeholder={t.imageUrl}
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({
                            ...formData,
                            imageUrl: e.target.value,
                            imageFile: null // Clear file when URL is entered
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {isUploading && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700">Location Information</h3>
                  
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter postal code"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Shipping Address
                    </label>
                    <textarea
                      required
                      placeholder="Enter complete address"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6 space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedProduct(null);
                    }}
                    className="px-4 py-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    {selectedProduct ? t.update : t.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;