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

const VOLUME_CONVERSION_FACTOR = 0.2; // m³ per kg, rata-rata dari WASTE_IMPACT_MULTIPLIERS
const WASTE_HEIGHT_FACTOR = 0.5; // Reduce the height factor to prevent overflow

const Card = ({ className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-zinc-200 ${className}`}
    {...props}
  />
);

const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

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

const Warehouse = () => {
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

  // Membersihkan subscription saat komponen unmount
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

  // Menambahkan useEffect untuk memperbarui statistik ketika dimensi berubah
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

  // Memperbarui updateWarehouseDimensions untuk memperbarui statistik
  const updateWarehouseDimensions = async () => {
    // Validasi sebelum menyimpan
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

      // Bersihkan subscription sebelumnya jika ada
      unsubscribes.forEach(unsubscribe => unsubscribe());
      const newUnsubscribes = [];

      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('wasteBankId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );

      // Menggunakan onSnapshot untuk data realtime
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

  // Fungsi untuk memproses data gudang
  const processWarehouseData = (pickupsData) => {
    try {
      const wasteTypes = {};
      const wasteDetails = {};
      let totalWeight = 0;

      pickupsData.forEach(pickup => {
        if (pickup.wastes) {
          Object.entries(pickup.wastes).forEach(([type, data]) => {
            const weight = Number(data.weight) || 0;

            if (!wasteTypes[type]) {
              wasteTypes[type] = 0;
              wasteDetails[type] = [];
            }

            wasteTypes[type] += weight;
            totalWeight += weight;

            const pickupDate = pickup.completedAt?.toDate ? pickup.completedAt.toDate() : new Date(pickup.completedAt?.seconds * 1000 || 0);
            wasteDetails[type].push({
              weight: weight,
              date: pickupDate,
              volume: weight * VOLUME_CONVERSION_FACTOR,
              value: data.value || 0,
              points: data.points || 0
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

  // Tooltip component for providing additional information
  const TooltipCustom = ({ children, content }) => (
    <div className="relative flex items-start group">
      {children}
      <div className="absolute z-50 invisible w-48 p-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
        <div className="text-left">{content}</div>
        <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar
          role={userData?.role}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
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

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
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
              <li><span className="font-semibold">Distribusi Sampah</span>: abel ini menunjukkan jenis sampah berdasarkan volume terbanyak ke terkecil. Persentase menunjukkan proporsi dari total sampah yang ada.</li>
            </p>
          </InfoPanel>

          <div className="w-full mx-auto space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-6">
                <h3 className="mb-2 text-md font-medium text-zinc-500">Total Kapasitas</h3>
                <p className="text-2xl font-semibold text-zinc-800">{formatNumber(warehouseStats.totalCapacity)} m³</p>
                <p className="mt-1 text-xs text-zinc-500">Kapasitas maksimal gudang berdasarkan dimensi</p>
              </Card>
              <Card className="p-6">
                <h3 className="mb-2 text-md font-medium text-zinc-500">Penyimpanan Saat Ini</h3>
                <p className="text-2xl font-semibold text-zinc-800">{formatNumber(warehouseStats.currentStorage.toFixed(1))} m³</p>
                <p className="mt-1 text-xs text-zinc-500">Volume sampah yang saat ini disimpan di gudang</p>
              </Card>
              <Card className="p-6">
                <h3 className="mb-2 text-mdd font-medium text-zinc-500">Penggunaan</h3>
                <p className="text-2xl font-semibold text-zinc-800">{warehouseStats.usagePercentage.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-zinc-500">Persentase kapasitas gudang yang telah terpakai</p>
              </Card>
            </div>

            {/* Warehouse Dimensions Settings */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-left flex items-center gap-2">
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <Box className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="items-center ml-4 ">
                    <h2 className="text-lg font-semibold text-zinc-800">Dimensi Gudang</h2>
                    <p className="text-sm text-zinc-500">Atur ukuran gudang penyimpanan sampah</p>
                  </div>
                </div>
                <button
                  onClick={() => isEditingDimensions ? updateWarehouseDimensions() : setIsEditingDimensions(true)}
                  className="px-6 py-3 text-sm text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  {isEditingDimensions ? 'Simpan' : 'Edit'}
                </button>
              </div>

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
                        className={`block w-full bg-zinc-50 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-white pr-12
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
                      Visualisasi menunjukkan pemakaian ruang gudang berdasarkan jenis sampah, dengan warna berbeda untuk tiap jenisnya.
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
                              <div className="hidden flex items-center gap-2 pt-4">
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

              {/* Waste Distribution - Updated to sort by volume */}
              <Card className="p-6 max-h-[720px]">
                <div className="text-left flex items-center mb-6">
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
                          new Date(Math.min(...details.map(d => d.date))) : null;
                        const percentage = (volume / warehouseStats.currentStorage) * 100;

                        // Terjemahkan nama jenis sampah
                        const translateWasteType = (type) => {
                          const translations = {
                            'plastic': 'Plastik',
                            'paper': 'Kertas',
                            'organic': 'Organik',
                            'metal': 'Logam',
                            'glass': 'Kaca',
                            'electronic': 'Elektronik',
                            'fabric': 'Kain',
                            'others': 'Lainnya'
                          };

                          const lowerType = type.toLowerCase();
                          return translations[lowerType] || type.split('-').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                        };

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
                            <div>
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

            {/* Recent Collections */}
            <Card className="p-6">
              <div className="text-left flex items-center mb-6">
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
                    const totalWeight = Object.values(pickup.wastes).reduce((sum, waste) =>
                      sum + (Number(waste.weight) || 0), 0);
                    const totalVolume = totalWeight * VOLUME_CONVERSION_FACTOR;

                    return (
                      <div key={pickup.id} className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-zinc-800">{pickup.userName}</p>
                            <p className="text-sm text-zinc-500">
                              {new Date(pickup.completedAt?.seconds * 1000).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
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
                          {Object.entries(pickup.wastes).map(([type, data]) => {
                            const weight = Number(data.weight) || 0;
                            const volume = weight * VOLUME_CONVERSION_FACTOR;

                            // Terjemahkan nama jenis sampah
                            const translations = {
                              'plastic': 'Plastik',
                              'paper': 'Kertas',
                              'organic': 'Organik',
                              'metal': 'Logam',
                              'glass': 'Kaca',
                              'electronic': 'Elektronik',
                              'fabric': 'Kain',
                              'others': 'Lainnya'
                            };

                            const typeDisplay = translations[type.toLowerCase()] ||
                              type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                            return (
                              <span key={type} className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-700">
                                {typeDisplay}: {formatNumber(volume.toFixed(1))} m³
                              </span>
                            );
                          })}
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

export default Warehouse;