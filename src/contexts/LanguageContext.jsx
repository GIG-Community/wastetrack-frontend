import React, { createContext, useContext, useState } from 'react';

export const LanguageContext = createContext();

export const translations = {
  en: {
    products: {
      title: 'Recycled Products',
      subtitle: 'Manage your recycled products',
      searchPlaceholder: 'Search products...',
      addProduct: 'Add Product',
      noProducts: 'No products',
      noProductsSubtext: 'Get started by creating a new product.',
      // Form
      addNewProduct: 'Add New Product',
      editProduct: 'Edit Product',
      productName: 'Product Name',
      productNamePlaceholder: 'Example: Recycled Bag',
      category: 'Category',
      selectCategory: 'Select Category',
      condition: 'Condition',
      selectCondition: 'Select Condition',
      description: 'Product Description',
      descriptionPlaceholder: 'Explain product details, materials, and benefits',
      price: 'Price',
      stock: 'Stock',
      minimumOrder: 'Minimum Order',
      productImage: 'Product Image',
      uploadImage: 'Upload Image',
      changeImage: 'Change Image',
      imageUrl: 'or enter image URL',
      cancel: 'Cancel',
      save: 'Save',
      update: 'Update',
      // Categories
      categories: {
        recycledPaper: 'Recycled Paper',
        recycledPlastic: 'Recycled Plastic',
        compost: 'Compost',
        recycledCrafts: 'Recycled Crafts',
        recycledRawMaterials: 'Recycled Raw Materials',
        ecoFriendlyProducts: 'Eco-Friendly Products'
      },
      // Conditions
      conditions: {
        readyToUse: 'Ready to Use',
        preOrder: 'Pre-Order',
        madeToOrder: 'Made to Order'
      },
      // Status
      status: {
        available: 'Available',
        limited: 'Limited Stock',
        outOfStock: 'Out of Stock'
      },
      // Messages
      messages: {
        deleteConfirm: 'Are you sure?',
        deleteWarning: "You won't be able to revert this!",
        deleteYes: 'Yes, delete it!',
        processing: 'Processing...',
        pleaseWait: 'Please wait',
        deleting: 'Deleting...',
        deleteProgress: 'Please wait while we delete the product',
        success: 'Success!',
        productAdded: 'Product added successfully',
        productUpdated: 'Product updated successfully',
        productDeleted: 'Product deleted successfully',
        error: 'Error',
        uploadError: 'Failed to upload image',
        saveError: 'Failed to save product. Please try again.'
      }
    }
  },
  id: {
    products: {
      title: 'Produk Daur Ulang',
      subtitle: 'Kelola produk hasil daur ulang Anda',
      searchPlaceholder: 'Cari produk...',
      addProduct: 'Tambah Produk',
      noProducts: 'Tidak ada produk',
      noProductsSubtext: 'Mulai dengan membuat produk baru.',
      // Form
      addNewProduct: 'Tambah Produk Baru',
      editProduct: 'Edit Produk',
      productName: 'Nama Produk',
      productNamePlaceholder: 'Contoh: Tas Daur Ulang',
      category: 'Kategori',
      selectCategory: 'Pilih Kategori',
      condition: 'Kondisi',
      selectCondition: 'Pilih Kondisi',
      description: 'Deskripsi Produk',
      descriptionPlaceholder: 'Jelaskan detail produk, material, dan manfaatnya',
      price: 'Harga (Rp)',
      stock: 'Stok',
      minimumOrder: 'Minimum Pemesanan',
      productImage: 'Gambar Produk',
      uploadImage: 'Unggah Gambar',
      changeImage: 'Ganti Gambar',
      imageUrl: 'atau masukkan URL gambar',
      cancel: 'Batal',
      save: 'Simpan',
      update: 'Perbarui',
      // Categories
      categories: {
        recycledPaper: 'Kertas Daur Ulang',
        recycledPlastic: 'Plastik Daur Ulang',
        compost: 'Kompos',
        recycledCrafts: 'Kerajinan Daur Ulang',
        recycledRawMaterials: 'Bahan Baku Daur Ulang',
        ecoFriendlyProducts: 'Produk Ramah Lingkungan'
      },
      // Conditions
      conditions: {
        readyToUse: 'Siap Pakai',
        preOrder: 'Pre-Order',
        madeToOrder: 'Made to Order'
      },
      // Status
      status: {
        available: 'Tersedia',
        limited: 'Stok Terbatas',
        outOfStock: 'Habis'
      },
      // Messages
      messages: {
        deleteConfirm: 'Apakah Anda yakin?',
        deleteWarning: 'Tindakan ini tidak dapat dibatalkan!',
        deleteYes: 'Ya, hapus!',
        processing: 'Memproses...',
        pleaseWait: 'Mohon tunggu sebentar',
        deleting: 'Menghapus...',
        deleteProgress: 'Mohon tunggu sementara kami menghapus produk',
        success: 'Berhasil!',
        productAdded: 'Produk berhasil ditambahkan',
        productUpdated: 'Produk berhasil diperbarui',
        productDeleted: 'Produk berhasil dihapus',
        error: 'Error',
        uploadError: 'Gagal mengunggah gambar',
        saveError: 'Gagal menyimpan produk. Silakan coba lagi.'
      }
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('id'); // Default to Indonesian

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'id' ? 'en' : 'id');
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};