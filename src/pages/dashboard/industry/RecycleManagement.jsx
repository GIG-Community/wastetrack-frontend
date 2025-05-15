import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  PhoneCall,
  Users,
  Truck,
  Container,
  TreePine,
  ChevronRight,
  Info,
  Scale,
  RefreshCw,
  RotateCw,
  ArrowRight,
  Filter,
  Trash2
} from 'lucide-react';
import { collection, query, doc, updateDoc, addDoc, where, onSnapshot, getDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.css';

// Import constants
import { WASTE_PRICES, wasteTypes as wasteCategories } from '../../../lib/constants';

// Recycled product categories
const recycledProductTypes = [
  {
    id: 'paper-products',
    name: '📄 Produk Kertas Daur Ulang',
    types: [
      { id: 'recycled-cardboard', name: 'Kardus Daur Ulang' },
      { id: 'recycled-paper', name: 'Kertas Daur Ulang' },
      { id: 'paper-pulp', name: 'Bubur Kertas' },
      { id: 'paper-crafts', name: 'Kerajinan Kertas' }
    ]
  },
  {
    id: 'plastic-products',
    name: '♻️ Produk Plastik Daur Ulang',
    types: [
      { id: 'plastic-pellets', name: 'Pelet Plastik' },
      { id: 'recycled-plastic-sheets', name: 'Lembaran Plastik Daur Ulang' },
      { id: 'plastic-furniture', name: 'Furnitur Plastik' },
      { id: 'plastic-crafts', name: 'Kerajinan Plastik' }
    ]
  },
  {
    id: 'metal-products',
    name: '🔩 Produk Logam Daur Ulang',
    types: [
      { id: 'metal-ingots', name: 'Batangan Logam' },
      { id: 'metal-parts', name: 'Komponen Logam' },
      { id: 'metal-wires', name: 'Kawat Logam' },
      { id: 'metal-crafts', name: 'Kerajinan Logam' }
    ]
  },
  {
    id: 'glass-products',
    name: '🔍 Produk Kaca Daur Ulang',
    types: [
      { id: 'recycled-glass', name: 'Kaca Daur Ulang' },
      { id: 'glass-aggregates', name: 'Agregat Kaca' },
      { id: 'glass-crafts', name: 'Kerajinan Kaca' }
    ]
  },
  {
    id: 'composite-products',
    name: '🧩 Produk Komposit',
    types: [
      { id: 'mixed-materials', name: 'Material Campuran' },
      { id: 'eco-boards', name: 'Papan Ekologi' },
      { id: 'composite-crafts', name: 'Kerajinan Komposit' }
    ]
  },
  {
    id: 'others',
    name: '⚡ Lainnya',
    types: [
      { id: 'recycled-oil', name: 'Minyak Daur Ulang' },
      { id: 'compost', name: 'Kompos' },
      { id: 'other-crafts', name: 'Kerajinan Lainnya' }
    ]
  }
];

// Recycling process statuses
const recyclingStatuses = [
  { id: 'raw', name: 'Mentah', icon: '🗑️', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'processing', name: 'Proses', icon: '⚙️', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'recycled', name: 'Sudah Didaur Ulang', icon: '♻️', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'completed', name: 'Selesai', icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
];

// Simplify status flow - allow any transition
const getAllowedStatuses = (currentStatus) => {
  // Return all statuses except the current one
  return recyclingStatuses
    .filter(status => status.id !== currentStatus)
    .map(status => status.id);
};

// Simplify validation to only check recycled weights for completed status
const validateStatusTransition = (currentStatus, newStatus, recycleData) => {
  // Only validate when moving to completed status without weights
  if (newStatus === 'completed' && 
      (!recycleData?.recycledWeights || 
      Object.keys(recycleData.recycledWeights).length === 0)) {
    return {
      isValid: false,
      message: 'Harap input berat hasil daur ulang terlebih dahulu sebelum status Selesai'
    };
  }
  
  return { isValid: true };
};

// Reusable Components
const Input = ({ label, error, className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition duration-200 ease-in-out
      placeholder:text-zinc-400
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed 
      ${error ? 'border-red-500' : ''}
      ${className}`}
    {...props}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

const Badge = ({ variant = "default", children, className = "", ...props }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700"
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Information panel component
const InfoPanel = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <h3 className="text-sm font-medium text-blue-800">{title}</h3>
            <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
          {isExpanded && (
            <div className="mt-1 text-sm text-blue-700">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ label, count, icon: Icon, description, className }) => (
  <div className={`bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-gray-50 rounded-lg w-fit group-hover:bg-emerald-50 transition-colors">
          <Icon className="w-5 h-5 text-gray-600 transition-colors group-hover:text-emerald-600" />
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <p className="text-sm font-medium text-gray-600">{label}</p>
        </div>
        <p className="mt-1 text-2xl font-semibold text-gray-800">{count}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = "default", disabled = false }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    info: "bg-blue-100 text-blue-600 hover:bg-blue-200"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
        transition-all hover:shadow-sm ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

// RecycleCard component for displaying completed collections
const RecycleCard = ({ collection, onStatusChange, onRecycleComplete, isProcessing, recycleData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusColors = {
    raw: "bg-yellow-100 text-yellow-700 border-yellow-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    recycled: "bg-purple-100 text-purple-700 border-purple-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'raw': return Package;
      case 'processing': return RefreshCw;
      case 'recycled': return RotateCw;
      case 'completed': return CheckCircle2;
      default: return Package;
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getRecyclingStatus = () => {
    if (!recycleData) return 'raw';
    return recycleData.status || 'raw';
  };

  const StatusIcon = getStatusIcon(getRecyclingStatus());
  const currentRecyclingStatus = getRecyclingStatus();

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md group">
      <div className="flex items-center">
        <div className={`h-1 flex-grow ${statusColors[currentRecyclingStatus]?.split(' ')[0] || 'bg-gray-200'}`} />
        <span className={`px-2 py-0.5 text-xs font-medium ${collection.requestType === 'self-delivery' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {collection.masterBankName ? 'Bank Sampah' : 'Pengumpulan Langsung'}
        </span>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start gap-4">
            <div className="p-3 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50">
              <Building2 className="w-6 h-6 text-gray-600 transition-colors group-hover:text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 transition-colors group-hover:text-emerald-600">
                {collection.masterBankName || "Pengumpulan Langsung"}
              </h3>
              <div className="flex flex-wrap items-center mt-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {collection.phone || 'Tidak ada nomor telepon'}
                  </span>
                </div>
                <span className="hidden text-gray-300 sm:inline">•</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusColors[currentRecyclingStatus] || 'bg-gray-100 text-gray-700'}`}>
                  <StatusIcon className="w-4 h-4" />
                  {recyclingStatuses.find(s => s.id === currentRecyclingStatus)?.name || 'Mentah'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4 text-right shrink-0">
            <div>
              <p className="text-xs text-gray-400">Dibuat Pada</p>
              <p className="text-sm font-medium text-gray-600">
                {formatDateTime(collection.createdAt)}
              </p>
              {collection.completedAt && (
                <>
                  <p className="mt-2 text-xs text-gray-400">Selesai Pada</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatDateTime(collection.completedAt)}
                  </p>
                </>
              )}
            </div>
            <ChevronRight 
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 mt-2
                ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>

        {isExpanded && (
          <>
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <Calendar className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Jadwal</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {collection.date?.seconds ? new Date(collection.date.seconds * 1000).toLocaleDateString('id-ID', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'Tanggal tidak tersedia'}
                  </p>
                  <p className="text-sm text-gray-500">{collection.time || 'Waktu tidak tersedia'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <MapPin className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Lokasi</p>
                  <p className="mt-1 text-sm text-gray-600">{collection.location?.address || collection.address || 'Alamat tidak tersedia'}</p>
                  {collection.notes && (
                    <p className="mt-1 text-sm italic text-gray-500">"{collection.notes}"</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl">
                <TreePine className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Hasil Pengumpulan</p>
                  <p className="mt-2 text-sm text-emerald-600">
                    Total Berat: <span className="font-semibold">
                      {Object.values(collection.wastes).reduce((sum, data) => sum + (data.weight || 0), 0).toFixed(1)} kg
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Waste Details Table */}
            {collection.wastes && Object.keys(collection.wastes).length > 0 && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                <h4 className="mb-4 text-sm font-medium text-gray-700">Detail Sampah Masuk</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Jenis</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Jumlah</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Berat (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(collection.wastes).map(([type, data]) => (
                        <tr key={type}>
                          <td className="px-4 py-2 text-sm text-gray-700">{type}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700">{data.quantity || 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700">{data.weight?.toFixed(1) || '0.0'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {Object.values(collection.wastes).reduce((sum, data) => sum + (data.quantity || 0), 0)}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {Object.values(collection.wastes).reduce((sum, data) => sum + (data.weight || 0), 0).toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recycled Weights Table - new section */}
            {recycleData?.recycledWeights && Object.keys(recycleData.recycledWeights).length > 0 && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                <h4 className="mb-4 text-sm font-medium text-gray-700">Detail Sampah Didaur Ulang</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Jenis</th>
                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Kategori Produk</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Berat Awal (kg)</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Hasil (kg)</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Efisiensi (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(recycleData.recycledWeights).map(([type, data]) => {
                        // Find product category name from the selected ID
                        const categoryType = recycledProductTypes
                          .flatMap(category => category.types)
                          .find(t => t.id === data.categoryId);
                          
                        const categoryName = categoryType?.name || 'Tidak dikategorikan';
                        const efficiency = data.originalWeight > 0 
                          ? ((data.weight / data.originalWeight) * 100).toFixed(1) 
                          : '0.0';
                          
                        return (
                          <tr key={type}>
                            <td className="px-4 py-2 text-sm text-gray-700">{type}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{categoryName}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-700">{data.originalWeight?.toFixed(1) || '0.0'}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-700">{data.weight?.toFixed(1) || '0.0'}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-700">{efficiency}%</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50">
                        <td colSpan="2" className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {Object.values(recycleData.recycledWeights).reduce((sum, data) => sum + (data.originalWeight || 0), 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {Object.values(recycleData.recycledWeights).reduce((sum, data) => sum + (data.weight || 0), 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {(() => {
                            const totalOriginal = Object.values(recycleData.recycledWeights).reduce((sum, data) => sum + (data.originalWeight || 0), 0);
                            const totalRecycled = Object.values(recycleData.recycledWeights).reduce((sum, data) => sum + (data.weight || 0), 0);
                            return totalOriginal > 0 ? ((totalRecycled / totalOriginal) * 100).toFixed(1) + '%' : '0.0%';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recycled Products Table */}
            {recycleData?.recycledProducts && Object.keys(recycleData.recycledProducts).length > 0 && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                <h4 className="mb-4 text-sm font-medium text-gray-700">Hasil Daur Ulang</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Jenis Produk</th>
                        <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Berat (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(recycleData.recycledProducts).map(([type, data]) => (
                        <tr key={type}>
                          <td className="px-4 py-2 text-sm text-gray-700">{type}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700">{data.weight.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                        <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                          {Object.values(recycleData.recycledProducts).reduce((sum, data) => sum + data.weight, 0).toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <QuickAction
              icon={RotateCw}
              label="Ubah Status"
              onClick={() => onStatusChange(collection, recycleData)}
              variant={currentRecyclingStatus === 'completed' ? 'success' : (currentRecyclingStatus === 'processing' ? 'info' : 'default')}
              disabled={isProcessing}
            />
            {currentRecyclingStatus === 'recycled' && (
              <QuickAction
                icon={Scale}
                label="Input Hasil"
                variant="success"
                onClick={() => onRecycleComplete(collection, recycleData)}
                disabled={isProcessing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Pagination component - updated to accept props
const Pagination = ({ currentPage, totalPages, handlePageChange, className = "" }) => {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const getVisiblePageNumbers = () => {
    const delta = 1; // Number of pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    
    // Always show first page
    range.push(1);
    
    // Calculate range around current page
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    // Always show last page
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    // Add dots where needed
    let l = null;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    
    return rangeWithDots;
  };

  return (
    <nav className={`mt-4 flex flex-col items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg sm:flex-row sm:px-6 ${className}`}>
      <div className="mb-3 text-sm text-gray-700 sm:mb-0">
        <span className="font-medium">Halaman {currentPage}</span> dari <span className="font-medium">{totalPages}</span>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* First page */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="hidden px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:block"
        >
          &laquo;
        </button>
        
        {/* Previous page */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lsaquo;
        </button>
        
        {/* Page numbers */}
        {getVisiblePageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`dot-${index}`} className="px-3 py-1 text-sm text-gray-500">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                currentPage === page 
                  ? 'bg-emerald-500 text-white border border-emerald-500' 
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        ))}
        
        {/* Next page */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &rsaquo;
        </button>
        
        {/* Last page */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="hidden px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:block"
        >
          &raquo;
        </button>
      </div>
    </nav>
  );
};

export default function RecycleManagement() {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collections, setCollections] = useState([]);
  const [recycleData, setRecycleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const itemsPerPage = 5;

  // Updated: Fetch completed collections and recycling data with realtime updates
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    setError(null);

    // Query for completed collections from industryRequests
    const collectionsQuery = query(
      collection(db, 'industryRequests'),
      where('industryId', '==', currentUser.uid),
      where('status', '==', 'completed')
    );

    // Query for recycling data from industryCollections
    const recycleQuery = query(
      collection(db, 'industryCollections'),
      where('industryId', '==', currentUser.uid)
    );

    // Setup realtime listeners
    const collectionsUnsubscribe = onSnapshot(
      collectionsQuery,
      (snapshot) => {
        const collectionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCollections(collectionsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching collections:", err);
        setError("Gagal memuat data pengumpulan. Silakan coba lagi.");
        setLoading(false);
      }
    );

    const recycleUnsubscribe = onSnapshot(
      recycleQuery,
      (snapshot) => {
        const recycleMap = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.collectionId) {
            recycleMap[data.collectionId] = {
              id: doc.id,
              ...data
            };
          }
        });
        setRecycleData(recycleMap);
      },
      (err) => {
        console.error("Error fetching recycling data:", err);
      }
    );

    // Cleanup function
    return () => {
      collectionsUnsubscribe();
      recycleUnsubscribe();
    };
  }, [currentUser?.uid]);

  // Open modal to change recycling status
  const openChangeStatusModal = async (collectionData, existingRecycleData) => {
    try {
      const currentStatus = existingRecycleData?.status || 'raw';
      
      // Show current recycled weights if available
      const recycledWeightsHtml = existingRecycleData?.recycledWeights && Object.keys(existingRecycleData.recycledWeights).length > 0 ? `
        <div class="mt-4 p-4 bg-purple-50 rounded-lg">
          <p class="text-sm text-purple-700 font-medium mb-2">Data Hasil Daur Ulang:</p>
          <div class="space-y-2">
            ${Object.entries(existingRecycleData.recycledWeights).map(([type, data]) => `
              <div class="flex justify-between items-center">
                <span class="text-sm text-purple-600">${type}</span>
                <span class="text-sm font-medium text-purple-700">${data.weight.toFixed(1)} kg</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      const result = await Swal.fire({
        title: 'Ubah Status Daur Ulang',
        html: `
          <div class="text-left p-4">
            <!-- Current Status Display -->
            <div class="mb-6 bg-gray-50 p-4 rounded-lg">
              <p class="text-sm font-medium text-gray-600 mb-2">Status Saat Ini</p>
              <div class="flex items-center gap-2">
                <span class="text-base">${recyclingStatuses.find(s => s.id === currentStatus)?.icon}</span>
                <span class="font-medium px-3 py-1 rounded-lg ${
                  currentStatus === 'raw' ? 'bg-yellow-50 text-yellow-600' :
                  currentStatus === 'processing' ? 'bg-blue-50 text-blue-600' :
                  currentStatus === 'recycled' ? 'bg-purple-50 text-purple-600' :
                  'bg-emerald-50 text-emerald-600'
                }">
                  ${recyclingStatuses.find(s => s.id === currentStatus)?.name}
                </span>
              </div>
            </div>
            
            <!-- Status Selection - show all statuses -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Status Baru
              </label>
              <select id="newStatus" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg">
                ${recyclingStatuses
                  .filter(status => status.id !== currentStatus) // Show all except current
                  .map(status => `
                    <option value="${status.id}">
                      ${status.icon} ${status.name}
                    </option>
                  `).join('')}
              </select>
            </div>

            ${recycledWeightsHtml}
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Perbarui',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#10B981',
        preConfirm: () => {
          return document.getElementById('newStatus').value;
        }
      });

      if (!result.isConfirmed) return;
      
      const newStatus = result.value;

      // Only validate completed status to ensure recycled weights
      const validation = validateStatusTransition(currentStatus, newStatus, existingRecycleData);
      if (!validation.isValid) {
        Swal.fire({
          icon: 'warning',
          title: 'Perhatian',
          text: validation.message,
          confirmButtonColor: '#10B981'
        });
        return;
      }

      // If moving to recycled status and no weights, prompt for weights
      if (newStatus === 'recycled' && 
          (!existingRecycleData?.recycledWeights || 
           Object.keys(existingRecycleData.recycledWeights).length === 0)) {
        return await handleRecycledWeightsInput(collectionData, existingRecycleData);
      }

      setProcessing(true);
      
      // Update database with new status
      if (existingRecycleData?.id) {
        const recycleRef = doc(db, 'industryCollections', existingRecycleData.id);
        const updateData = {
          status: newStatus,
          updatedAt: serverTimestamp()
        };

        await updateDoc(recycleRef, updateData);
      } else {
        const collectionRef = collection(db, 'industryCollections');
        await addDoc(collectionRef, {
          collectionId: collectionData.id,
          industryId: currentUser.uid,
          industryName: userData?.companyName || 'Industry User',
          status: newStatus,
          originalWastes: collectionData.wastes || {},
          totalInputWeight: collectionData.wastes ? 
            Object.values(collectionData.wastes).reduce((sum, data) => sum + (data.weight || 0), 0) : 0,
          recycledProducts: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: `Status daur ulang telah berhasil diubah menjadi ${recyclingStatuses.find(s => s.id === newStatus)?.name}`,
        confirmButtonColor: '#10B981'
      });

    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memperbarui status daur ulang.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Add new function to handle recycled weights input
  const handleRecycledWeightsInput = async (collection, existingRecycleData) => {
    try {
      setProcessing(true);

      // Show original waste data summary and input form
      const result = await Swal.fire({
        title: 'Input Berat Hasil Daur Ulang',
        width: 800,
        html: `
          <div class="text-left p-4">
            <div class="bg-purple-50 p-4 rounded-lg mb-6">
              <p class="text-sm text-purple-700">
                ♻️ Input berat sampah yang telah berhasil didaur ulang
              </p>
            </div>
            
            <!-- Original Waste Summary -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Data Sampah Masuk:</h4>
              <div class="grid grid-cols-2 gap-2">
                ${Object.entries(collection.wastes || {}).map(([type, data]) => `
                  <div class="p-2 border rounded bg-gray-50">
                    <span class="text-sm font-medium">${type}</span>
                    <span class="text-sm text-gray-600 float-right">${data.weight.toFixed(1)} kg</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Recycled Weight Input -->
            <div class="space-y-4">
              ${Object.entries(collection.wastes || {}).map(([type, data]) => `
                <div class="p-4 border rounded-lg">
                  <label class="block text-sm font-medium text-gray-700 mb-2">${type}</label>
                  <div class="flex gap-4">
                    <div class="flex-1">
                      <input 
                        type="number" 
                        id="recycled-${type}"
                        class="w-full px-3 py-2 border rounded-lg"
                        placeholder="0.0"
                        step="0.1"
                        min="0"
                        max="${data.weight}"
                      />
                      <p class="mt-1 text-xs text-gray-500">Berat awal: ${data.weight.toFixed(1)} kg</p>
                    </div>
                    <select id="category-${type}" class="w-48 border rounded-lg">
                      ${recycledProductTypes.map(category => `
                        <optgroup label="${category.name}">
                          ${category.types.map(type => 
                            `<option value="${type.id}">${type.name}</option>`
                          ).join('')}
                        </optgroup>
                      `).join('')}
                    </select>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#10B981',
        preConfirm: () => {
          const recycledData = {};
          Object.keys(collection.wastes || {}).forEach(type => {
            const weight = parseFloat(document.getElementById(`recycled-${type}`).value);
            const categoryId = document.getElementById(`category-${type}`).value;
            if (weight > 0) {
              recycledData[type] = {
                weight,
                categoryId,
                originalWeight: collection.wastes[type].weight
              };
            }
          });
          return recycledData;
        }
      });

      if (!result.isConfirmed || Object.keys(result.value).length === 0) {
        setProcessing(false);
        return;
      }

      // Update the recycling data
      const updateData = {
        status: 'recycled',
        recycledWeights: result.value,
        recycledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (existingRecycleData?.id) {
        const recycleRef = doc(db, 'industryCollections', existingRecycleData.id);
        await updateDoc(recycleRef, updateData);
      }

      Swal.fire({
        icon: 'success',
        title: 'Data Berhasil Disimpan',
        text: 'Berat hasil daur ulang telah berhasil disimpan.',
        confirmButtonColor: '#10B981'
      });

    } catch (error) {
      console.error("Error saving recycled weights:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal menyimpan data hasil daur ulang.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter and sort collections
  const filteredCollections = useMemo(() => {
    return collections.filter(collection => {
      // Match search term
      const matchesSearch = 
        !searchTerm || 
        (collection.masterBankName && collection.masterBankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (collection.location?.address && collection.location.address.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Match recycling status filter
      const collectionRecycleStatus = recycleData[collection.id]?.status || 'raw';
      const matchesStatus = filterStatus === 'all' || collectionRecycleStatus === filterStatus;
      
      // Match date range
      let matchesDateRange = true;
      if (startDate || endDate) {
        const collectionDate = collection.date?.seconds ? new Date(collection.date.seconds * 1000) : null;
        
        if (collectionDate) {
          if (startDate) {
            const startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            matchesDateRange = matchesDateRange && collectionDate >= startDateObj;
          }
          
          if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            matchesDateRange = matchesDateRange && collectionDate <= endDateObj;
          }
        }
      }
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [collections, recycleData, searchTerm, filterStatus, startDate, endDate]);

  // Sort filtered collections
  const sortedAndFilteredCollections = useMemo(() => {
    return [...filteredCollections].sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'date') {
        aValue = a.date?.seconds || 0;
        bValue = b.date?.seconds || 0;
      } else if (sortBy === 'completedAt') {
        aValue = a.completedAt?.seconds || 0;
        bValue = b.completedAt?.seconds || 0;
      } else {
        aValue = a.createdAt?.seconds || 0;
        bValue = a.createdAt?.seconds || 0;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [filteredCollections, sortBy, sortOrder]);

  // Paginate collections
  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredCollections.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredCollections, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredCollections.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Count recycling statuses
  const statusCounts = useMemo(() => {
    return collections.reduce((acc, collection) => {
      const status = recycleData[collection.id]?.status || 'raw';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [collections, recycleData]);

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <RotateCw className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Manajemen Daur Ulang</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola proses daur ulang sampah dari pengumpulan yang telah selesai
                </p>
                <button 
                  className="px-2 py-1 mt-1 text-xs text-blue-600 rounded-md bg-blue-50 hover:bg-blue-100"
                  onClick={() => {
                    const infoPanelElement = document.getElementById('infoPanel');
                    if (infoPanelElement) {
                        infoPanelElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Lihat Panduan
                </button>
              </div>
            </div>
          </div>

          <div id="infoPanel">
            <InfoPanel title="Tentang Manajemen Daur Ulang">
              <p>
                Halaman ini memungkinkan Anda untuk mengelola proses daur ulang sampah yang telah terkumpul.
                Anda dapat melacak status daur ulang, mulai dari sampah mentah, proses pengolahan, hingga produk daur ulang akhir.
                Data yang ditampilkan hanya mencakup pengumpulan yang sudah berstatus "Selesai".
              </p>
              <p className="mt-2">
                <strong>Alur proses:</strong>
              </p>
              <ol className="pl-5 mt-1 space-y-1 list-decimal">
                <li>Sampah Mentah (Raw) - Sampah yang baru terkumpul dan belum diproses</li>
                <li>Proses (Processing) - Sampah sedang dalam proses daur ulang</li>
                <li>Sudah Didaur Ulang (Recycled) - Sampah telah didaur ulang</li>
                <li>Selesai (Completed) - Proses daur ulang telah selesai dengan produk daur ulang</li>
              </ol>
            </InfoPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label="Total Pengumpulan"
              count={collections.length}
              icon={Package}
              description="Total pengumpulan selesai"
            />
            <StatusCard
              label="Sampah Mentah"
              count={statusCounts.raw || 0}
              icon={Package}
              description="Belum diproses"
              className="border-yellow-200"
            />
            <StatusCard
              label="Dalam Proses"
              count={statusCounts.processing || 0}
              icon={RefreshCw}
              description="Sedang didaur ulang"
              className="border-blue-200"
            />
            <StatusCard
              label="Sudah Didaur Ulang"
              count={statusCounts.recycled || 0}
              icon={RotateCw}
              description="Berat hasil daur ulang tercatat"
              className="border-purple-200"
            />
            <StatusCard
              label="Selesai Daur Ulang"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              description="Produk daur ulang siap"
              className="border-emerald-200"
            />
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 gap-4">
                <Input
                  type="text"
                  placeholder="Cari bank sampah atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  className="max-w-md"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {setStartDate(e.target.value); setCurrentPage(1);}}
                    className="w-40"
                    aria-label="Tanggal Mulai"
                  />
                  <span className="text-gray-500">sampai</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {setEndDate(e.target.value); setCurrentPage(1);}}
                    className="w-40"
                    aria-label="Tanggal Akhir"
                  />
                </div>
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => {setFilterStatus(e.target.value); setCurrentPage(1);}}
                className="w-full sm:w-48"
                aria-label="Filter Status"
              >
                <option value="all">Semua Status</option>
                <option value="raw">Mentah</option>
                <option value="processing">Proses</option>
                <option value="recycled">Sudah Didaur Ulang</option>
                <option value="completed">Selesai</option>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Urutkan:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSort('createdAt')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${sortBy === 'createdAt' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tanggal Dibuat
                  {sortBy === 'createdAt' && (
                    <span className="ml-1 text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSort('date')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${sortBy === 'date' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tgl. Pengumpulan
                  {sortBy === 'date' && (
                    <span className="ml-1 text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSort('completedAt')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${sortBy === 'completedAt' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tanggal Selesai
                  {sortBy === 'completedAt' && (
                    <span className="ml-1 text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="ml-3 text-gray-600">Memuat data pengumpulan...</span>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-red-500">{error}</p>
                <button 
                  className="px-4 py-2 mt-4 text-white rounded-lg bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => window.location.reload()}
                >
                  Coba Lagi
                </button>
              </div>
            ) : sortedAndFilteredCollections.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg font-medium text-gray-600">Tidak ada data pengumpulan ditemukan</p>
                <p className="mt-2 text-sm text-gray-400">Coba sesuaikan filter pencarian Anda atau tunggu pengumpulan baru.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 mb-4">
                  {paginatedCollections.map((collection) => (
                    <RecycleCard
                      key={collection.id}
                      collection={collection}
                      recycleData={recycleData[collection.id]}
                      onStatusChange={openChangeStatusModal}
                      onRecycleComplete={handleRecycledWeightsInput}
                      isProcessing={processing}
                    />
                  ))}
                </div>
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  handlePageChange={handlePageChange}
                />
                <div className="mt-4 text-sm text-center text-gray-500">
                  Menampilkan {paginatedCollections.length} dari {sortedAndFilteredCollections.length} hasil
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
