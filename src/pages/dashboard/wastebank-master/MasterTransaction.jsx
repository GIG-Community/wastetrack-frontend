import React, { useState, useEffect } from 'react';
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
  TreePineIcon,
  BoxSelectIcon,
  ChevronRight,
  Info,
  HelpCircle
} from 'lucide-react';
import { collection, query, doc, updateDoc, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import 'sweetalert2/dist/sweetalert2.css';

// Waste Types Structure
export const wasteTypes = [
  {
    id: 'paper',
    name: '📦 Kertas',
    types: [
      { id: 'kardus-bagus', name: 'Kardus Bagus' },
      { id: 'kardus-jelek', name: 'Kardus Jelek' },
      { id: 'koran', name: 'Koran' },
      { id: 'hvs', name: 'HVS' },
      { id: 'buram', name: 'Buram' },
      { id: 'majalah', name: 'Majalah' },
      { id: 'sak-semen', name: 'Sak Semen' },
      { id: 'duplek', name: 'Duplek' }
    ]
  },
  {
    id: 'plastic',
    name: '♻️ Plastik',
    subcategories: [
      {
        name: 'Botol (PET & Galon)',
        types: [
          { id: 'pet-bening', name: 'PET Bening Bersih' },
          { id: 'pet-biru', name: 'PET Biru Muda Bersih' },
          { id: 'pet-warna', name: 'PET Warna Bersih' },
          { id: 'pet-kotor', name: 'PET Kotor' },
          { id: 'pet-jelek', name: 'PET Jelek/Minyak' },
          { id: 'pet-galon', name: 'PET Galon Le Minerale' }
        ]
      },
      {
        name: 'Tutup Plastik',
        types: [
          { id: 'tutup-amdk', name: 'Tutup Botol AMDK' },
          { id: 'tutup-galon', name: 'Tutup Galon' },
          { id: 'tutup-campur', name: 'Tutup Campur' }
        ]
      },
      {
        name: 'Plastik Keras & Campur',
        types: [
          { id: 'ps-kaca', name: 'PS Kaca/Yakult/Akrilik' },
          { id: 'keping-cd', name: 'Keping CD' },
          { id: 'galon-utuh', name: 'Galon Utuh (Aqua/Club)' },
          { id: 'bak-hitam', name: 'Bak Hitam' },
          { id: 'bak-campur', name: 'Bak Campur (Tanpa Keras)' },
          { id: 'plastik-keras', name: 'Plastik Keras' }
        ]
      },
      {
        name: 'Plastik Lembaran',
        types: [
          { id: 'plastik-bening', name: 'Plastik Bening' },
          { id: 'kresek', name: 'Kresek/Bubble Wrap' },
          { id: 'sablon-tipis', name: 'Sablon Tipis' },
          { id: 'sablon-tebal', name: 'Sablon Tebal' },
          { id: 'karung-kecil', name: 'Karung Kecil/Rusak' },
          { id: 'sachet', name: 'Sachet Metalize' },
          { id: 'lembaran-campur', name: 'Lembaran Campur' }
        ]
      }
    ]
  },
  {
    id: 'metal',
    name: '🧱 Besi & Logam',
    subcategories: [
      {
        name: 'Besi',
        types: [
          { id: 'besi-tebal', name: 'Besi Tebal' },
          { id: 'sepeda', name: 'Sepeda/Paku' },
          { id: 'besi-tipis', name: 'Besi Tipis/Gerabang' },
          { id: 'kaleng', name: 'Kaleng' },
          { id: 'seng', name: 'Seng' }
        ]
      },
      {
        name: 'Logam Mulia',
        types: [
          { id: 'tembaga', name: 'Tembaga' },
          { id: 'kuningan', name: 'Kuningan' },
          { id: 'perunggu', name: 'Perunggu' },
          { id: 'aluminium', name: 'Aluminium' }
        ]
      }
    ]
  },
  {
    id: 'glass',
    name: '🧴 Kaca',
    types: [
      { id: 'botol-bensin', name: 'Botol Bensin Besar' },
      { id: 'botol-bir', name: 'Botol Bir Bintang Besar' },
      { id: 'botol-kecap', name: 'Botol Kecap/Saos Besar' },
      { id: 'botol-bening', name: 'Botol/Beling Bening' },
      { id: 'botol-warna', name: 'Botol/Beling Warna' }
    ]
  },
  {
    id: 'sack',
    name: '🧺 Karung',
    types: [
      { id: 'karung-100', name: 'Karung Ukuran 100 Kg' },
      { id: 'karung-200', name: 'Karung Ukuran 200 Kg' }
    ]
  },
  {
    id: 'others',
    name: '⚡ Lainnya',
    types: [
      { id: 'karak', name: 'Karak' },
      { id: 'gembos', name: 'Gembos' },
      { id: 'jelantah', name: 'Jelantah' },
      { id: 'kabel', name: 'Kabel Listrik' }
    ]
  }
];

// Map from waste type IDs to prices
export const WASTE_PRICES = {
  'kardus-bagus': 1300,
  'kardus-jelek': 1200,
  'koran': 3500,
  'hvs': 2000,
  'buram': 1000,
  'majalah': 1000,
  'sak-semen': 700,
  'duplek': 400,
  
  'pet-bening': 4200,
  'pet-biru': 3500,
  'pet-warna': 1200,
  'pet-kotor': 500,
  'pet-jelek': 100,
  'pet-galon': 1500,
  'tutup-amdk': 2500,
  'tutup-galon': 2000,
  'tutup-campur': 1000,
  
  'ps-kaca': 1000,
  'keping-cd': 3500,
  'galon-utuh': 5000,
  'bak-hitam': 3000,
  'bak-campur': 1500,
  'plastik-keras': 200,
  
  'plastik-bening': 800,
  'kresek': 300,
  'sablon-tipis': 200,
  'sablon-tebal': 300,
  'karung-kecil': 200,
  'sachet': 50,
  'lembaran-campur': 50,
  
  'besi-tebal': 2500,
  'sepeda': 1500,
  'besi-tipis': 500,
  'kaleng': 1000,
  'seng': 1000,
  'tembaga': 55000,
  'kuningan': 15000,
  'perunggu': 8000,
  'aluminium': 9000,
  
  'botol-bensin': 800,
  'botol-bir': 500,
  'botol-kecap': 300,
  'botol-bening': 100,
  'botol-warna': 50,
  
  'karung-100': 1300,
  'karung-200': 1800,
  
  'karak': 1800,
  'gembos': 300,
  'jelantah': 4000,
  'kabel': 3000
};

// Master bank prices (20% markup from regular prices)
export const MASTER_WASTE_PRICES = Object.fromEntries(
  Object.entries(WASTE_PRICES).map(([key, value]) => [
    key,
    Math.ceil(value * 1.2) // Markup rounded up
  ])
);

// Waste categories for environmental impact calculations
export const WASTE_CATEGORIES = {
  // Metal
  'aluminium': 'metal',
  'besi-tebal': 'metal',
  'besi-tipis': 'metal',
  'kaleng': 'metal',
  'kuningan': 'metal',
  'perunggu': 'metal',
  'seng': 'metal',
  'tembaga': 'metal',
  'sepeda': 'metal',
  
  // Cardboard
  'kardus-bagus': 'paper',
  'kardus-jelek': 'paper',
  'koran': 'paper',
  'majalah': 'paper',
  'hvs': 'paper',
  'duplek': 'paper',
  'buram': 'paper',
  'sak-semen': 'paper',
  
  // Plastics
  'botol-bening': 'plastic',
  'botol-bensin': 'plastic',
  'botol-bir': 'plastic',
  'botol-kecap': 'plastic',
  'botol-warna': 'plastic',
  'galon-utuh': 'plastic',
  'pet-bening': 'plastic',
  'pet-biru': 'plastic',
  'pet-galon': 'plastic',
  'pet-jelek': 'plastic',
  'pet-kotor': 'plastic',
  'pet-warna': 'plastic',
  'plastik-bening': 'plastic',
  'plastik-keras': 'plastic',
  'ps-kaca': 'plastic',
  'kresek': 'plastic',
  'bak-campur': 'plastic',
  'bak-hitam': 'plastic',
  
  // Organic
  'jelantah': 'organic',
  'karak': 'organic',
  'gembos': 'organic',

  // Other recyclables
  'karung-100': 'other',
  'karung-200': 'other',
  'karung-kecil': 'other',
  'keping-cd': 'other',
  'kabel': 'other',
  'sachet': 'other',
  'sablon-tebal': 'other',
  'sablon-tipis': 'other',
  'lembaran-campur': 'other',
  'tutup-amdk': 'other',
  'tutup-campur': 'other',
  'tutup-galon': 'other'
};

// Conversion rate (1 point = X Rupiah)
export const POINTS_CONVERSION_RATE = 100;

// Utility functions for waste type details
const getWasteTypeDetails = (typeId) => {
  // First look for the specific waste type
  for (const category of wasteTypes) {
    // Check if this category has direct types array
    if (category.types) {
      const foundType = category.types.find(type => type.id === typeId);
      if (foundType) {
        return {
          name: foundType.name,
          icon: category.name.split(' ')[0], // Get emoji from category name
          basePrice: WASTE_PRICES[typeId] || 0,
          masterPrice: MASTER_WASTE_PRICES[typeId] || 0,
          category: category.id
        };
      }
    }
    
    // Check if this category has subcategories
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        const foundType = subcategory.types.find(type => type.id === typeId);
        if (foundType) {
          return {
            name: foundType.name,
            icon: category.name.split(' ')[0], // Get emoji from category name
            basePrice: WASTE_PRICES[typeId] || 0,
            masterPrice: MASTER_WASTE_PRICES[typeId] || 0,
            category: category.id,
            subcategory: subcategory.name
          };
        }
      }
    }
  }
  
  // If not found, return a default object
  return { 
    name: typeId.charAt(0).toUpperCase() + typeId.slice(1).replace(/-/g, ' '), 
    icon: '📦',
    basePrice: WASTE_PRICES[typeId] || 0,
    masterPrice: MASTER_WASTE_PRICES[typeId] || 0,
    category: WASTE_CATEGORIES[typeId] || 'other'
  };
};

const getWasteTypeEmoji = (typeId) => {
  return getWasteTypeDetails(typeId).icon;
};

const getCategoryEmoji = (categoryId) => {
  const category = wasteTypes.find(cat => cat.id === categoryId);
  return category ? category.name.split(' ')[0] : '📦';
};

// Reusable Components
const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition duration-200 ease-in-out
      placeholder:text-zinc-400
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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

// Tooltip component for additional information - modified to be toggle-based instead of hover
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative group">
      <div onClick={() => setIsVisible(!isVisible)} className="cursor-pointer">
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-20 w-48 px-3 py-2 mb-2 text-xs text-white transform -translate-x-1/2 rounded-lg bg-zinc-800 bottom-full left-1/2">
          {content}
          <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
        </div>
      )}
    </div>
  );
};

// Hover-based tooltip specifically for help icons (question mark)
const HoverTooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-50 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

// Information panel component - modified with collapsible behavior
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

const StatusCard = ({ label, count, icon: Icon, description, className, tooltip }) => (
  <div className={`bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-gray-50 rounded-lg w-fit group-hover:bg-emerald-50 transition-colors">
          <Icon className="w-5 h-5 text-gray-600 transition-colors group-hover:text-emerald-600" />
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {tooltip && (
            <HoverTooltip content={tooltip}>
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            </HoverTooltip>
          )}
        </div>
        <p className="mt-1 text-2xl font-semibold text-gray-800">{count}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = "default", tooltip }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200"
  };

  const button = (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
        transition-all hover:shadow-sm ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
};

const PickupCard = ({ pickup, onStatusChange, isProcessing }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    assigned: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    // received: "bg-emerald-100 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200"
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'assigned': return Truck;
      // case 'in_progress': return Container;
      // case 'received': return CheckCircle2;
      // case 'completed': return CheckCircle2;
      case 'cancelled': return AlertCircle;
      default: return Package;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Translate status
  const translateStatus = (status) => {
    const statusMap = {
      'pending': 'Menunggu',
      'assigned': 'Ditugaskan',
      // 'in_progress': 'Dalam Proses',
      // 'received': 'Diterima',
      // 'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getLocationDisplay = (location) => {
    if (typeof location === 'string') {
      return location;
    }
    if (location?.address) {
      return location.address;
    }
    return 'Lokasi tidak tersedia';
  };

  const StatusIcon = getStatusIcon(pickup.status);
  const isDelivery = pickup.deliveryType === 'self-delivery';
  const isCompleted = pickup.status === 'completed';
  const hasCollector = !!pickup.collectorId;
  
  // Get total weight from all wastes - handle both data structures
  const totalWeight = pickup.wastes ? 
    Object.values(pickup.wastes).reduce((sum, waste) => sum + (parseFloat(waste.weight) || 0), 0) : 
    (pickup.wasteWeights ? 
      Object.values(pickup.wasteWeights).reduce((sum, weight) => sum + (parseFloat(weight) || 0), 0) : 0);

  return (
    <div className="overflow-hidden transition-all bg-white border border-gray-200 rounded-xl hover:shadow-md group">
      {/* Status Bar with Delivery Type Indicator */}
      <div className="flex items-center">
        <div className={`h-1 flex-grow ${statusColors[pickup.status]?.replace('text-', 'bg-').split(' ')[0]}`} />
        <span className={`px-2 py-0.5 text-xs font-medium ${isDelivery ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isDelivery ? 'Antar Sendiri' : 'Jemput'}
        </span>
      </div>
      
      <div className="p-6">
        {/* Header with toggle */}
        <div className="flex items-start justify-between mb-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start gap-4">
            <div className="p-3 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50">
              <Users className="w-6 h-6 text-gray-600 transition-colors group-hover:text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 transition-colors group-hover:text-emerald-600">
                {pickup.wasteBankName || 'Pengguna'}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {pickup.phone || 'Tidak ada nomor telepon'}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusColors[pickup.status]}`}>
                  <StatusIcon className="w-4 h-4" />
                  {translateStatus(pickup.status)}
                </div>
              </div>
              {/* {pickup.wasteBankName && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Bank Sampah:</span> {pickup.wasteBankName}
                </div>
              )}
              {pickup.masterBankName && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Bank Sampah Induk:</span> {pickup.masterBankName}
                </div>
              )} */}
            </div>
          </div>
          
          <div className="flex items-start gap-4 text-right">
            <div>
              <p className="text-xs text-gray-400">Dibuat Pada</p>
              <p className="text-sm font-medium text-gray-600">
                {formatDateTime(pickup.createdAt)}
              </p>
              {isCompleted && pickup.completedAt && (
                <>
                  <p className="mt-2 text-xs text-gray-400">Selesai Pada</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatDateTime(pickup.completedAt)}
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

        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
              <Calendar className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Jadwal</p>
                <p className="mt-1 text-sm text-gray-600">
                  {pickup.date ? new Date(pickup.date.seconds * 1000).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Tanggal tidak tersedia'}
                </p>
                <p className="text-sm text-gray-500">{pickup.time || 'Waktu tidak tersedia'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
              <MapPin className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Lokasi</p>
                <p className="mt-1 text-sm text-gray-600">{getLocationDisplay(pickup.location)}</p>
                {pickup.notes && (
                  <p className="mt-1 text-sm italic text-gray-500">"{pickup.notes}"</p>
                )}
              </div>
            </div>

            {hasCollector && (
              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <Truck className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Petugas Pengumpul</p>
                  <p className="mt-1 text-sm text-gray-600">ID: {pickup.collectorName}</p>
                  {pickup.collectorName && (
                    <p className="text-sm text-gray-600">{pickup.collectorName}</p>
                  )}
                </div>
              </div>
            )}

            {isCompleted ? (
              <div className="flex items-start gap-3 p-4 transition-colors bg-emerald-50 rounded-xl md:col-span-3">
                <TreePine className="w-5 h-5 text-emerald-600" />
                <div className="w-full">
                  <p className="text-sm font-medium text-emerald-700">Hasil Pengumpulan</p>
                  <div className="flex flex-wrap justify-between gap-4 mt-2">
                    <p className="text-sm text-emerald-600">
                      Total Berat: <span className="font-semibold">{totalWeight.toFixed(1)} kg</span>
                    </p>
                    <p className="text-sm text-emerald-600">
                      Total Nilai: <span className="font-semibold">{formatCurrency(pickup.totalValue || 0)}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 transition-colors bg-gray-50 rounded-xl group-hover:bg-emerald-50/50">
                <Package className="w-5 h-5 text-gray-400 transition-colors group-hover:text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Jenis Sampah</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pickup.wasteTypes?.map((type, index) => {
                      const wasteDetails = getWasteTypeDetails(type);
                      return (
                        <span 
                          key={index} 
                          className="flex items-center gap-1 px-2 py-1 text-xs border rounded-full bg-emerald-50 text-emerald-700 border-emerald-100"
                        >
                          <span>{getWasteTypeEmoji(type)}</span>
                          <span>{wasteDetails.name}</span>
                        </span>
                      );
                    })}
                    
                    {pickup.wasteQuantities && Object.keys(pickup.wasteQuantities).length > 0 && (
                      <div className="w-full mt-2 space-y-1">
                        {Object.entries(pickup.wasteQuantities).map(([type, quantity]) => {
                          const wasteDetails = getWasteTypeDetails(type);
                          return (
                            <div key={type} className="flex justify-between text-xs">
                              <span>{wasteDetails.name}</span>
                              <span>{quantity} kantong</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Waste Details Table */}
          {isCompleted && pickup.wastes && (
            <div className="pt-6 mt-6 border-t border-gray-200">
              <h4 className="mb-4 text-sm font-medium text-gray-700">Detail Pengumpulan</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Jenis</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Berat (kg)</th>
                      <th className="px-4 py-2 text-xs font-medium text-right text-gray-500 uppercase">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(pickup.wastes).map(([type, data]) => {
                      const wasteDetails = getWasteTypeDetails(type);
                      return (
                        <tr key={type}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span>{getWasteTypeEmoji(type)}</span>
                              <span>{wasteDetails.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700">
                            {parseFloat(data.weight || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700">
                            {formatCurrency(data.value || 0)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                      <td className="px-4 py-2 text-sm font-medium text-right text-gray-700">
                        {totalWeight.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-right text-emerald-600">
                        {formatCurrency(pickup.totalValue || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <QuickAction
              icon={Package}
              label="Ubah Status"
              onClick={() => onStatusChange(pickup)}
              variant={pickup.status === 'completed' ? 'success' : 'default'}
            />
          </div>
          
          {pickup.status === 'pending' && (
            <QuickAction
              icon={AlertCircle}
              label="Batalkan"
              variant="danger"
              onClick={() => onStatusChange(pickup)}
              tooltip="Batalkan permintaan pengumpulan ini"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const MasterTransaction = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [collectors, setCollectors] = useState([]);
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

  // Fetch data when authenticated
  useEffect(() => {
    let masterRequestsUnsubscribe;
    let collectorsUnsubscribe;
    
    if (currentUser?.uid) {
      const unsubscribes = fetchInitialData();
      masterRequestsUnsubscribe = unsubscribes.masterRequestsUnsubscribe;
      collectorsUnsubscribe = unsubscribes.collectorsUnsubscribe;
    }
    
    return () => {
      if (masterRequestsUnsubscribe) masterRequestsUnsubscribe();
      if (collectorsUnsubscribe) collectorsUnsubscribe();
    };
  }, [currentUser?.uid]);

  const fetchInitialData = () => {
    setLoading(true);
    setError(null);
    
    try {
      const masterRequestsUnsubscribe = setupMasterRequestsListener();
      const collectorsUnsubscribe = setupCollectorsListener();
      
      return { 
        masterRequestsUnsubscribe, 
        collectorsUnsubscribe
      };
    } catch (err) {
      setError('Gagal memuat data. Silakan coba lagi.');
      Swal.fire({
        title: 'Error',
        text: 'Gagal memuat data',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
      setLoading(false);
      return { 
        masterRequestsUnsubscribe: () => {}, 
        collectorsUnsubscribe: () => {}
      };
    }
  };

  const setupMasterRequestsListener = () => {
    if (!currentUser?.uid) {
      setError('Autentikasi diperlukan');
      return () => {};
    }
    
    try {
      // Get all requests where this user is the master bank
      const masterRequestsQuery = query(
        collection(db, 'masterBankRequests'),
        where('masterBankId', '==', currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(
        masterRequestsQuery,
        (snapshot) => {
          const requestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setPickups(requestsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error memantau data pengumpulan:', error);
          setError('Gagal memuat data pengumpulan');
          setLoading(false);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener pengumpulan:', error);
      setLoading(false);
      return () => {};
    }
  };

  const setupCollectorsListener = () => {
    try {
      const collectorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master_collector'),
        where('profile.institution', '==', userData?.id || '')
      );
      
      const unsubscribe = onSnapshot(
        collectorsQuery,
        (snapshot) => {
          const collectorsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCollectors(collectorsData);
        },
        (error) => {
          console.error('Error memantau data petugas:', error);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener petugas:', error);
      return () => {};
    }
  };

  const openChangeStatusModal = async (pickup) => {
    const statusOptions = [
      { value: 'pending', label: 'Menunggu', icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
      { value: 'assigned', label: 'Ditugaskan', icon: '🚛', color: 'bg-blue-50 text-blue-600' },
      // { value: 'in_progress', label: 'Dalam Proses', icon: '⚙️', color: 'bg-blue-50 text-blue-600' },
      // { value: 'completed', label: 'Selesai', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
      { value: 'cancelled', label: 'Dibatalkan', icon: '❌', color: 'bg-red-50 text-red-600' }
    ];

    // Format collector options untuk dropdown
    const collectorOptions = collectors
      .map(collector => `
        <option value="${collector.id}" 
          ${pickup.collectorId === collector.id ? 'selected' : ''}
          ${collector.status !== 'active' ? 'disabled' : ''}>
          ${collector.profile?.fullName || collector.email || 'Petugas Tanpa Nama'}
          ${collector.status !== 'active' ? ' (Tidak Aktif)' : ''}
        </option>
      `).join('');
      
    // Add visualization for waste details
    const wasteDetailsHTML = pickup.wastes ? 
      Object.entries(pickup.wastes).map(([type, data]) => {
        const wasteDetails = getWasteTypeDetails(type);
        const typeName = wasteDetails ? wasteDetails.name : type;
        
        return `
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-emerald-500 text-sm">${getWasteTypeEmoji(type)}</span>
              <span class="font-medium">${typeName}</span>
            </div>
            <div class="text-right">
              <span class="font-medium">${parseFloat(data.weight || 0).toFixed(1)} kg</span>
              <span class="block text-xs text-gray-500">Rp ${(data.value || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        `;
      }).join('') : '';

    const { value: formValues } = await Swal.fire({
      title: 'Perbarui Status Pengumpulan',
      width: 600,
      html: `
        <div class="text-left p-4">
          <!-- Current Status Display -->
          <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <p className="mb-2 text-sm font-medium text-gray-600">Status Saat Ini</p>
            <div class="flex items-center gap-2">
              <span class="text-base">${statusOptions.find(s => s.value === pickup.status)?.icon}</span>
              <span class="font-medium ${statusOptions.find(s => s.value === pickup.status)?.color} px-3 py-1 rounded-lg">
                ${pickup.status === 'pending' ? 'Menunggu' : 
                  pickup.status === 'assigned' ? 'Ditugaskan' : 
                  pickup.status === 'in_progress' ? 'Dalam Proses' : 
                  pickup.status === 'completed' ? 'Selesai' : 
                  pickup.status === 'cancelled' ? 'Dibatalkan' : 
                  pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
              </span>
            </div>
          </div>

          ${pickup.wastes ? `
            <!-- Waste Details -->
            <div class="mb-6 border border-gray-200 rounded-lg">
              <div class="p-3 bg-emerald-50 border-b border-gray-200">
                <h3 class="font-medium text-emerald-700">Detail Sampah</h3>
              </div>
              <div class="p-3">
                ${wasteDetailsHTML}
                <div class="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                  <span class="font-medium">Total</span>
                  <span class="font-medium text-emerald-600">Rp ${(pickup.totalValue || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- New Status Selection -->
          <div class="mb-6">
            <label for="newStatus" class="block text-sm font-medium text-gray-700 mb-2">
              Status Baru
            </label>
            <select id="newStatus" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700">
              ${statusOptions.map(status => `
                <option value="${status.value}" ${pickup.status === status.value ? 'selected' : ''}>
                  ${status.icon} ${status.label}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Collector Selection -->
          <div id="collectorSelectDiv" class="mb-4" style="display: ${['assigned', 'in_progress'].includes(pickup.status) ? 'block' : 'none'}">
            <label for="collectorSelect" class="block text-sm font-medium text-gray-700 mb-2">
              Tugaskan Petugas
            </label>
            <select id="collectorSelect" class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
              transition-all shadow-sm text-gray-700">
              <option value="">Pilih petugas</option>
              ${collectorOptions}
            </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const statusSelect = document.getElementById('newStatus');
        const collectorDiv = document.getElementById('collectorSelectDiv');
        
        if (statusSelect && collectorDiv) {
          // Add event listener directly, without depending on external function
          statusSelect.addEventListener('change', (e) => {
            collectorDiv.style.display = ['assigned', 'in_progress'].includes(e.target.value) ? 'block' : 'none';
          });
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Perbarui Status',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      customClass: {
        container: 'swal-custom-container',
        popup: 'swal-custom-popup rounded-xl',
        confirmButton: 'swal-custom-confirm-button',
        cancelButton: 'swal-custom-cancel-button'
      },
      preConfirm: () => {
        const newStatus = document.getElementById('newStatus').value;
        const collectorId = document.getElementById('collectorSelect')?.value;
        return { newStatus, collectorId };
      }
    });

    if (!formValues) return;

    try {
      setProcessing(true);
      const pickupRef = doc(db, 'masterBankRequests', pickup.id);
      const updates = {
        status: formValues.newStatus,
        updatedAt: new Date(),
      };

      if (['assigned', 'in_progress'].includes(formValues.newStatus) && formValues.collectorId) {
        updates.collectorId = formValues.collectorId;
      }

      if (formValues.newStatus === 'completed') {
        updates.completedAt = new Date();
      }

      await updateDoc(pickupRef, updates);

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: 'Status pengumpulan telah berhasil diperbarui.',
        confirmButtonColor: '#10B981'
      });
    } catch (error) {
      console.error('Error memperbarui status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memperbarui status. Silakan coba lagi.',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter pickups based on status, search term, and date range
  const filteredData = pickups.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    // Enhanced search to handle different data structures
    const matchesSearch = searchTerm === '' || (
      (item.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.wasteBankName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.masterBankName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (typeof item.location === 'string' ? 
        item.location.toLowerCase() : 
        item.location?.address?.toLowerCase() || ''
      ).includes(searchTerm.toLowerCase())
    );
    
    // Handle date comparisons more robustly
    let matchesDateRange = true;
    if (startDate && endDate && item.date) {
      const itemDate = item.date.seconds ? 
        new Date(item.date.seconds * 1000) : 
        item.date instanceof Date ? 
          item.date : null;
          
      if (itemDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59); // Set to end of day
        
        matchesDateRange = itemDate >= startDateObj && itemDate <= endDateObj;
      }
    }

    return matchesStatus && matchesSearch && matchesDateRange;
  });

  // Sort and filter pickups
  const sortedAndFilteredItems = filteredData.sort((a, b) => {
    // Handle different timestamp formats
    let aValue, bValue;
    
    if (sortBy === 'createdAt' || sortBy === 'completedAt' || sortBy === 'updatedAt') {
      aValue = a[sortBy]?.seconds ? a[sortBy].seconds : a[sortBy] instanceof Date ? a[sortBy].getTime() / 1000 : 0;
      bValue = b[sortBy]?.seconds ? b[sortBy].seconds : b[sortBy] instanceof Date ? b[sortBy].getTime() / 1000 : 0;
    } else {
      aValue = a[sortBy] || '';
      bValue = b[sortBy] || '';
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedAndFilteredItems.length / itemsPerPage);
  const paginatedItems = sortedAndFilteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Menampilkan {Math.min(sortedAndFilteredItems.length, 1 + (currentPage - 1) * itemsPerPage)} hingga {Math.min(currentPage * itemsPerPage, sortedAndFilteredItems.length)} dari{' '}
          {sortedAndFilteredItems.length} hasil
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Sebelumnya
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          // Show pages around current page
          let pageNum = i + 1;
          if (totalPages > 5) {
            if (currentPage > 3) {
              pageNum = i + currentPage - 2;
            }
            if (currentPage > totalPages - 2) {
              pageNum = totalPages - 4 + i;
            }
          }
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`px-3 py-1 text-sm border rounded-md ${
                currentPage === pageNum
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1 text-sm bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );

  // Get counts for each status
  const statusCounts = filteredData.reduce((acc, pickup) => {
    acc[pickup.status] = (acc[pickup.status] || 0) + 1;
    return acc;
  }, {});

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
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Pengumpulan Sampah</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola dan pantau semua permintaan pengumpulan sampah
                </p>
                <button 
                  className="px-2 py-1 mt-1 text-xs text-blue-600 rounded-md bg-blue-50 hover:bg-blue-100"
                  onClick={() => document.getElementById('infoPanel').scrollIntoView({ behavior: 'smooth' })}
                >
                  Lihat Panduan
                </button>
              </div>
            </div>
          </div>

          {/* Information Panel with ID for direct access */}
          <div id="infoPanel">
            <InfoPanel title="Tentang Pengumpulan Sampah">
              <p>
                Halaman ini memungkinkan Anda untuk mengelola semua permintaan pengumpulan sampah. 
                Data ditampilkan secara real-time dan akan diperbarui otomatis ketika ada perubahan.
                Anda dapat mengubah status pengumpulan, menugaskan petugas, dan menambahkan poin reward untuk pengguna.
              </p>
            </InfoPanel>
          </div>

          {/* Status Cards - with less intrusive tooltips */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label="Total Pengumpulan"
              count={pickups.length}
              icon={Package}
              description="Total semua pengumpulan"
              tooltip="Jumlah keseluruhan permintaan pengumpulan yang tercatat dalam sistem"
            />
            <StatusCard
              label="Menunggu"
              count={statusCounts.pending || 0}
              icon={Clock}
              description="Belum diproses"
              className="border-yellow-200"
              tooltip="Permintaan pengumpulan yang belum diproses atau ditugaskan ke petugas"
            />
            <StatusCard
              label="Sedang Diproses"
              count={statusCounts.processing || 0}
              icon={Truck}
              description="Sedang dalam pengumpulan"
              className="border-blue-200"
              tooltip="Permintaan pengumpulan yang sedang dalam proses pengambilan oleh petugas"
            />
            <StatusCard
              label="Selesai"
              count={statusCounts.completed || 0}
              icon={CheckCircle2}
              description="Berhasil diselesaikan"
              className="border-emerald-200"
              tooltip="Permintaan pengumpulan yang telah berhasil diselesaikan"
            />
          </div>

          {/* Filters, Search, and Sort */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-1 gap-4">
                <Input
                  type="text"
                  placeholder="Cari berdasarkan nama pelanggan atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-gray-500">sampai</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="processing">Diproses</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Urutkan:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('createdAt')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${sortBy === 'createdAt' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tanggal Dibuat
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">
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
                    <span className="text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Pickup Cards with Pagination */}
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
                  className="px-4 py-2 mt-4 text-white rounded-lg bg-emerald-500"
                  onClick={fetchInitialData}
                >
                  Coba Lagi
                </button>
              </div>
            ) : sortedAndFilteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Tidak ada data pengumpulan ditemukan</p>
                <p className="mt-2 text-sm text-gray-400">Coba sesuaikan filter pencarian Anda</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 mb-6">
                  {paginatedItems.map((pickup) => (
                    <PickupCard
                      key={pickup.id}
                      pickup={pickup}
                      onStatusChange={openChangeStatusModal}
                      isProcessing={processing}
                    />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterTransaction;
