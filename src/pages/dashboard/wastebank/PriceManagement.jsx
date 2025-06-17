import React, { useState, useEffect } from 'react';
import { wasteTypes, WASTE_PRICES, MASTER_WASTE_PRICES, getWasteDetails } from '../../../lib/constants';
import {
    Download,
    RotateCcw,
    Package,
    DollarSign,
    TrendingUp,
    Edit,
    Check,
    X,
    Search
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

const PriceManagement = () => {
    // Scroll ke atas saat halaman dimuat
    useSmoothScroll({
        enabled: true,
        top: 0,
        scrollOnMount: true
    });
    const { userData } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [prices, setPrices] = useState({ ...WASTE_PRICES });
    const [masterPrices, setMasterPrices] = useState({ ...MASTER_WASTE_PRICES });
    const [editingItem, setEditingItem] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showMasterPrices, setShowMasterPrices] = useState(false);

    // Get all waste items in a flat structure
    const getAllWasteItems = () => {
        const items = [];

        wasteTypes.forEach(category => {
            if (category.subcategories) {
                category.subcategories.forEach(subcat => {
                    subcat.types.forEach(type => {
                        items.push({
                            ...type,
                            category: category.name,
                            categoryId: category.id,
                            subcategory: subcat.name
                        });
                    });
                });
            } else if (category.types) {
                category.types.forEach(type => {
                    items.push({
                        ...type,
                        category: category.name,
                        categoryId: category.id
                    });
                });
            }
        });

        return items;
    };

    const [allItems] = useState(getAllWasteItems());

    // Filter items based on search and category
    const filteredItems = allItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleEditStart = (item) => {
        setEditingItem(item.id);
        setEditPrice(showMasterPrices ? masterPrices[item.id]?.toString() : prices[item.id]?.toString());
    };

    const handleEditSave = (itemId) => {
        const newPrice = parseInt(editPrice);
        if (!isNaN(newPrice) && newPrice >= 0) {
            if (showMasterPrices) {
                setMasterPrices(prev => ({
                    ...prev,
                    [itemId]: newPrice
                }));
            } else {
                setPrices(prev => ({
                    ...prev,
                    [itemId]: newPrice
                }));
                // Update master price (20% markup)
                setMasterPrices(prev => ({
                    ...prev,
                    [itemId]: Math.ceil(newPrice * 1.2)
                }));
            }
        }
        setEditingItem(null);
        setEditPrice('');
    };

    const handleEditCancel = () => {
        setEditingItem(null);
        setEditPrice('');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const resetPrices = () => {
        if (window.confirm('Apakah Anda yakin ingin mereset semua harga ke nilai default?')) {
            setPrices({ ...WASTE_PRICES });
            setMasterPrices({ ...MASTER_WASTE_PRICES });
        }
    };

    const exportPrices = () => {
        const data = {
            regularPrices: prices,
            masterPrices: masterPrices,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waste-prices-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }; return (
        <div className="flex min-h-screen bg-zinc-50/50">
            {/* Sidebar */}
            <Sidebar
                role={userData?.role}
                onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
            />

            {/* Main content */}
            <main className={`flex-1 transition-all duration-300 ease-in-out
                ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex text-left items-center gap-4 mb-8">
                            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                                <DollarSign className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Management Harga Sampah</h1>
                                <p className="text-sm text-gray-500">
                                    Kelola harga untuk setiap jenis sampah yang dapat didaur ulang
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="text-left my-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500 text-white">
                                        <Package className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Jenis Sampah</dt>
                                        <dd className="text-lg font-medium text-gray-900">{allItems.length}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500 text-white">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Rata-rata Harga</dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatCurrency(
                                                Object.values(showMasterPrices ? masterPrices : prices).reduce((a, b) => a + b, 0) /
                                                Object.values(showMasterPrices ? masterPrices : prices).length
                                            )}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500 text-white">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Harga Tertinggi</dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatCurrency(
                                                Math.max(...Object.values(showMasterPrices ? masterPrices : prices))
                                            )}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="rounded-lg mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type="text"
                                        placeholder="Cari jenis sampah..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="text-sm pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Category Filter */}
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="text-sm px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="all">Semua Kategori</option>
                                    {wasteTypes.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>

                                {/* Price Type Toggle */}
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showMasterPrices}
                                            onChange={(e) => setShowMasterPrices(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showMasterPrices ? 'bg-green-600' : 'bg-gray-200'
                                            }`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showMasterPrices ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </div>
                                        <span className="ml-2 text-sm font-medium text-gray-700">
                                            {showMasterPrices ? 'Harga Bank Induk' : 'Harga Bank Unit'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={exportPrices}
                                    className="px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                                <button
                                    onClick={resetPrices}
                                    className="px-4 py-3 text-gray-700 bg-transparent rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Price Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                                            <div className="flex items-center gap-2">
                                                Jenis Sampah
                                            </div>
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                                            <div className="flex items-center justify-center gap-2">
                                                Kategori
                                            </div>
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                                            <div className="flex items-center gap-2">
                                                {showMasterPrices ? 'Harga Bank Induk' : 'Harga Bank Unit'} (kg)
                                            </div>
                                        </th>
                                        {!showMasterPrices && (
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    Harga Bank Induk
                                                </div>
                                            </th>
                                        )}
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <div className="flex items-center justify-center gap-2">
                                                Aksi
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredItems.map((item, index) => {
                                        const currentPrice = showMasterPrices ? masterPrices[item.id] : prices[item.id];
                                        const masterPrice = masterPrices[item.id];

                                        return (
                                            <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                }`}>
                                                <td className="px-6 py-4 border-r border-gray-100">
                                                    <div className="text-left flex flex-col">
                                                        <div className="text-sm font-semibold text-gray-900 mb-1">{item.name}
                                                            {item.subcategory && (
                                                                <div className="ml-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block w-fit">
                                                                    {item.subcategory}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-100">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-emerald-70">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-100">
                                                    {editingItem === item.id ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                                                                <input
                                                                    type="number"
                                                                    value={editPrice}
                                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                                    className="w-32 pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                                                                    min="0"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleEditSave(item.id)}
                                                                    className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    title="Simpan"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={handleEditCancel}
                                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Batal"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {formatCurrency(currentPrice || 0)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                {!showMasterPrices && (
                                                    <td className="px-6 py-4 border-r border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-semibold text-amber-700">
                                                                {formatCurrency(masterPrice || 0)}
                                                            </div>
                                                            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                +20%
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-center">
                                                    {editingItem === item.id ? (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                            <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                                                            Mengedit...
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditStart(item)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="text-center py-16 border-t border-gray-200">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21L15 15M17 10A7 7 0 1110 3a7 7 0 017 7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak ada data ditemukan</h3>
                                        <p className="text-sm text-gray-500">Coba ubah kriteria pencarian atau filter Anda.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedCategory('all');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors"
                                    >
                                        Reset Filter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PriceManagement;