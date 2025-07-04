import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  Calendar,
  Clock,
  Building2,
  Truck,
  Package,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  Navigation,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { wasteTypes, calculateStorageFromCollections } from '../../../lib/constants';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

// Add a utility function to translate status to Indonesian
const translateStatus = (status) => {
  switch (status) {
    case 'completed': return 'Selesai';
    case 'pending': return 'Menunggu';
    case 'assigned': return 'Ditugaskan';
    case 'cancelled': return 'Dibatalkan';
    case 'in_progress': return 'Dalam Proses';
    case 'processing': return 'Diproses';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
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

const MasterRequestCollection = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [industries, setIndustries] = useState([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false); // Added for geolocation

  // Form data
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    wasteTypes: [],
    wasteWeights: {}, // Changed from wasteQuantities to wasteWeights
    industryId: '',
    industryName: '',
    notes: '',
    status: 'pending',
    address: userData?.profile?.address || '', // Added address field
    phone: userData?.profile?.phone || '', // Added phone number field
    location: {
      address: userData?.profile?.address || '',
      coordinates: null
    }, // Added location field with address and coordinates
  });

  // Fetch industries
  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'industry')
        );
        const snapshot = await getDocs(q);
        const industriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setIndustries(industriesData);
      } catch (error) {
        console.error('Error memuat data industri:', error);
      } finally {
        setLoadingIndustries(false);
      }
    };

    fetchIndustries();
  }, []);

  // Fetch completed collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const q = query(
          collection(db, 'masterBankRequests'),
          where('masterBankId', '==', currentUser.uid),
          where('status', '==', 'completed'),
        );
        const snapshot = await getDocs(q);
        const collectionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCollections(collectionsData);
      } catch (error) {
        console.error('Error memuat koleksi sampah:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, [currentUser.uid]);

  // Fetch requests - updated to use industryRequests collection
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'industryRequests'),
      where('masterBankId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);
      setLoadingRequests(false);
    }, (error) => {
      console.error("Error memantau permintaan:", error);
      setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Calculate storage from collections - modified to use wastes field
  const storage = useMemo(() => {
    if (!collections.length) return {};

    return collections.reduce((acc, collection) => {
      if (collection.wastes) {
        Object.entries(collection.wastes).forEach(([type, data]) => {
          const weight = Number(data.weight) || 0;
          if (!acc[type]) acc[type] = 0;
          acc[type] += weight;
        });
      }
      return acc;
    }, {});
  }, [collections]);

  // Time slots
  const timeSlots = [
    { time: '08:00-10:00', available: true },
    { time: '10:00-12:00', available: true },
    { time: '13:00-15:00', available: true },
    { time: '15:00-17:00', available: true }
  ];

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Fetch address from coordinates using OpenStreetMap Nominatim API
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            setFormData(prev => ({
              ...prev,
              address: data.display_name,
              location: {
                address: data.display_name,
                coordinates: { lat: latitude, lng: longitude }
              }
            }));
          } catch (error) {
            console.error('Error mendapatkan alamat:', error);
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error('Error geolokasi:', error);
          setGettingLocation(false);
        }
      );
    } else {
      setError("Geolokasi tidak didukung oleh browser Anda");
      setGettingLocation(false);
    }
  };

  // Handle waste weight change
  const handleWeightChange = (typeId, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      wasteWeights: {
        ...prev.wasteWeights,
        [typeId]: Math.max(0, Math.min(
          storage[typeId] || 0,
          numValue
        ))
      }
    }));
  };

  // Handle form submission - updated to handle automatic weight reduction
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const wastesToReduce = {};
      let remainingWeights = { ...formData.wasteWeights };
      const sortedCollections = [...collections].sort((a, b) =>
        (a.completedAt?.seconds || 0) - (b.completedAt?.seconds || 0)
      );

      const collectionUpdates = [];

      for (const collection of sortedCollections) {
        if (Object.values(remainingWeights).every(w => w <= 0)) break;

        const collectionUpdate = {
          id: collection.id,
          wastes: {}
        };

        // Check both wastes and wasteQuantities
        Object.entries(collection.wastes || {}).forEach(([type, data]) => {
          if (!formData.wasteTypes.includes(type)) return;

          const requestedWeight = remainingWeights[type] || 0;
          if (requestedWeight <= 0) return;

          const availableWeight = Number(data.weight) || 0;
          const weightToReduce = Math.min(availableWeight, requestedWeight);

          if (weightToReduce > 0) {
            collectionUpdate.wastes[type] = {
              weightToReduce,
              // Include other waste data for reference
              points: data.points || 0,
              value: data.value || 0
            };
            remainingWeights[type] -= weightToReduce;
          }
        });

        if (Object.keys(collectionUpdate.wastes).length > 0) {
          collectionUpdates.push(collectionUpdate);
        }
      }

      // Improved request data structure for industryRequests
      const collectionData = {
        ...formData,
        masterBankId: currentUser.uid,
        masterBankName: userData?.profile?.institution || 'Bank Sampah Tanpa Nama',
        createdAt: Timestamp.now(),
        date: Timestamp.fromDate(new Date(formData.date)),
        wastes: Object.fromEntries(
          Object.entries(formData.wasteWeights).filter(([_, weight]) => weight > 0).map(([type, weight]) => [
            type,
            {
              weight,
              points: 0,
              value: 0
            }
          ])
        ),
        wasteQuantities: Object.fromEntries(
          Object.entries(formData.wasteWeights).filter(([_, weight]) => weight > 0).map(([type, weight]) => [
            type,
            Math.ceil(weight) // Convert to whole number for quantities
          ])
        ),
        status: 'pending',
        completionCallback: {
          collectionIds: collectionUpdates
        },
        // Adding additional useful fields
        updatedAt: Timestamp.now(),
        requestType: 'industry',
        location: formData.location || { address: formData.address, coordinates: null },
        phone: formData.phone || userData?.profile?.phone || ''
      };

      // Submit to industryRequests collection
      await addDoc(collection(db, 'industryRequests'), collectionData);
      setSuccess(true);
      setFormData({
        date: '',
        time: '',
        wasteTypes: [],
        wasteWeights: {},
        industryId: '',
        industryName: '',
        notes: '',
        status: 'pending',
        address: userData?.profile?.address || '',
        phone: userData?.profile?.phone || '',
        location: {
          address: userData?.profile?.address || '',
          coordinates: null
        }
      });
      setStep(1);
    } catch (err) {
      setError('Gagal menjadwalkan pengambilan: ' + (err.message || 'Kesalahan tidak diketahui'));
      console.error('Error mengirim permintaan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update request status - modified to correctly handle industryRequests
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      setLoading(true);
      const requestRef = doc(db, 'industryRequests', requestId);
      const requestSnapshot = await getDoc(requestRef);

      if (!requestSnapshot.exists()) {
        setError("Permintaan tidak ditemukan");
        return;
      }

      const requestData = requestSnapshot.data();
      const previousStatus = requestData.status;

      // Update the status first
      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // If status changed to completed
      if (previousStatus !== 'completed' && newStatus === 'completed') {
        const { completionCallback } = requestData;
        if (completionCallback && completionCallback.collectionIds && completionCallback.collectionIds.length > 0) {
          // console.log(`Memproses ${completionCallback.collectionIds.length} pembaruan koleksi`);

          const batch = writeBatch(db);
          for (const collection of completionCallback.collectionIds) {
            const pickupRef = doc(db, 'masterBankRequests', collection.id);
            const pickupDoc = await getDoc(pickupRef);
            if (!pickupDoc.exists()) {
              // console.log(`Pengambilan ${collection.id} tidak ditemukan`);
              continue;
            }

            const pickupData = pickupDoc.data();
            const updatedWastes = { ...pickupData.wastes };
            const updatedWasteWeights = { ...pickupData.wasteWeights || {} };

            // Process each waste type that needs reduction
            Object.entries(collection.wastes || {}).forEach(([type, data]) => {
              const weightToReduce = data.weightToReduce || 0;
              if (weightToReduce > 0 && updatedWastes[type]) {
                const currentWeight = Number(updatedWastes[type].weight) || 0;
                const newWeight = Math.max(0, currentWeight - weightToReduce);
                updatedWastes[type] = { ...updatedWastes[type], weight: newWeight };

                // Update wasteWeights while preserving other fields
                if (updatedWasteWeights !== undefined) {
                  const currentWeightValue = Number(updatedWasteWeights[type]) || 0;
                  updatedWasteWeights[type] = Math.max(0, currentWeightValue - weightToReduce);
                }
              }
            });

            batch.update(pickupRef, {
              wastes: updatedWastes,
              wasteWeights: updatedWasteWeights,
              updatedAt: Timestamp.now()
            });
          }

          await batch.commit();
          console.log('Berhasil memperbarui berat pengambilan');
        }
      }
    } catch (error) {
      console.error("Error memperbarui status:", error);
      setError("Gagal memperbarui status permintaan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Available waste types (showing only what's in storage)
  const availableWasteTypes = useMemo(() => {
    if (loadingCollections) return [];

    return Object.entries(storage)
      .filter(([_, quantity]) => quantity > 0)
      .map(([typeId, quantity]) => {
        // Find the waste type details
        for (const category of wasteTypes) {
          if (category.subcategories) {
            for (const subcat of category.subcategories) {
              const found = subcat.types.find(t => t.id === typeId);
              if (found) return { ...found, currentStock: quantity };
            }
          } else {
            const found = category.types.find(t => t.id === typeId);
            if (found) return { ...found, currentStock: quantity };
          }
        }
        return null;
      })
      .filter(Boolean);
  }, [storage, loadingCollections]);

  return (
    <div className="flex h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out overflow-auto
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Permintaan Pengambilan</h1>
              <p className="text-sm text-zinc-500">Jadwalkan pengambilan ke industri pengolahan</p>
            </div>
          </div>

          {/* Information Panel */}
          <InfoPanel title="Informasi">
            <p>
              Halaman ini memungkinkan Anda untuk meminta pengambilan sampah dari penyimpanan Anda ke bank sampah induk.
              Data akan diperbarui secara real-time. Ikuti langkah-langkah berikut untuk membuat permintaan:
            </p>
            <ol className="mt-2 ml-4 list-decimal">
              <li>Pilih bank sampah induk tujuan</li>
              <li>Tentukan jadwal pengambilan</li>
              <li>Pilih jenis sampah yang akan diambil</li>
              <li>Konfirmasi detail permintaan</li>
            </ol>
          </InfoPanel>

          {/* Error Display */}
          {error && (
            <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="relative mb-4">
              <div className="w-full h-2 rounded-full bg-zinc-200">
                <div
                  className="h-2 transition-all duration-300 rounded-full bg-emerald-500"
                  style={{ width: `${((step - 1) / (4 - 1)) * 100}%` }}
                />
              </div>
              <div className="absolute left-0 flex justify-between w-full -top-2">
                {['Industri Pengolahan', 'Jadwal', 'Detail Sampah', 'Konfirmasi']
                  .map((text, index) => (
                    <div
                      key={text}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                        transition-all duration-300 -ml-3 first:ml-0 last:ml-0
                        ${step > index + 1 ? 'bg-emerald-500 text-white' :
                          step === index + 1 ? 'bg-emerald-500 text-white' :
                            'bg-zinc-200 text-zinc-500'}`}
                    >
                      {step > index + 1 ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="hidden flex justify-between px-1 text-xs text-gray-600">
              {['Industri Pengolahan', 'Jadwal', 'Detail Sampah', 'Konfirmasi'].map((text) => (
                <div key={text} className="flex-1 text-center">{text}</div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              // Prevent form submission unless explicitly triggered from submit button
              e.preventDefault();
            }}
            className="space-y-6"
          >
            {/* Step 1: Industry Selection */}
            {step === 1 && (
              <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                <div className="p-6 border-b border-zinc-100 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-800">Pilih Industri Pengolahan</h2>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">Pilih industri pengolahan untuk pengambilan</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {loadingIndustries ? (
                    <div className="flex justify-center p-6">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <span className="ml-2 text-gray-600">Memuat daftar industri pengolahan...</span>
                    </div>
                  ) : (
                    industries.length === 0 ? (
                      <div className="p-8 text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <h3 className="font-medium text-gray-700">Tidak ada industri pengolahan ditemukan</h3>
                        <p className="mt-1 text-sm text-gray-500">Silakan hubungi administrator untuk informasi lebih lanjut</p>
                      </div>
                    ) : (
                      industries.map((industry) => (
                        <label
                          key={industry.id}
                          className={`flex items-start text-left p-6 cursor-pointer hover:bg-emerald-50/50 transition-all
                            ${formData.industryId === industry.id ? 'bg-emerald-50' : ''}`}
                        >
                          <input
                            type="radio"
                            name="industry"
                            className="sr-only"
                            checked={formData.industryId === industry.id}
                            onChange={() => setFormData({
                              ...formData,
                              industryId: industry.id,
                              industryName: industry.profile?.institution || 'Industri Tanpa Nama'
                            })}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl transition-colors duration-300
                                  ${formData.industryId === industry.id ? 'bg-emerald-100' : 'bg-gray-100'}`}
                                >
                                  <Building2 className={`w-6 h-6 
                                    ${formData.industryId === industry.id ? 'text-emerald-600' : 'text-gray-600'}`}
                                  />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {industry.profile?.institution || 'Industri Tanpa Nama'}
                                  </h3>
                                  <p className="text-sm text-gray-500">{industry.profile?.location?.address || 'Alamat tidak tersedia'}</p>
                                </div>
                              </div>
                              {formData.industryId === industry.id && (
                                <div className="bg-emerald-500 text-white rounded-full p-1.5">
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))
                    )
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Date Selection */}
                <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="p-6 border-b border-zinc-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-800">Pilih Tanggal</h2>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">Pilih tanggal pengambilan yang diinginkan</p>
                  </div>
                  <div className="p-6">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Time Selection */}
                <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="p-6 border-b border-zinc-100 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-800">Pilih Waktu</h2>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">Pilih rentang waktu pengambilan yang diinginkan</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {timeSlots.map(({ time, available }) => (
                        <button
                          key={time}
                          type="button"
                          disabled={!available}
                          onClick={() => setFormData({ ...formData, time })}
                          className={`p-3 rounded-lg text-sm font-medium transition-colors
                            ${formData.time === time
                              ? 'bg-emerald-500 text-white'
                              : available
                                ? 'bg-gray-100 hover:bg-emerald-100 text-gray-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Waste Details - Modified for weight input */}
            {step === 3 && (
              <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                <div className="p-6 border-b border-zinc-100 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-800">Pilih Jenis Sampah</h2>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">Pilih jenis sampah dari penyimpanan Anda</p>
                </div>
                <div className="p-6">
                  {loadingCollections ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <span className="ml-2 text-gray-600">Memuat data penyimpanan sampah...</span>
                    </div>
                  ) : (
                    availableWasteTypes.length === 0 ? (
                      <div className="py-8 text-center">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <h3 className="font-medium text-gray-600">Tidak Ada Sampah di Penyimpanan</h3>
                        <p className="mt-1 text-sm text-gray-500">Penyimpanan Anda saat ini kosong</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {availableWasteTypes.map((waste) => (
                          <div key={waste.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={formData.wasteTypes.includes(waste.id)}
                                  onChange={() => {
                                    const newTypes = formData.wasteTypes.includes(waste.id)
                                      ? formData.wasteTypes.filter(t => t !== waste.id)
                                      : [...formData.wasteTypes, waste.id];
                                    setFormData(prev => ({
                                      ...prev,
                                      wasteTypes: newTypes,
                                      wasteWeights: {
                                        ...prev.wasteWeights,
                                        [waste.id]: newTypes.includes(waste.id) ? 0 : undefined
                                      }
                                    }));
                                  }}
                                  className="w-4 h-4 border-gray-300 rounded text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="font-medium text-gray-700">{waste.name}</span>
                              </label>
                              <span className="text-sm text-gray-500">
                                Tersedia: {waste.currentStock.toFixed(1)} kg
                              </span>
                            </div>
                            {formData.wasteTypes.includes(waste.id) && (
                              <div className="flex items-center gap-3 mt-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  max={storage[waste.id] || 0}
                                  value={formData.wasteWeights[waste.id] || ''}
                                  onChange={(e) => handleWeightChange(waste.id, e.target.value)}
                                  className="w-32 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-sm"
                                  placeholder="Berat dalam kg"
                                />
                                <span className="text-sm text-gray-500">kg</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                <div className="p-6 border-b border-zinc-100 flex flex-col items-center justify-center text-center">
                  <h2 className="text-xl font-semibold text-gray-800">Tinjau Permintaan Pengambilan</h2>
                  <p className="mt-3 text-sm text-gray-500">Silakan konfirmasi detail permintaan Anda</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Industry Info */}
                  <div className="flex flex text-left items-start gap-4 items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Industri Pengolahan Terpilih</p>
                      <p className="text-gray-900 text-sm font-semibold">{formData.industryName}</p>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex text-left items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Jadwal</p>
                      <p className="text-gray-900 text-sm font-semibold">
                        {new Date(formData.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {' pukul '}
                        {formData.time}
                      </p>
                    </div>
                  </div>

                  {/* Waste Details */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Sampah Terpilih</p>
                      <div className="mt-2 space-y-2 text-sm text-gray-900 font-semibold">
                        {formData.wasteTypes.map(typeId => {
                          const waste = availableWasteTypes.find(w => w.id === typeId);
                          return waste ? (
                            <div key={typeId} className="flex justify-between">
                              <span>{waste.name}</span>
                              <span>{formData.wasteWeights[typeId]} kg</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Informasi Kontak</p>
                      <div className="mt-2 space-y-3">
                        <div>
                          <label htmlFor="bankName" className="block mb-1 text-left text-sm text-gray-500">Nama Bank Sampah</label>
                          <input
                            id="bankName"
                            type="text"
                            value={userData?.profile?.institution || ''}
                            className="w-full p-3 border text-sm border-gray-200 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block mb-1 text-sm text-gray-500">Nomor Telepon</label>
                          <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-3 border text-sm text-gray-900 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Masukkan nomor telepon kontak"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="address" className="block mb-1 text-sm text-gray-500">Alamat</label>
                          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                            <textarea
                              id="address"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              className="w-full p-3 text-sm border text-gray-900 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              rows="2"
                              placeholder="Masukkan alamat pengambilan"
                              required
                            />
                            <button
                              type="button"
                              onClick={getCurrentLocation}
                              className="flex items-center text-sm flex-shrink-0 gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                            >
                              {gettingLocation ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Navigation className="w-4 h-4" />
                              )}
                              Gunakan Lokasi Saat Ini
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="hidden flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Lokasi Pengambilan</p>
                      <p className="text-gray-900">
                        {typeof formData.address === 'object' ? formData.address.address : formData.address}
                      </p>
                      {formData.phone && (
                        <>
                          <p className="mt-2 text-sm font-medium text-gray-500">Nomor Kontak</p>
                          <p className="text-gray-700">{formData.phone}</p>
                        </>
                      )}
                      {formData.location && formData.location.coordinates && (
                        <p className="mt-1 text-xs text-gray-500">
                          Koordinat: {formData.location.coordinates.lat.toFixed(6)}, {formData.location.coordinates.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-medium text-gray-500">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full text-sm p-3 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows="3"
                      placeholder="Instruksi khusus atau detail lain tentang pengambilan..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 text-sm text-zinc-700 rounded-lg hover:bg-zinc-200 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Kembali
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    let canProceed = true;
                    let validationError = '';

                    switch (step) {
                      case 1:
                        if (!formData.industryId) {
                          validationError = 'Silakan pilih industri pengolahan';
                          canProceed = false;
                        }
                        break;
                      case 2:
                        if (!formData.date || !formData.time) {
                          validationError = 'Silakan pilih tanggal dan waktu';
                          canProceed = false;
                        }
                        break;
                      case 3:
                        if (formData.wasteTypes.length === 0) {
                          validationError = 'Silakan pilih minimal satu jenis sampah';
                          canProceed = false;
                        } else if (formData.wasteTypes.some(type => !formData.wasteWeights[type])) {
                          validationError = 'Silakan masukkan berat untuk semua jenis sampah yang dipilih';
                          canProceed = false;
                        }
                        break;
                    }

                    if (!canProceed) {
                      setError(validationError);
                      return;
                    }
                    setError('');
                    setStep(step + 1);
                  }}
                  className="px-6 py-3 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto flex items-center gap-2 transition-colors focus:ring-4 focus:ring-emerald-300"
                >
                  Lanjutkan
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button" // Changed from type="submit"
                  onClick={handleSubmit} // Explicitly call handleSubmit
                  disabled={loading}
                  className="px-6 py-3 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto flex items-center gap-2 transition-colors focus:ring-4 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Kirim Permintaan'
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Success Modal */}
          {success && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="w-full max-w-md p-6 bg-white rounded-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-800">Permintaan Terkirim!</h3>
                    <p className="text-zinc-500">Permintaan pengambilan Anda telah berhasil dikirim.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSuccess(false);
                    // Reset form
                    setFormData({
                      date: '',
                      time: '',
                      wasteTypes: [],
                      wasteWeights: {},
                      industryId: '',
                      industryName: '',
                      notes: '',
                      status: 'pending',
                      address: userData?.profile?.address || '',
                      phone: userData?.profile?.phone || '',
                      location: {
                        address: userData?.profile?.address || '',
                        coordinates: null
                      }
                    });
                  }}
                  className="w-full px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300"
                >
                  Buat Permintaan Lain
                </button>
              </div>
            </div>
          )}

          {/* Debug Panel - Request Status - Updated to use industryRequests collection */}
          <div className="hidden mt-8">
            <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Panel Status Permintaan</h2>

              {loadingRequests ? (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-gray-600">Memuat data permintaan...</span>
                </div>
              ) : requests.length === 0 ? (
                <p className="text-gray-500">Tidak ada permintaan ditemukan</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-700">
                            Permintaan dari: {request.masterBankName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Tanggal: {new Date(request.date.seconds * 1000).toLocaleDateString('id-ID')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Waktu: {request.time}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-600">Jenis Sampah:</p>
                            {Object.entries(request.wastes || {}).map(([type, data]) => (
                              <p key={type} className="text-sm text-gray-500">
                                {type}: {data.weight} kg
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            Status Saat Ini: <span className={`font-medium ${request.status === 'completed' ? 'text-emerald-600' :
                              request.status === 'pending' ? 'text-amber-600' :
                                request.status === 'in_progress' ? 'text-blue-600' :
                                  request.status === 'assigned' ? 'text-blue-600' :
                                    request.status === 'cancelled' ? 'text-red-600' :
                                      'text-gray-600'
                              }`}>{translateStatus(request.status)}</span>
                          </p>
                          <select
                            value={request.status}
                            onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                            className="block w-full text-sm border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="pending">Menunggu</option>
                            <option value="assigned">Ditugaskan</option>
                            <option value="in_progress">Dalam Proses</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterRequestCollection;