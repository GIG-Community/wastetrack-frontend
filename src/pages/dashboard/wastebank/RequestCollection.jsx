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
  Info
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  getDoc, 
  updateDoc, 
  doc, 
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { wasteTypes, calculateStorageFromCollections } from '../../../lib/constants';

// Helper component for information tooltips/panels
const InfoPanel = ({ title, children }) => (
  <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
    <div className="flex gap-3">
      <Info className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
      <div>
        <h3 className="mb-1 text-sm font-medium text-blue-800">{title}</h3>
        <div className="text-sm text-blue-700">{children}</div>
      </div>
    </div>
  </div>
);

const RequestCollection = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [masterBanks, setMasterBanks] = useState([]);
  const [loadingMasterBanks, setLoadingMasterBanks] = useState(true);
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
    masterBankId: '',
    masterBankName: '',
    notes: '',
    status: 'pending',
    address: userData?.profile?.address || '', // Added address field
    phone: '', // Added phone number field
    location: {
      address: userData?.profile?.address || '',
      coordinates: null
    }, // Added location field with address and coordinates
  });

  // Fetch master wastebanks - Changed to onSnapshot
  useEffect(() => {
    let unsubscribe;
    
    const fetchMasterBanks = () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_master')
        );
        
        // Using onSnapshot instead of getDocs
        unsubscribe = onSnapshot(q, (snapshot) => {
          const masterBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setMasterBanks(masterBankData);
          setLoadingMasterBanks(false);
        }, (error) => {
          console.error('Error memantau data bank sampah induk:', error);
          setLoadingMasterBanks(false);
        });
      } catch (error) {
        console.error('Error menyiapkan listener bank sampah induk:', error);
        setLoadingMasterBanks(false);
      }
    };

    fetchMasterBanks();
    
    // Cleanup function
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch completed collections - Changed to onSnapshot
  useEffect(() => {
    let unsubscribe;
    
    const fetchCollections = () => {
      if (!currentUser?.uid) return;
      
      try {
        const q = query(
          collection(db, 'pickups'),
          where('wasteBankId', '==', currentUser.uid),
          where('status', '==', 'completed'),
          where('pointsAdded', '==', true)
        );
        
        // Using onSnapshot instead of getDocs
        unsubscribe = onSnapshot(q, (snapshot) => {
          const collectionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCollections(collectionsData);
          setLoadingCollections(false);
        }, (error) => {
          console.error('Error memantau pengumpulan sampah:', error);
          setLoadingCollections(false);
        });
      } catch (error) {
        console.error('Error menyiapkan listener pengumpulan sampah:', error);
        setLoadingCollections(false);
      }
    };

    fetchCollections();
    
    // Cleanup function
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid]);

  // Fetch requests
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    let unsubscribe;

    try {
      const q = query(
        collection(db, 'masterBankRequests'),
        where('wasteBankId', '==', currentUser.uid)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
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
    } catch (error) {
      console.error("Error menyiapkan listener permintaan:", error);
      setLoadingRequests(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

      const collectionData = {
        ...formData,
        wasteBankId: currentUser.uid,
        wasteBankName: userData?.profile?.institution,
        createdAt: Timestamp.now(),
        date: Timestamp.fromDate(new Date(formData.date)),
        wastes: Object.fromEntries(
          Object.entries(formData.wasteWeights).map(([type, weight]) => [
            type,
            { 
              weight,
              points: 0,
              value: 0
            }
          ])
        ),
        wasteQuantities: Object.fromEntries(
          Object.entries(formData.wasteWeights).map(([type, weight]) => [
            type,
            Math.ceil(weight) // Convert to whole number for quantities
          ])
        ),
        status: 'pending',
        completionCallback: {
          collectionIds: collectionUpdates
        }
      };

      await addDoc(collection(db, 'masterBankRequests'), collectionData);
      setSuccess(true);
      setFormData({
        date: '',
        time: '',
        wasteTypes: [],
        wasteWeights: {},
        masterBankId: '',
        masterBankName: '',
        notes: '', // Enhanced with weight reduction logic from Cloud Function
        status: 'pending',
        address: userData?.profile?.address || '', // Reset address field
        phone: '', // Reset phone number field
        location: {
          address: userData?.profile?.address || '',
          coordinates: null
        }, // Reset location field
      });
      setStep(1);
    } catch (err) {
      setError('Gagal menjadwalkan pengambilan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update request status  
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const requestRef = doc(db, 'masterBankRequests', requestId);
      const requestSnapshot = await getDoc(requestRef);
      const requestData = requestSnapshot.data();
      const previousStatus = requestData.status;

      await updateDoc(requestRef, { 
        status: newStatus, 
        updatedAt: Timestamp.now() 
      });

      // If status changed to completed
      if (previousStatus !== 'completed' && newStatus === 'completed') {
        const { completionCallback } = requestData;
        if (completionCallback && completionCallback.collectionIds && completionCallback.collectionIds.length > 0) {
          console.log(`Memproses ${completionCallback.collectionIds.length} pembaruan koleksi`);

          const batch = writeBatch(db);
          for (const collection of completionCallback.collectionIds) {
            const pickupRef = doc(db, 'pickups', collection.id);
            const pickupDoc = await getDoc(pickupRef);
            if (!pickupDoc.exists()) {
              console.log(`Pengambilan ${collection.id} tidak ditemukan`);
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

  // Translate status to Bahasa Indonesia
  const translateStatus = (status) => {
    const statusMap = {
      'pending': 'Menunggu',
      'processing': 'Sedang Diproses',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="flex h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out overflow-auto
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Truck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Permintaan Pengambilan</h1>
                <p className="text-sm text-zinc-500">Jadwalkan pengambilan dari bank sampah induk</p>
              </div>
            </div>
          </div>

          {/* Information Panel */}
          <InfoPanel title="Tentang Permintaan Pengambilan">
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
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
              <div className="absolute left-0 flex justify-between w-full -top-2">
                {['Bank Sampah Induk', 'Jadwal', 'Detail Sampah', 'Konfirmasi']
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
            <div className="flex justify-between px-1 text-xs text-gray-600">
              {['Bank Sampah Induk', 'Jadwal', 'Detail Sampah', 'Konfirmasi'].map((text) => (
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
            {/* Step 1: Master Bank Selection */}
            {step === 1 && (
              <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-zinc-200">
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-semibold text-gray-800">Pilih Bank Sampah Induk</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Pilih bank sampah induk untuk pengambilan</p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {loadingMasterBanks ? (
                    <div className="flex justify-center p-6">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <span className="ml-2 text-gray-600">Memuat daftar bank sampah induk...</span>
                    </div>
                  ) : (
                    masterBanks.length === 0 ? (
                      <div className="p-8 text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <h3 className="font-medium text-gray-700">Tidak ada bank sampah induk ditemukan</h3>
                        <p className="mt-1 text-sm text-gray-500">Silakan hubungi administrator untuk informasi lebih lanjut</p>
                      </div>
                    ) : (
                      masterBanks.map((bank) => (
                        <label
                          key={bank.id}
                          className={`flex items-start p-6 cursor-pointer hover:bg-emerald-50/50 transition-all
                            ${formData.masterBankId === bank.id ? 'bg-emerald-50' : ''}`}
                        >
                          <input
                            type="radio"
                            name="masterBank"
                            className="sr-only"
                            checked={formData.masterBankId === bank.id}
                            onChange={() => setFormData({
                              ...formData,
                              masterBankId: bank.id,
                              masterBankName: bank.profile?.institution || 'Bank Sampah Tanpa Nama'
                            })}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl transition-colors duration-300
                                  ${formData.masterBankId === bank.id ? 'bg-emerald-100' : 'bg-gray-100'}`}
                                >
                                  <Building2 className={`w-6 h-6 
                                    ${formData.masterBankId === bank.id ? 'text-emerald-600' : 'text-gray-600'}`} 
                                  />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {bank.profile?.institution || 'Bank Sampah Tanpa Nama'}
                                  </h3>
                                  <p className="text-sm text-gray-500">{bank.profile?.address || 'Alamat tidak tersedia'}</p>
                                </div>
                              </div>
                              {formData.masterBankId === bank.id && (
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
                  <div className="p-6 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                      <h2 className="text-xl font-semibold text-gray-800">Pilih Tanggal</h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Pilih tanggal pengambilan yang diinginkan</p>
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
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-500" />
                      <h2 className="text-xl font-semibold text-gray-800">Pilih Waktu</h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Pilih rentang waktu pengambilan yang diinginkan</p>
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
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-semibold text-gray-800">Pilih Jenis Sampah</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Pilih jenis sampah dari penyimpanan Anda</p>
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
                                  className="w-32 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">Tinjau Permintaan Pengambilan</h2>
                  <p className="mt-1 text-sm text-gray-500">Silakan konfirmasi detail permintaan Anda</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Master Bank Info */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Bank Sampah Induk Terpilih</p>
                      <p className="font-medium text-gray-900">{formData.masterBankName}</p>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Jadwal</p>
                      <p className="text-gray-900">
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Package className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Sampah Terpilih</p>
                      <div className="mt-2 space-y-2">
                        {formData.wasteTypes.map(typeId => {
                          const waste = availableWasteTypes.find(w => w.id === typeId);
                          return waste ? (
                            <div key={typeId} className="flex justify-between text-gray-700">
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Phone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Informasi Kontak</p>
                      <div className="mt-2 space-y-3">
                        <div>
                          <label htmlFor="bankName" className="block mb-1 text-sm text-gray-600">Nama Bank Sampah</label>
                          <input
                            id="bankName"
                            type="text"
                            value={userData?.profile?.institution || ''}
                            className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block mb-1 text-sm text-gray-600">Nomor Telepon</label>
                          <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Masukkan nomor telepon kontak"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="address" className="block mb-1 text-sm text-gray-600">Alamat</label>
                          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                            <textarea
                              id="address"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              rows="2"
                              placeholder="Masukkan alamat pengambilan"
                              required
                            />
                            <button
                              type="button"
                              onClick={getCurrentLocation}
                              className="flex items-center flex-shrink-0 gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
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
                  <div className="flex items-start gap-4">
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
                      {formData.notes && (
                        <>
                          <p className="mt-2 text-sm font-medium text-gray-500">Catatan Tambahan</p>
                          <p className="text-gray-700">{formData.notes}</p>
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
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="px-6 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
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
                        if (!formData.masterBankId) {
                          validationError = 'Silakan pilih bank sampah induk';
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
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto flex items-center gap-2 transition-colors focus:ring-4 focus:ring-emerald-300"
                >
                  Lanjutkan
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button" // Changed from type="submit"
                  onClick={handleSubmit} // Explicitly call handleSubmit
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto flex items-center gap-2 transition-colors focus:ring-4 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      masterBankId: '',
                      masterBankName: '',
                      notes: '',
                      status: 'pending',
                      address: userData?.profile?.address || '', // Reset address field
                      phone: '', // Reset phone number field
                      location: {
                        address: userData?.profile?.address || '',
                        coordinates: null
                      }, // Reset location field
                    });
                  }}
                  className="w-full px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300"
                >
                  Buat Permintaan Lain
                </button>
              </div>
            </div>
          )}

          {/* Debug Panel - Request Status */}
          <div className="mt-8">
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
                            Permintaan ke: {request.masterBankName}
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
                            Status Saat Ini: <span className={`font-medium ${
                              request.status === 'completed' ? 'text-emerald-600' :
                              request.status === 'pending' ? 'text-amber-600' :
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
                            <option value="processing">Sedang Diproses</option>
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

export default RequestCollection;
