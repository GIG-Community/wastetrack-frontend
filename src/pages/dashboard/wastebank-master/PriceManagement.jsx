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
    Search,
    Crown,
    AlertTriangle
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
    
    const { userData, currentUser } = useAuth();
    
    // Debug information - Remove after fixing role issue
    useEffect(() => {
        console.log('=== DEBUG WASTEBANK-MASTER PRICEMANAGEMENT ===');
        console.log('Current User:', currentUser);
        console.log('User Data:', userData);
        console.log('User Role:', userData?.role);
        console.log('Expected Role: wastebank_master');
        console.log('Role Match:', userData?.role === 'wastebank_master');
        console.log('=== END DEBUG ===');
    }, [currentUser, userData]);

    // Show role mismatch warning if needed
    if (userData && userData.role !== 'wastebank_master') {
        return (
            <div className="flex min-h-screen bg-red-50">
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Akses Ditolak</h2>
                        <div className="text-left bg-gray-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-600 mb-2"><strong>Debug Info:</strong></p>
                            <p className="text-xs text-gray-500">User Role: <span className="font-mono bg-yellow-100 px-1">{userData?.role || 'undefined'}</span></p>
                            <p className="text-xs text-gray-500">Expected: <span className="font-mono bg-green-100 px-1">wastebank_master</span></p>
                            <p className="text-xs text-gray-500">User ID: <span className="font-mono bg-blue-100 px-1">{currentUser?.uid}</span></p>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Anda tidak memiliki akses ke halaman ini. Role Anda adalah "{userData?.role}" tetapi halaman ini memerlukan role "wastebank_master".
                        </p>
                        <button 
                            onClick={() => window.history.back()}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Kembali
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [masterPrices, setMasterPrices] = useState({ ...MASTER_WASTE_PRICES });
    const [editingItem, setEditingItem] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

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
        setEditPrice(masterPrices[item.id]?.toString());
    };

    const handleEditSave = (itemId) => {
        const newPrice = parseInt(editPrice);
        if (!isNaN(newPrice) && newPrice >= 0) {
            setMasterPrices(prev => ({
                ...prev,
                [itemId]: newPrice
            }));
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
            setMasterPrices({ ...MASTER_WASTE_PRICES });
        }
    };

    const exportPrices = () => {
        const data = {
            masterPrices: masterPrices,
            exportDate: new Date().toISOString(),
            exportedBy: 'wastebank-master'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `master-waste-prices-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
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
                                <h1 className="text-2xl font-semibold text-gray-800">Management Harga Bank Induk</h1>
                                <p className="text-sm text-gray-500">
                                    Kelola harga master untuk setiap jenis sampah bank induk
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
                                                Object.values(masterPrices).reduce((a, b) => a + b, 0) /
                                                Object.values(masterPrices).length
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
                                                Math.max(...Object.values(masterPrices))
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
                                        className="text-sm pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Category Filter */}
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="text-sm px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="all">Semua Kategori</option>
                                    {wasteTypes.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>

                                {/* Master Price Indicator */}
                                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <Crown className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-medium text-emerald-700">
                                        Mode Bank Induk
                                    </span>
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
                                                Harga Bank Induk (kg)
                                            </div>
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <div className="flex items-center justify-center gap-2">
                                                Aksi
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredItems.map((item, index) => {
                                        const masterPrice = masterPrices[item.id];

                                        return (
                                            <tr key={item.id} className={`hover:bg-emerald-50/30 transition-colors duration-150 ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
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
                                                            <div className="text-sm font-bold text-black-800">
                                                                {formatCurrency(masterPrice || 0)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
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
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <Crown className="w-8 h-8 text-emerald-500" />
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
                                        className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors"
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