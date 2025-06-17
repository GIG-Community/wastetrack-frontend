// src/pages/wastebank/BankSettings.jsx
import React, { useState, useEffect, Suspense } from 'react';
import {
  Building2,
  PackageOpen,
  AlertTriangle,
  Scale,
  ArrowUpCircle,
  Box,
  AlertCircle,
  AlertOctagon,
  Info,
  ChevronRight
} from 'lucide-react';
import { collection, doc, query, where, getDocs, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import WarehouseVisualization3D from '../../../components/WarehouseVisualization3D';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

// Constants for waste type data
const VOLUME_CONVERSION_FACTOR = 0.2; // m³ per kg, rata-rata dari WASTE_IMPACT_MULTIPLIERS
const WASTE_HEIGHT_FACTOR = 0.5; // Reduce the height factor to prevent overflow

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

// Waste categories mapping
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

  // Paper
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

// Utility function to find waste type details
const getWasteTypeName = (typeId) => {
  // First check in all categories with direct types
  for (const category of wasteTypes) {
    if (category.types) {
      const foundType = category.types.find(type => type.id === typeId);
      if (foundType) {
        return {
          name: foundType.name,
          category: category.id,
          emoji: category.name.split(' ')[0]
        };
      }
    }

    // Check in subcategories if they exist
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        const foundType = subcategory.types.find(type => type.id === typeId);
        if (foundType) {
          return {
            name: foundType.name,
            category: category.id,
            subcategory: subcategory.name,
            emoji: category.name.split(' ')[0]
          };
        }
      }
    }
  }

  // If not found, format the typeId to be more readable
  return {
    name: typeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    category: WASTE_CATEGORIES[typeId] || 'other',
    emoji: '📦'
  };
};

// More robust translation function for waste types
const translateWasteType = (type) => {
  const wasteInfo = getWasteTypeName(type);
  return `${wasteInfo.emoji} ${wasteInfo.name}`;
};

