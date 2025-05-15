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
} from 'lucide-react';
import { collection, query, doc, updateDoc, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase'; // Assuming this path is correct
import { useAuth } from '../../../hooks/useAuth'; // Assuming this path is correct
import Sidebar from '../../../components/Sidebar'; // Assuming this path is correct
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.css';

// Import waste pricing data
import { WASTE_PRICES, wasteTypes as wasteCategories } from '../../../lib/constants'; // Assuming this path is correct

// Utility functions for calculations
const calculateTotalWeight = (wastes) => {
  if (!wastes || typeof wastes !== 'object') return 0;
  return Object.values(wastes).reduce((total, waste) => total + (waste.weight || 0), 0);
};

// Function to get waste details from ID
const getWasteDetails = (typeId) => {
  const categoryColors = {
    'paper': 'bg-yellow-100 text-yellow-700',
    'plastic': 'bg-blue-100 text-blue-700',
    'metal': 'bg-gray-100 text-gray-700',
    'glass': 'bg-emerald-100 text-emerald-700',
    'sack': 'bg-amber-100 text-amber-700',
    'others': 'bg-purple-100 text-purple-700'
  };

  for (const category of wasteCategories) {
    if (category.types) {
      const foundType = category.types.find(type => type.id === typeId);
      if (foundType) {
        return {
          name: foundType.name,
          categoryName: category.name,
          color: categoryColors[category.id] || 'bg-gray-100 text-gray-700'
        };
      }
    }
    if (category.subcategories) {
      for (const subcat of category.subcategories) {
        const foundType = subcat.types.find(type => type.id === typeId);
        if (foundType) {
          return {
            name: foundType.name,
            categoryName: `${category.name} - ${subcat.name}`,
            color: categoryColors[category.id] || 'bg-gray-100 text-gray-700'
          };
        }
      }
    }
  }
  return {
    name: typeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    categoryName: 'Lainnya',
    color: 'bg-gray-100 text-gray-700'
  };
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
    danger: "bg-red-100 text-red-700 hover:bg-red-200"
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

const handleStatusUpdate = async (collection, newStatus) => {
  try {
    const collectionRef = doc(db, 'industryRequests', collection.id);

    // Check if trying to complete without weights
    if (newStatus === 'completed' && !collection.wastes) {
      await Swal.fire({
        icon: 'warning',
        title: 'Input Berat Diperlukan',
        text: 'Anda harus menginput berat aktual sebelum menyelesaikan pengumpulan.',
        confirmButtonColor: '#10B981'
      });
      return false;
    }

    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };

    if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(collectionRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Gagal memperbarui status. Silakan coba lagi.',
      confirmButtonColor: '#10B981'
    });
    return false;
  }
};

const openWeightInputModal = async (collection) => {
  const { wasteQuantities = {}, wastes = {} } = collection;
  
  return Swal.fire({
    title: 'Input Berat Hasil Pengolahan',
    width: 800,
    html: `
      <div class="space-y-4 p-4">
        <div class="bg-blue-50 p-4 rounded-lg mb-6">
          <p class="text-sm text-blue-700">
            📊 Input berat aktual sampah setelah proses pengolahan selesai
          </p>
        </div>
        
        <div class="grid grid-cols-1 gap-4">
          ${Object.entries(wasteQuantities || {}).map(([typeId, quantity]) => {
            const details = getWasteDetails(typeId);
            const currentWeight = wastes[typeId]?.weight || '';
            return `
              <div class="p-4 border rounded-lg bg-white hover:shadow-md transition-all">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-gray-900">${details.name}</p>
                    <p class="text-sm text-gray-500">Estimasi: ${quantity} kantong</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="relative">
                      <input
                        type="number"
                        id="weight-${typeId}"
                        class="w-32 px-3 py-2 border rounded-lg text-right pr-12"
                        placeholder="0.0"
                        min="0"
                        step="0.1"
                        value="${currentWeight}"
                      />
                      <span class="absolute right-3 top-2.5 text-gray-500 text-sm">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#d33',
    preConfirm: () => {
      const weights = {};
      Object.keys(wasteQuantities || {}).forEach(typeId => {
        const input = document.getElementById(`weight-${typeId}`);
        if (input && input.value) {
          const weight = parseFloat(input.value);
          weights[typeId] = {
            weight,
            quantity: wasteQuantities[typeId]
          };
        }
      });
      return weights;
    }
  });
};

const CollectionCard = ({ collection, onStatusChange, onUpdateWeights, isProcessing }) => {
  const handleInputWeightClick = async () => {
    try {
      const result = await openWeightInputModal(collection);
      if (result.isConfirmed && Object.keys(result.value).length > 0) {
        const totalWeight = Object.values(result.value)
          .reduce((sum, item) => sum + (item.weight || 0), 0);
        await onUpdateWeights(collection.id, result.value, totalWeight);
      }
    } catch (error) {
      console.error('Error handling weight input:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memproses input berat. Silakan coba lagi.',
        confirmButtonColor: '#10B981'
      });
    }
  };

  const handleStatusClick = async () => {
    const statusOptions = [
      { value: 'pending', label: 'Menunggu', icon: '⏳' },
      { value: 'assigned', label: 'Ditugaskan', icon: '🔄' },
      { value: 'in_progress', label: 'Dalam Proses', icon: '⚡' },
      { value: 'cancelled', label: 'Dibatalkan', icon: '❌' }
    ];

    // Only show completed option if weights are input
    if (collection.wastes) {
      statusOptions.push({ value: 'completed', label: 'Selesai', icon: '✅' });
    }

    const { value: newStatus } = await Swal.fire({
      title: 'Perbarui Status',
      html: `
        <div class="text-left p-4">
          <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-medium text-gray-600 mb-2">Status Saat Ini</p>
            <p class="font-medium text-gray-800">${translateStatus(collection.status)}</p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Status Baru
            </label>
            <select id="newStatus" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${collection.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>
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

    if (newStatus) {
      await onStatusChange(collection, newStatus);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    assigned: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200"
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'assigned': return Users;
      case 'in_progress': return Truck;
      case 'completed': return CheckCircle2;
      case 'cancelled': return AlertCircle;
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

  const translateStatus = (status) => {
    if (status === 'completed') return 'Selesai';
    if (status === 'pending') return 'Menunggu';
    if (status === 'assigned') return 'Ditugaskan';
    if (status === 'cancelled') return 'Dibatalkan';
    if (status === 'in_progress') return 'Dalam Proses';
    return status;
  };

  const StatusIcon = getStatusIcon(collection.status);
  const isEffectivelyCompleted = collection.status === 'completed';

  const canInputWeights = collection.status === 'in_progress';

  const getProgressIndicator = (status) => {
    const steps = [
      { key: 'pending', label: 'Menunggu' },
      { key: 'assigned', label: 'Ditugaskan' },
      { key: 'in_progress', label: 'Dalam Proses' },
      { key: 'completed', label: 'Selesai' }
    ];
    
    const currentStep = steps.findIndex(s => s.key === status);
    
    return (
      <div className="flex items-center w-full mt-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex flex-col items-center ${index === currentStep ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${index <= currentStep ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {index + 1}
              </div>
              <span className="mt-1 text-xs">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md group">
      <div className="flex items-center">
        <div className={`h-1 flex-grow ${statusColors[collection.status]?.replace('text-', 'bg-').split(' ')[0] || 'bg-gray-200'}`} />
        <span className={`px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700`}>
          Bank Sampah
        </span>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-6 cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50">
              <Building2 className="w-6 h-6 text-gray-600 transition-colors group-hover:text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 transition-colors group-hover:text-emerald-600">
                {collection.masterBankName || collection.bankSampahName || "Bank Sampah"}
              </h3>
              <div className="flex flex-wrap items-center mt-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {collection.phone || 'Tidak ada nomor telepon'}
                  </span>
                </div>
                <span className="hidden text-gray-300 sm:inline">•</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusColors[collection.status] || 'bg-gray-100 text-gray-700'}`}>
                  <StatusIcon className="w-4 h-4" />
                  {translateStatus(collection.status)}
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
              {isEffectivelyCompleted && collection.completedAt && (
                <>
                  <p className="mt-2 text-xs text-gray-400">Selesai Pada</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatDateTime(collection.completedAt)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

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
          
          {isEffectivelyCompleted || collection.status === 'completed' ? (
            <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl">
              <TreePine className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700">Hasil Pengumpulan</p>
                <p className="mt-2 text-sm text-emerald-600">
                  Total Berat: <span className="font-semibold">
                    {Object.values(collection.wastes || {}).reduce((sum, data) => sum + (data.weight || 0), 0).toFixed(1)} kg
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
              <Package className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Estimasi Jenis Sampah</p>
                 <div className="flex flex-wrap gap-2 mt-2">
                  {(collection.wasteTypes || (collection.wasteQuantities && Object.keys(collection.wasteQuantities)) || []).map((typeOrId, index) => {
                    const details = getWasteDetails(typeOrId);
                    const name = details.name !== typeOrId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ? details.name : typeOrId;
                    return (
                      <span 
                        key={index} 
                        className={`px-2 py-1 text-xs border rounded-full ${details.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                      >
                        {name} {collection.wasteQuantities?.[typeOrId] ? `(${collection.wasteQuantities[typeOrId]} kantong)` : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {collection.status !== 'cancelled' && getProgressIndicator(collection.status)}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <QuickAction
              icon={Package}
              label="Ubah Status"
              onClick={handleStatusClick}
              variant={collection.status === 'completed' ? 'success' : 'default'}
              disabled={collection.status === 'cancelled'}
            />
            {canInputWeights && (
              <QuickAction
                icon={Scale}
                label="Input Berat Aktual"
                variant="success"
                onClick={handleInputWeightClick}
              />
            )}
          </div>
          
          {collection.status === 'pending' && (
            <QuickAction
              icon={AlertCircle}
              label="Batalkan"
              variant="danger"
              onClick={() => handleStatusUpdate(collection, 'cancelled')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems, className="" }) => {
  if (totalPages <= 1) return null;

  const getVisiblePageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    
    range.push(1);
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
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

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav className={`mt-4 flex flex-col items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg sm:flex-row sm:px-6 ${className}`}>
      <div className="mb-3 text-sm text-gray-700 sm:mb-0">
        <span className="font-medium">Halaman {currentPage}</span> dari <span className="font-medium">{totalPages}</span>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="hidden px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:block"
        >
          &laquo;
        </button>
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lsaquo;
        </button>
        
        {getVisiblePageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`dot-${index}`} className="px-3 py-1 text-sm text-gray-500">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
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
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &rsaquo;
        </button>
        
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="hidden px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:block"
        >
          &raquo;
        </button>
      </div>
    </nav>
  );
};

export default function RecyclingHub() {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collections, setCollections] = useState([]);
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
  
  const handleUpdateWeights = async (collectionId, wastes, totalWeight) => {
    setProcessing(true);
    try {
      const collectionRef = doc(db, 'industryRequests', collectionId);
      const updateData = {
        wastes: wastes,
        totalWeight: totalWeight,
        status: 'completed', // Change status to completed
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(collectionRef, updateData);

      await Swal.fire({
        title: 'Berhasil!',
        text: 'Berat sampah telah diinput dan status diubah menjadi Selesai',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });

    } catch (error) {
      console.error("Error updating weights:", error);
      await Swal.fire({
        title: 'Error!',
        text: 'Gagal memperbarui berat sampah.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    if (currentUser?.uid) {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, 'industryRequests'), 
        where('industryId', '==', currentUser.uid)
      );
      
      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const fetchedCollections = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCollections(fetchedCollections);
          setLoading(false);
        }, 
        (err) => {
          console.error("Error fetching collections: ", err);
          setError("Gagal memuat data pengumpulan. Silakan coba lagi.");
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
      setCollections([]);
    }
    return () => unsubscribe && unsubscribe();
  }, [currentUser?.uid]);

  const statusCounts = useMemo(() => {
    return collections.reduce((acc, collection) => {
      acc[collection.status] = (acc[collection.status] || 0) + 1;
      return acc;
    }, {});
  }, [collections]);

  const sortedAndFilteredCollections = useMemo(() => {
    let filtered = [...collections];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        (c.masterBankName && c.masterBankName.toLowerCase().includes(lowerSearchTerm)) ||
        (c.bankSampahName && c.bankSampahName.toLowerCase().includes(lowerSearchTerm)) ||
        (c.location?.address && c.location.address.toLowerCase().includes(lowerSearchTerm)) ||
        (c.address && c.address.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    if (startDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        filtered = filtered.filter(c => c.date?.seconds && (c.date.seconds * 1000) >= start);
    }
    if (endDate) {
        const end = new Date(endDate).setHours(23,59,59,999);
        filtered = filtered.filter(c => c.date?.seconds && (c.date.seconds * 1000) <= end);
    }

    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA?.seconds) valA = valA.seconds;
      if (valB?.seconds) valB = valB.seconds;
      
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return filtered;
  }, [collections, filterStatus, searchTerm, startDate, endDate, sortBy, sortOrder]);

  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredCollections.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredCollections, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedAndFilteredCollections.length / itemsPerPage);

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusChange = async (collectionItem, newStatusOverride = null) => {
    let finalStatus = newStatusOverride;

    if (!finalStatus) {
        const { value: selectedStatus } = await Swal.fire({
            title: 'Ubah Status Pengumpulan',
            input: 'select',
            inputOptions: {
                pending: 'Menunggu',
                assigned: 'Ditugaskan',
                in_progress: 'Dalam Proses',
                completed: 'Selesai',
                cancelled: 'Dibatalkan'
            },
            inputPlaceholder: 'Pilih status baru',
            inputValue: collectionItem.status,
            showCancelButton: true,
            confirmButtonText: 'Ubah',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value) {
                    return 'Anda harus memilih status!';
                }
            }
        });
        if (!selectedStatus) return;
        finalStatus = selectedStatus;
    }
    
    setProcessing(true);
    try {
        const collectionRef = doc(db, 'industryRequests', collectionItem.id);
        const updateData = { status: finalStatus, updatedAt: serverTimestamp() };

        if (finalStatus === 'completed') {
            updateData.completedAt = serverTimestamp();
            if (!collectionItem.wastes || Object.keys(collectionItem.wastes).length === 0) {
                 Swal.fire('Perhatian', 'Pengumpulan diselesaikan tanpa data berat aktual. Anda dapat menambahkannya nanti.', 'warning');
            }
        }
        
        await updateDoc(collectionRef, updateData);

        Swal.fire({
            title: 'Berhasil!',
            text: `Status pengumpulan untuk ${collectionItem.masterBankName || collectionItem.bankSampahName} telah diubah menjadi ${translateStatus(finalStatus)}.`,
            icon: 'success',
            confirmButtonColor: '#10B981'
        });

    } catch (error) {
        console.error("Error updating status: ", error);
        Swal.fire({
            title: 'Error!',
            text: 'Gagal mengubah status pengumpulan.',
            icon: 'error',
            confirmButtonColor: '#10B981'
        });
    } finally {
        setProcessing(false);
    }
  };

  const translateStatus = (status) => {
    if (status === 'completed') return 'Selesai';
    if (status === 'pending') return 'Menunggu';
    if (status === 'assigned') return 'Ditugaskan';
    if (status === 'cancelled') return 'Dibatalkan';
    if (status === 'in_progress') return 'Dalam Proses';
    return status;
  };


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
                <TreePine className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Recycling Hub</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola dan pantau semua pengumpulan sampah dari bank sampah
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
            <InfoPanel title="Tentang Recycling Hub">
              <p>
                Halaman ini memungkinkan Anda untuk mengelola semua pengumpulan sampah dari bank sampah. 
                Data ditampilkan secara real-time dan akan diperbarui otomatis ketika ada perubahan.
                Anda dapat mengubah status pengumpulan dan mencatat berat aktual sampah yang diterima.
              </p>
            </InfoPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label="Total Pengumpulan"
              count={collections.length}
              icon={Package}
              description="Total semua pengumpulan"
            />
            <StatusCard
              label="Menunggu"
              count={statusCounts.pending || 0}
              icon={Clock}
              description="Belum diproses"
              className="border-yellow-200"
            />
            <StatusCard
              label="Ditugaskan"
              count={statusCounts.assigned || 0}
              icon={Users}
              description="Telah ditugaskan"
              className="border-blue-200"
            />
            <StatusCard
              label="Dalam Proses"
              count={statusCounts.in_progress || 0}
              icon={Truck}
              description="Sedang dalam pengumpulan"
              className="border-blue-200"
            />
            <StatusCard
              label="Selesai"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              description="Berhasil diselesaikan"
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
                <option value="pending">Menunggu</option>
                <option value="assigned">Ditugaskan</option>
                <option value="in_progress">Dalam Proses</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
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
                <div className="grid grid-cols-1 gap-6 mb-6">
                  {paginatedCollections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onStatusChange={handleStatusChange}
                      onUpdateWeights={handleUpdateWeights}
                      isProcessing={processing}
                    />
                  ))}
                </div>
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    totalItems={sortedAndFilteredCollections.length}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div> 
  );
}