// Component definitions
const Card = ({ className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-zinc-200 ${className}`}
    {...props}
  />
);

const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

// Storage alert function - unchanged
const getStorageAlert = (percentage) => {
  if (percentage >= 100) {
    return {
      type: 'critical',
      color: 'red',
      icon: AlertOctagon,
      title: 'Kapasitas Overload!',
      message: 'Gudang telah melebihi kapasitas maksimal. Tindakan segera diperlukan:',
      suggestions: [
        'Segera lakukan transfer ke bank sampah induk',
        'Prioritaskan pengiriman sampah yang telah lama disimpan',
        'Hubungi bank sampah induk untuk penjadwalan pengambilan darurat',
        'Pertimbangkan untuk menolak penerimaan sampah baru hingga kapasitas tersedia'
      ]
    };
  } else if (percentage >= 90) {
    return {
      type: 'urgent',
      color: 'rose',
      icon: AlertTriangle,
      title: 'Kapasitas Kritis!',
      message: 'Gudang hampir mencapai batas maksimal. Tindakan segera direkomendasikan:',
      suggestions: [
        'Jadwalkan transfer ke bank sampah induk dalam 24 jam ke depan',
        'Evaluasi sampah yang telah lama disimpan untuk diprioritaskan',
        'Batasi penerimaan sampah baru',
        'Siapkan rute dan transportasi untuk transfer'
      ]
    };
  } else if (percentage >= 75) {
    return {
      type: 'warning',
      color: 'amber',
      icon: AlertTriangle,
      title: 'Kapasitas Hampir Penuh',
      message: 'Gudang mendekati kapasitas maksimal. Pertimbangkan tindakan berikut:',
      suggestions: [
        'Rencanakan transfer ke bank sampah induk dalam 3 hari ke depan',
        'Evaluasi jenis sampah yang dapat ditransfer',
        'Periksa jadwal pengambilan sampah yang akan datang'
      ]
    };
  } else if (percentage >= 60) {
    return {
      type: 'notice',
      color: 'blue',
      icon: Info,
      title: 'Kapasitas Moderat',
      message: 'Gudang mulai terisi. Beberapa saran untuk dipertimbangkan:',
      suggestions: [
        'Mulai merencanakan jadwal transfer ke bank sampah induk',
        'Evaluasi pola pengumpulan sampah untuk optimasi ruang',
        'Periksa sampah yang sudah lama disimpan'
      ]
    };
  }
  return null;
};

const MasterWarehouse = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({
    length: 10,
    width: 10,
    height: 2
  });
  const [isEditingDimensions, setIsEditingDimensions] = useState(false);
  const [warehouseStats, setWarehouseStats] = useState({
    totalCapacity: 200,
    currentStorage: 0,
    wasteTypes: {},
    usagePercentage: 0,
    recentPickups: [],
    wasteDetails: {} // Will store dates and weights
  });
  const [unsubscribes, setUnsubscribes] = useState([]);

  const [inputErrors, setInputErrors] = useState({
    length: '',
    width: '',
    height: ''
  });

  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [unsubscribes]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchWarehouseStats();
      fetchWarehouseDimensions();
    }
  }, [currentUser?.uid]);

  // Update statistics when dimensions change
  useEffect(() => {
    const totalCapacity = dimensions.length * dimensions.width * dimensions.height;
    const usagePercentage = Math.min((warehouseStats.currentStorage / totalCapacity) * 100, 100);

    setWarehouseStats(prev => ({
      ...prev,
      totalCapacity,
      usagePercentage
    }));
  }, [dimensions]);

  const fetchWarehouseDimensions = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const warehouseDims = data.warehouseDimensions || {
          length: 10,
          width: 10,
          height: 2
        };
        setDimensions(warehouseDims);
      }
    } catch (err) {
      console.error('Error fetching warehouse dimensions:', err);
    }
  };

  // Update warehouse dimensions
  const updateWarehouseDimensions = async () => {
    // Validate before saving
    const errors = {};
    let hasError = false;

    Object.entries(dimensions).forEach(([key, value]) => {
      if (!value || value <= 0) {
        errors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} harus lebih besar dari 0`;
        hasError = true;
      }
    });

    if (hasError) {
      setInputErrors(errors);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        warehouseDimensions: dimensions
      }, { merge: true });

      setInputErrors({});
      setIsEditingDimensions(false);
    } catch (err) {
      setError('Gagal memperbarui dimensi gudang');
      console.error(err);
    }
  };

  const fetchWarehouseStats = async () => {
    try {
      setLoading(true);
      if (!currentUser?.uid) {
        throw new Error('ID Pengguna tidak ditemukan');
      }

      // Clean previous subscriptions
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes = [];

      // Query for completed requests where this user is the waste bank
      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('masterBankId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );

      // Use onSnapshot for realtime data
      const unsubscribePickups = onSnapshot(
        pickupsQuery,
        (snapshot) => {
          const pickupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          processWarehouseData(pickupsData);
        },
        (error) => {
          console.error('Error listening to pickups:', error);
          setError('Gagal memuat data pengambilan secara realtime');
          setLoading(false);
        }
      );

      newUnsubscribes.push(unsubscribePickups);
      setUnsubscribes(newUnsubscribes);

    } catch (err) {
      console.error('Error fetching warehouse stats:', err);
      setError(err.message || 'Gagal memuat statistik gudang');
      setLoading(false);
    }
  };

  // Process warehouse data with the updated waste type structure
  const processWarehouseData = (pickupsData) => {
    try {
      const wasteTypes = {};
      const wasteDetails = {};
      let totalWeight = 0;

      pickupsData.forEach(pickup => {
        // Handle both waste data structures (wastes or wasteWeights)
        if (pickup.wastes) {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            const weight = Number(data.weight) || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = 0;
              wasteDetails[type] = [];
            }

            wasteTypes[type] += weight;
            totalWeight += weight;

            const pickupDate = pickup.completedAt?.toDate ?
              pickup.completedAt.toDate() :
              new Date(pickup.completedAt?.seconds * 1000 || 0);

            wasteDetails[type].push({
              weight: weight,
              date: pickupDate,
              volume: weight * VOLUME_CONVERSION_FACTOR,
              value: data.value || 0,
              points: data.points || 0
            });
          });
        }
        // Handle if using wasteWeights structure
        else if (pickup.wasteWeights) {
          Object.entries(pickup.wasteWeights).forEach(([type, weight]) => {
            weight = Number(weight) || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = 0;
              wasteDetails[type] = [];
            }

            wasteTypes[type] += weight;
            totalWeight += weight;

            const pickupDate = pickup.completedAt?.toDate ?
              pickup.completedAt.toDate() :
              new Date(pickup.completedAt?.seconds * 1000 || 0);

            const value = WASTE_PRICES[type] ? weight * WASTE_PRICES[type] : 0;

            wasteDetails[type].push({
              weight: weight,
              date: pickupDate,
              volume: weight * VOLUME_CONVERSION_FACTOR,
              value: value,
              points: 0
            });
          });
        }
      });

      const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;
      const totalCapacity = dimensions.length * dimensions.width * dimensions.height;
      const usagePercentage = Math.min((totalVolume / totalCapacity) * 100, 100);

      setWarehouseStats({
        totalCapacity,
        currentStorage: totalVolume,
        wasteTypes,
        wasteDetails,
        usagePercentage,
        recentPickups: pickupsData
          .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
          .slice(0, 5)
      });

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error processing warehouse data:', err);
      setError('Gagal memproses data gudang');
      setLoading(false);
    }
  };

  // Information panel component - modified with collapsible behavior
  const InfoPanel = ({ title, children }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="text-left p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <h3 className="mb-1 font-medium text-blue-800">{title}</h3>
              <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            {isExpanded && (
              <div className="text-sm text-blue-700">{children}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar
          role={userData?.role}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
              <p className="text-zinc-600">Memuat data gudang...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Pemantauan Gudang</h1>
              <p className="text-sm text-zinc-500">Pantau kapasitas penyimpanan dan inventaris sampah Anda</p>
            </div>
          </div>

          {/* Information Panel */}
          <InfoPanel title="Informasi">
            <p className="text-sm text-blue-600">
              <li>Halaman ini menampilkan data secara realtime dan langsung memperbarui perubahan tanpa perlu memuat ulang halaman.</li>
              <li><span className="font-semibold">Distribusi Sampah</span>: tabel ini menunjukkan jenis sampah berdasarkan volume terbanyak ke terkecil. Persentase menunjukkan proporsi dari total sampah yang ada.</li>
            </p>
          </InfoPanel>

          <div className="w-full mx-auto space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-6">
                <h3 className="mb-2 text-sm font-medium text-zinc-500">Total Kapasitas</h3>
                <p className="text-2xl font-semibold text-zinc-800">{formatNumber(warehouseStats.totalCapacity)} m³</p>
                <p className="mt-1 text-xs text-zinc-500">Kapasitas maksimal gudang berdasarkan dimensi</p>
              </Card>
              <Card className="p-6">
                <h3 className="mb-2 text-sm font-medium text-zinc-500">Penyimpanan Saat Ini</h3>
                <p className="text-2xl font-semibold text-zinc-800">{formatNumber(warehouseStats.currentStorage.toFixed(1))} m³</p>
                <p className="mt-1 text-xs text-zinc-500">Volume sampah yang saat ini disimpan di gudang</p>
              </Card>
              <Card className="p-6">
                <h3 className="mb-2 text-sm font-medium text-zinc-500">Penggunaan</h3>
                <p className="text-2xl font-semibold text-zinc-800">{warehouseStats.usagePercentage.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-zinc-500">Persentase kapasitas gudang yang telah terpakai</p>
              </Card>
            </div>

            {/* Warehouse Dimensions Settings */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex text-left items-center gap-2">
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <Box className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="items-center ml-4">
                    <h2 className="text-lg font-semibold text-zinc-800">Dimensi Gudang</h2>
                    <p className="text-sm text-zinc-500">Atur ukuran gudang penyimpanan sampah</p>
                  </div>
                </div>
                <button
                  onClick={() => isEditingDimensions ? updateWarehouseDimensions() : setIsEditingDimensions(true)}
                  className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  {isEditingDimensions ? 'Simpan' : 'Edit'}
                </button>
              </div>

              {/* Dimension inputs */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {['length', 'width', 'height'].map((dim) => (
                  <div key={dim} className="space-y-2">
                    <label className="block text-sm font-medium capitalize text-zinc-700">
                      {dim === 'length' ? 'Panjang' : dim === 'width' ? 'Lebar' : 'Tinggi'} (m)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={dimensions[dim]}
                        onChange={(e) => {
                          const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setDimensions(prev => ({
                            ...prev,
                            [dim]: newValue
                          }));
                          // Clear error when user starts typing
                          if (inputErrors[dim]) {
                            setInputErrors(prev => ({
                              ...prev,
                              [dim]: ''
                            }));
                          }
                        }}
                        disabled={!isEditingDimensions}
                        className={`block w-full rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-white pr-12
                          ${inputErrors[dim] ? 'border-red-300' : 'border-zinc-300'}`}
                      />
                      <span className="absolute -translate-y-1/2 right-3 top-1/2 text-zinc-400">
                        m
                      </span>
                    </div>
                    {inputErrors[dim] && (
                      <p className="mt-1 text-xs text-red-500">{inputErrors[dim]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 mt-6 rounded-lg bg-zinc-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-600">Total Volume Gudang:</span>
                  <span className="text-lg font-semibold text-zinc-800">
                    {formatNumber((dimensions.length * dimensions.width * dimensions.height).toFixed(1))} m³
                  </span>
                </div>
                <p className="mt-2 text-left text-xs text-zinc-500">
                  Volume dihitung dari perkalian panjang × lebar × tinggi gudang. Semakin besar volume, semakin banyak sampah yang dapat disimpan.
                </p>
                {isEditingDimensions && Object.values(dimensions).some(v => !v || v <= 0) && (
                  <p className="mt-2 text-xs text-amber-600">
                    Catatan: Nilai dimensi harus lebih besar dari 0 untuk dapat disimpan
                  </p>
                )}
              </div>
            </Card>

            {/* Storage Overview with 3D Visualization */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <div className="text-left flex items-center gap-2 mb-6">
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <PackageOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="items-center ml-4">
                    <h2 className="text-lg font-semibold text-zinc-800">Visualisasi Penyimpanan</h2>
                    <p className="text-sm text-zinc-500">Lihat penggunaan ruang gudang dalam tampilan 3D</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* 3D Visualization component */}
                  <Suspense fallback={
                    <div className="w-full h-[500px] flex items-center justify-center bg-zinc-50 rounded-xl">
                      <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
                    </div>
                  }>
                    <WarehouseVisualization3D
                      wasteTypes={Object.entries(warehouseStats.wasteTypes).reduce((acc, [type, weight]) => ({
                        ...acc,
                        [type]: weight * VOLUME_CONVERSION_FACTOR
                      }), {})}
                      totalCapacity={warehouseStats.totalCapacity}
                      currentStorage={warehouseStats.currentStorage}
                      dimensions={dimensions}
                      wasteDetails={warehouseStats.wasteDetails}
                    />
                  </Suspense>

                  {/* Usage gauge */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-700">
                        Penggunaan: {formatNumber(warehouseStats.currentStorage.toFixed(1))} m³
                      </span>
                      <span className="text-sm text-zinc-500">
                        dari {formatNumber(warehouseStats.totalCapacity)} m³
                      </span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full transition-all ${warehouseStats.usagePercentage >= 90 ? 'bg-red-500' :
                          warehouseStats.usagePercentage >= 70 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.min(warehouseStats.usagePercentage, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Visualisasi di atas menunjukkan berapa banyak ruang gudang yang terpakai berdasarkan jenis sampah. Warna yang berbeda mewakili jenis sampah yang berbeda.
                    </p>
                  </div>

                  {/* Enhanced Storage Alert System */}
                  {warehouseStats.usagePercentage >= 60 && (() => {
                    const alert = getStorageAlert(warehouseStats.usagePercentage);
                    const AlertIcon = alert.icon;

                    return (
                      <div className={`p-4 rounded-lg border ${alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                        alert.type === 'urgent' ? 'bg-rose-50 border-rose-200' :
                          alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="text-left flex items-start gap-3">
                          <AlertIcon className={`h-5 w-5 flex-shrink-0 text-${alert.color}-500 mt-0.5`} />
                          <div className="space-y-1">
                            <p className={`font-medium text-${alert.color}-700`}>
                              {alert.title}
                            </p>
                            <p className={`text-sm text-${alert.color}-600`}>
                              {alert.message}
                            </p>
                            <ul className={`text-sm text-${alert.color}-600 mt-2 space-y-1`}>
                              {alert.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="select-none">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                            {alert.type === 'critical' && (
                              <div className="flex items-center gap-2 mt-3">
                                <button className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                                  Hubungi Bank Sampah Induk
                                </button>
                                <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                                  Jadwalkan Transfer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Waste Distribution - Updated with improved waste type translation */}
              <Card className="p-6 max-h-[730px]">
                <div className="text-left flex items-center gap-2 mb-6">
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <Scale className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="items-center ml-4">
                    <h2 className="text-lg font-semibold text-zinc-800">Distribusi Sampah</h2>
                    <p className="text-sm text-zinc-500">Rincian jenis sampah yang disimpan di gudang</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
                  {Object.entries(warehouseStats.wasteTypes).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                      <PackageOpen className="w-12 h-12 mb-2 text-zinc-300" />
                      <p className="text-zinc-600">Belum ada data sampah yang tersimpan</p>
                    </div>
                  ) : (
                    Object.entries(warehouseStats.wasteTypes)
                      .map(([type, weight]) => {
                        const volume = weight * VOLUME_CONVERSION_FACTOR;
                        const details = warehouseStats.wasteDetails[type] || [];
                        const oldestDate = details.length > 0 ?
                          new Date(Math.min(...details.map(d => d.date.getTime()))) : null;
                        const percentage = (volume / warehouseStats.currentStorage) * 100;

                        return {
                          type,
                          translatedType: translateWasteType(type),
                          weight,
                          volume,
                          oldestDate,
                          percentage
                        };
                      })
                      // Sort by volume (largest to smallest)
                      .sort((a, b) => b.volume - a.volume)
                      .map(item => (
                        <div key={item.type} className="pb-4 border-b border-zinc-200">
                          <div className="flex justify-between mb-2">
                            <div className="text-left">
                              <span className="text-sm font-medium text-zinc-700">
                                {item.translatedType}
                              </span>
                              {item.oldestDate && (
                                <div className="mt-1 text-xs text-zinc-400">
                                  Batch terlama: {item.oldestDate.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-zinc-700">
                                {formatNumber(item.volume.toFixed(1))} m³
                              </div>
                              <div className="text-xs text-zinc-500">
                                {formatNumber(item.weight.toFixed(1))} kg ({item.percentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Collections - Updated with better waste type handling */}
            <Card className="p-6">
              <div className="text-left flex items-center gap-2 mb-6">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="items-center ml-4">
                  <h2 className="text-lg font-semibold text-zinc-800">Pengumpulan Terbaru</h2>
                  <p className="text-sm text-zinc-500">Riwayat pengumpulan sampah terakhir yang masuk ke gudang</p>
                </div>
              </div>

              <div className="divide-y divide-zinc-200">
                {warehouseStats.recentPickups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl">
                    <ArrowUpCircle className="w-12 h-12 mb-2 text-zinc-300" />
                    <p className="text-zinc-600">Belum ada data pengumpulan sampah</p>
                  </div>
                ) : (
                  warehouseStats.recentPickups.map(pickup => {
                    // Handle both waste data structures
                    const wastes = pickup.wastes || {};
                    const wasteWeights = pickup.wasteWeights || {};

                    // Calculate totals
                    let totalWeight = 0;
                    if (Object.keys(wastes).length > 0) {
                      totalWeight = Object.values(wastes).reduce((sum, waste) =>
                        sum + (Number(waste.weight) || 0), 0);
                    } else if (Object.keys(wasteWeights).length > 0) {
                      totalWeight = Object.values(wasteWeights).reduce((sum, weight) =>
                        sum + (Number(weight) || 0), 0);
                    }

                    const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;

                    return (
                      <div key={pickup.id} className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-left font-medium text-zinc-800">{pickup.wasteBankName || "Pengguna"}</p>
                            <p className="text-left text-sm text-zinc-500">
                              {new Date(pickup.completedAt?.seconds * 1000).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            {pickup.wasteBankName && (
                              <p className="hidden text-xs text-zinc-500 mt-1">
                                Bank Sampah: {pickup.wasteBankName}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-emerald-600">
                              {formatNumber(totalVolume.toFixed(1))} m³
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatNumber(totalWeight.toFixed(1))} kg
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.keys(wastes).length > 0 ? (
                            // Display wastes from the wastes structure
                            Object.entries(wastes).map(([type, data]) => {
                              const weight = Number(data.weight) || 0;
                              const volume = weight * VOLUME_CONVERSION_FACTOR;

                              return (
                                <span key={type} className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                  {translateWasteType(type)}: {formatNumber(volume.toFixed(1))} m³
                                </span>
                              );
                            })
                          ) : (
                            // Display wastes from the wasteWeights structure
                            Object.entries(wasteWeights).map(([type, weight]) => {
                              weight = Number(weight) || 0;
                              const volume = weight * VOLUME_CONVERSION_FACTOR;

                              return (
                                <span key={type} className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                  {translateWasteType(type)}: {formatNumber(volume.toFixed(1))} m³
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 border border-red-100 rounded-lg bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterWarehouse;