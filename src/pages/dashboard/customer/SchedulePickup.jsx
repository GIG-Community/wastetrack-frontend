import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Calendar,
  Clock, 
  MapPin, 
  Package, 
  Trash2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  Navigation,
  Loader2,
  Building2,
  Check,
  Star,
  Truck,
  ArrowRight,
  ArrowLeft,
  Phone,
  Recycle,
  Trophy,
  Timer,
  Trees
} from 'lucide-react';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Swal from 'sweetalert2';

const SchedulePickup = () => {
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [loadingWasteBanks, setLoadingWasteBanks] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    deliveryType: '', // 'pickup' or 'self-delivery'
    date: '',
    time: '',
    wasteTypes: [],
    wasteQuantities: {}, // Store quantities per waste type
    location: userData?.profile?.address || '',
    phone: '',
    coordinates: null,
    wasteBankId: '',
    wasteBankName: '',
    notes: '',
  });

  // Add/Update the calculateDistance function 
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    // Convert coordinates from degrees to radians
    const lat1Rad = lat1 * Math.PI/180;
    const lat2Rad = lat2 * Math.PI/180;
    const deltaLat = (lat2 - lat1) * Math.PI/180;
    const deltaLon = (lon2 - lon1) * Math.PI/180;
    
    // Haversine formula
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) + 
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  // Fetch waste banks - Menggunakan perhitungan jarak
  useEffect(() => {
    const fetchWasteBanks = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin')
        );
        const snapshot = await getDocs(q);
        let wasteBankData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          distance: null // Tambahkan properti distance
        }));
        
        // Jika ada koordinat pengguna, hitung jarak untuk setiap bank sampah
        if (formData.coordinates) {
          wasteBankData = wasteBankData.map(bank => {
            const bankCoords = bank.profile?.location?.coordinates;
            if (bankCoords) {
              const distance = calculateDistance(
                formData.coordinates.lat,
                formData.coordinates.lng,
                bankCoords.lat,
                bankCoords.lng
              );
              return { ...bank, distance };
            }
            return bank;
          });

          // Urutkan bank sampah berdasarkan jarak
          wasteBankData.sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
        }
        
        setWasteBanks(wasteBankData);
      } catch (error) {
        console.error('Error fetching waste banks:', error);
      } finally {
        setLoadingWasteBanks(false);
      }
    };

    fetchWasteBanks();
  }, [formData.coordinates]); // Tambahkan coordinates sebagai dependency

  // Available waste types with detailed categories
  const wasteTypes = [
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

  // Time slots with 2-hour intervals
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
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            setFormData(prev => ({
              ...prev,
              location: data.display_name,
              coordinates: { lat: latitude, lng: longitude }
            }));
          } catch (error) {
            console.error('Error getting address:', error);
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error('Error:', error);
          setGettingLocation(false);
        }
      );
    }
  };

  // Handle waste quantity change
  const handleQuantityChange = (typeId, change) => {
    setFormData(prev => {
      const currentQuantity = prev.wasteQuantities[typeId] || 0;
      const newQuantity = Math.max(0, Math.min(10, currentQuantity + change));
  
      // Copy existing waste types and quantities
      const updatedWasteTypes = [...prev.wasteTypes];
      const updatedWasteQuantities = { ...prev.wasteQuantities };
  
      if (newQuantity === 0) {
        // Delete waste type if quantity is 0
        const index = updatedWasteTypes.indexOf(typeId);
        if (index > -1) updatedWasteTypes.splice(index, 1);
        delete updatedWasteQuantities[typeId];
      } else {
        // Still keep the waste type in the list
        updatedWasteQuantities[typeId] = newQuantity;
      }
  
      return {
        ...prev,
        wasteTypes: updatedWasteTypes,
        wasteQuantities: updatedWasteQuantities
      };
    });
  };  

  // Calculate total amount
  const calculateTotal = () => {
    return formData.wasteTypes.reduce((acc, typeId) => {
      const waste = wasteTypes.find(w => w.id === typeId);
      const quantity = formData.wasteQuantities[typeId] || 0;
      return acc + (waste.price * quantity);
    }, 0);
  };

  // Format phone number as user types (Indonesian format)
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 5) return phoneNumber;
    if (phoneNumberLength < 9) {
      return `${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;
    }
    return `${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4, 8)}-${phoneNumber.slice(8, 12)}`;
  };

  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formattedPhone });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const pickupData = {
        ...formData,
        userId: currentUser.uid,
        userName: userData?.profile?.fullName,
        status: 'pending',
        createdAt: Timestamp.now(),
        date: Timestamp.fromDate(new Date(formData.date))
      };

      await addDoc(collection(db, 'pickups'), pickupData);
      setSuccess(true);
      setFormData({
        deliveryType: '',
        date: '',
        time: '',
        wasteTypes: [],
        wasteQuantities: {}, // New: Store quantities per waste type
        location: userData?.profile?.address || '',
        phone: '',
        coordinates: null,
        wasteBankId: '',
        wasteBankName: '',
        notes: '', // New: Additional notes for pickup location
      });
      setStep(1);
    } catch (err) {
      setError('Failed to schedule pickup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWasteDetails = (typeId) => {
    for (const category of wasteTypes) {
      if (category.subcategories) {
        for (const subcat of category.subcategories) {
          const found = subcat.types.find(t => t.id === typeId);
          if (found) return found;
        }
      } else {
        const found = category.types.find(t => t.id === typeId);
        if (found) return found;
      }
    }
    return null;
  };

  // Handle success message
  useEffect(() => {
    if (success) {
      Swal.fire({
        icon: 'success',
        title: 'Jadwal Berhasil Dibuat!',
        text: 'Penjemputan sampah Anda telah berhasil dijadwalkan.',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Yeay!',
        customClass: {
          popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
          title: 'text-xl sm:text-2xl font-semibold text-gray-800',
          htmlContainer: 'text-sm sm:text-base text-gray-600',
          confirmButton: 'text-sm sm:text-base'
        },
        // Mencegah perubahan padding pada body
        padding: '1em',
        heightAuto: false,
        scrollbarPadding: false
      }).then(() => {
        setSuccess(false);
        setFormData({
          deliveryType: '',
          date: '',
          time: '',
          wasteTypes: [],
          wasteQuantities: {},
          location: userData?.profile?.address || '',
          phone: '',
          coordinates: null,
          wasteBankId: '',
          wasteBankName: '',
          notes: '',
        });
      });
    }
  }, [success]);
  

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-4 mb-8 text-white bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl">
        <h1 className="mb-2 text-lg sm:text-2xl font-bold">Setor Sampah</h1>
        <p className="text-sm sm:text-md text-emerald-50">Mari kami bantu mengelola sampah Anda secara berkelanjutan</p>
      </div>

      {/* Steps indicator with progress bar */}
      <div>
        {/* Progress bar */}
        <div className="relative mb-8">
          <div className="w-full h-1 sm:h-2 bg-gray-200 rounded-full">
            <div
              className="h-1 sm:h-2 transition-all duration-300 rounded-full bg-emerald-500"
              style={{
                width: `${((step - 1) / ((formData.deliveryType === 'pickup' ? 6 : 4) - 1)) * 100}%`
              }}              
            />
          </div>
          <div className="absolute left-0 flex justify-between w-full -top-2">
            {['Delivery', 'WasteBank', 'Schedule', 'Details', 'Location', 'Confirm']
              .slice(0, formData.deliveryType === 'pickup' ? 6 : 4)
              .map((text, index) => (
                <div
                  key={text}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-sm
                    transition-all duration-300 -ml-3 first:ml-0 last:ml-0
                    ${step > index + 1 ? 'bg-emerald-500 text-white' :
                    step === index + 1 ? 'bg-emerald-500 text-white' :
                    'bg-gray-200 text-gray-500'}`}
                    style={{
                      left: `${(index / ((formData.deliveryType === 'pickup' ? 6 : 4) - 1)) * 100}%`
                    }}                    
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

        {/* Step labels */}
        <div className="hidden flex justify-between px-1 text-[10px] text-gray-600">
          {['Pengiriman', 'Bank Sampah', 'Jadwal', 'Detail', 'Lokasi', 'Konfirmasi']
            .slice(0, formData.deliveryType === 'pickup' ? 6 : 4)
            .map((text) => (
              <div key={text} className="flex-1 text-center">{text}</div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 text-xs sm:text-xs text-left sm:p-4 sm:mb-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex sm:items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Delivery Type Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="overflow-hidden sm:bg-white shadow-xs sm:shadow-lg rounded-xl">
              <div className="py-4 sm:p-6 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pilih Tipe Pengiriman</h2>
                <p className="mt-1 text-sm text-gray-500">Pilih cara Anda ingin menangani sampah Anda</p>
              </div>
              <div className="sm:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'pickup' })}
                    className={`p-4 rounded-lg border-2 transition-all
                      ${formData.deliveryType === 'pickup'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-md justify-center w-8 h-8 sm:rounded-lg bg-emerald-100">
                            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          </div>
                          <h3 className="text-sm sm:text-lg text-gray-900">Jasa Penjemputan</h3>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-left text-gray-500">Penjemputan sampah ke lokasi Anda</p>
                        <p className="text-xs sm:text-sm text-left font-semibold text-emerald-600">Biaya layanan berlaku</p>
                      </div>
                      {formData.deliveryType === 'pickup' && (
                        <div className="hidden p-1 text-white rounded-full bg-emerald-500">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'self-delivery' })}
                    className={`p-4 rounded-lg border-2 transition-all
                      ${formData.deliveryType === 'self-delivery'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                      }`}
                  > 
                    <div className="flex items-start justify-between">
                      <div className="w-full">
                        <div className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setFormData({ ...formData, deliveryType: 'self-delivery' })}>
                          <div className="flex items-center rounded-md justify-center w-8 h-8 sm:rounded-lg bg-emerald-100">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          </div>
                          <h3 className="text-sm sm:text-lg font-medium text-gray-900">Antar Mandiri</h3>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-left text-gray-500">Antar sampah ke bank sampah</p>
                        <p className="text-xs sm:text-sm text-left font-semibold text-emerald-600">Tanpa biaya layanan</p>
                      </div>
                      {formData.deliveryType === 'self-delivery' && (
                        <div className="hidden p-1 text-white rounded-full bg-emerald-500">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: WasteBank Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
              <div className="py-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="hidden sm:p-2 sm:rounded-lg sm:bg-emerald-100">
                    <Recycle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pilih Bank Sampah</h2>
                    <p className="mt-1 text-sm text-gray-500">Pilih bank sampah yang akan mengelola sampah Anda</p>
                  </div>
                </div>
              </div>

              {loadingWasteBanks ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="divide-y pt-4 border-b border-gray-300 divide-gray-300">
                  {wasteBanks.map((bank) => (
                    <label
                      key={bank.id}
                      className={`group flex items-start sm:p-6 cursor-pointer hover:bg-emerald-100/60 transition-all duration-300
                        ${formData.wasteBankId === bank.id ? 'sm:bg-emerald-200' : ''}`}
                    >
                      <input
                        type="radio"
                        name="wasteBank"
                        className="sr-only"
                        checked={formData.wasteBankId === bank.id}
                        onChange={() => setFormData({
                          ...formData,
                          wasteBankId: bank.id,
                          wasteBankName: bank.profile?.institution || 'Unnamed WasteBank'
                        })}
                      />
                      <div className="flex-1 p-2">
                        <div className="items-center text-left justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`hidden p-3 rounded-xl transition-colors duration-300
                              ${formData.wasteBankId === bank.id ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-emerald-100'}`}
                            >
                              <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300
                                ${formData.wasteBankId === bank.id ? 'text-emerald-600' : 'text-gray-600 group-hover:text-emerald-600'}`} 
                              />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900 transition-colors duration-300 group-hover:text-emerald-700">
                                {bank.profile?.institution || 'Unnamed WasteBank'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="hidden w-4 h-4 text-gray-400" />
                                <p className="text-xs text-gray-500">
                                  {bank.profile?.location?.address || 'No address provided'}
                                </p>
                              </div>
                              <div className="items-center gap-4 mt-2">
                                {bank.distance !== null && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Navigation className="w-4 h-4 mr-1 text-blue-500" />
                                    <span>{bank.distance.toFixed(1)} km</span>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <div className="flex items-center px-3 text-[8px] sm:text-sm text-emerald-700 bg-emerald-100 rounded-full">
                                    <Trees className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-emerald-500" />
                                    <span>Ramah Lingkungan</span>
                                  </div>
                                  <div className="flex items-center px-3 text-[8px] sm:text-sm text-blue-700 bg-blue-100 rounded-full">
                                    <Timer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" />
                                    <span>Layanan Cepat</span>
                                  </div>
                                </div>
                                <div> 
                                  {bank.profile?.phone && (
                                    <div className="mt-4 flex items-center text-sm text-gray-600">
                                      <Phone className="w-4 h-4 mr-1 text-gray-400" />
                                      {bank.profile.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="hidden flex items-center gap-1 mt-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-gray-500">Verified Waste Bank</span>
                              </div>
                            </div>
                          </div>
                          {formData.wasteBankId === bank.id && (
                            <div className="hidden mt-4 bg-emerald-500 text-white rounded-full p-[2px] sm:shadow-lg sm:shadow-emerald-100">
                              <Check className="hidden w-3 h-3 sm:w-5 sm:h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Date selection */}
            <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
              <div className="py-4 sm:p-6 border-b border-gray-100">
                <div className="flex sm:items-center gap-2">
                  <Calendar className="w-7 h-7 text-emerald-500" />
                  <div className="text-left">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pilih Tanggal</h2>
                    <p className="mt-1 text-sm text-gray-500">Pilih tanggal penjemputan yang Anda inginkan</p>
                  </div>
                </div>
              </div>
              <div className="pb-6 sm:p-6">
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-200 bg-white rounded-lg text-sm"
                required
              />
              </div>
            </div>

            {/* Time selection */}
            <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
              <div className="pb-4 sm:p-6 border-b border-gray-100">
                <div className="flex sm:items-center gap-2">
                  <Clock className="w-7 h-7 text-emerald-500" />
                  <div className="text-left">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pilih Waktu</h2>
                    <p className="mt-1 text-sm text-gray-500">Pilih waktu penjemputan yang Anda inginkan</p>
                  </div>
                </div>
              </div>
              <div className="sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {timeSlots.map(({ time, available }) => (
                    <button
                      key={time}
                      type="button"
                      disabled={!available}
                      onClick={() => setFormData({ ...formData, time })}
                      className={`p-3 text-xs rounded-md sm:text-sm font-medium transition-colors 
                        ${formData.time === time
                          ? 'bg-emerald-500 text-white'
                          : available
                            ? 'bg-white hover:bg-emerald-100 text-gray-700'
                            : 'bg-white text-gray-400 cursor-not-allowed'
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

        {/* Step 4: Waste Details */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
              <div className="py-4 sm:p-6 border-b border-gray-100">
                <div className="text-center">
                  {/* <Trash2 className="w-5 h-5 text-emerald-500" /> */}
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Pilih Jenis Sampah</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Pilih jenis sampah yang akan disetorkan</p>
              </div>
              <div className="sm:p-6">
                <div className="space-y-6">
                  {wasteTypes.map(category => (
                    <div key={category.id} className="overflow-hidden border bg-gray-50 border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-4 bg-gray-50">
                        <h3 className="text-md sm:text-lg font-medium text-gray-900">{category.name}</h3>
                      </div>
                      <div className="p-2">
                        {category.subcategories ? (
                          // For categories with subcategories (like plastic)
                          <div className="space-y-4">
                            {category.subcategories.map((subcat, idx) => (
                              <div key={idx} className="space-y-2">
                                <h4 className="text-md font-medium text-gray-700">{subcat.name}</h4>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {subcat.types.map(type => {
                                  const isChecked = formData.wasteTypes.includes(type.id);
                                  const quantity = formData.wasteQuantities[type.id] || 0;

                                  return (
                                    <div key={type.id} className="space-y-1">
                                      <label className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <div className="flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              const newTypes = isChecked
                                                ? formData.wasteTypes.filter(t => t !== type.id)
                                                : [...formData.wasteTypes, type.id];
                                              setFormData(prev => ({
                                                ...prev,
                                                wasteTypes: newTypes,
                                                wasteQuantities: {
                                                  ...prev.wasteQuantities,
                                                  [type.id]: newTypes.includes(type.id) ? 1 : 0
                                                }
                                              }));
                                            }}
                                            className="w-3 h-3 sm:w-4 sm:h-4 border-gray-300 rounded text-emerald-500 focus:ring-emerald-500"
                                          />
                                          <span className="ml-2 text-sm text-gray-700">{type.name}</span>
                                        </div>
                                      </label>

                                      {isChecked && (
                                        <div className="flex items-center justify-between px-3 py-2 bg-white rounded-md sm:shadow-sm border">
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center">
                                              <button
                                                type="button"
                                                onClick={() => handleQuantityChange(type.id, -1)}
                                                disabled={quantity <= 0}
                                                className={`p-2 rounded-l-md ${
                                                  quantity <= 0
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200'
                                                }`}
                                              >
                                                <Minus className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                              </button>
                                              <div className="w-12 h-[32px] border-y bg-white flex items-center justify-center text-sm sm:text-base font-semibold text-gray-800">
                                                {quantity}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleQuantityChange(type.id, 1)}
                                                disabled={quantity >= 10}
                                                className={`p-2 rounded-r-md ${
                                                  quantity >= 10
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200'
                                                }`}
                                              >
                                                <Plus className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                              </button>
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 min-w-[60px]">kantong</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // For categories without subcategories
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {category.types.map(type => {
                              const isChecked = formData.wasteTypes.includes(type.id);
                              const quantity = formData.wasteQuantities[type.id] || 0;

                              return (
                                <div key={type.id} className="space-y-1">
                                  <label className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const newTypes = isChecked
                                            ? formData.wasteTypes.filter(t => t !== type.id)
                                            : [...formData.wasteTypes, type.id];
                                          setFormData(prev => ({
                                            ...prev,
                                            wasteTypes: newTypes,
                                            wasteQuantities: {
                                              ...prev.wasteQuantities,
                                              [type.id]: newTypes.includes(type.id) ? 1 : 0
                                            }
                                          }));
                                        }}
                                        className="w-3 h-3 sm:w-4 sm:h-4 border-gray-300 rounded text-emerald-500 focus:ring-emerald-500"
                                      />
                                      <span className="ml-2 text-sm text-gray-700">{type.name}</span>
                                    </div>
                                  </label>

                                  {isChecked && (
                                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-md sm:shadow-sm border">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center">
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(type.id, -1)}
                                            disabled={quantity <= 0}
                                            className={`p-2 rounded-l-md ${
                                              quantity <= 0
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200'
                                            }`}
                                          >
                                            <Minus className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                          </button>
                                          <div className="w-12 h-[32px] border-y bg-white flex items-center justify-center text-sm sm:text-base font-semibold text-gray-800">
                                            {quantity}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(type.id, 1)}
                                            disabled={quantity >= 10}
                                            className={`p-2 rounded-r-md ${
                                              quantity >= 10
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200'
                                            }`}
                                          >
                                            <Plus className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                          </button>
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 min-w-[60px]">kantong</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Location - Only show for pickup service */}
        {formData.deliveryType === 'pickup' && step === 5 && (
          <div className="space-y-6">
            <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
              <div className="py-4 sm:p-6 border-b border-gray-100">
                <div className="text-center">
                  {/* <MapPin className="w-5 h-5 text-emerald-500" /> */}
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Lokasi Penjemputan</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Di mana kami harus menjemput sampah Anda?</p>
              </div>
              <div className="sm:p-6 space-y-4">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <textarea
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg placeholder:text-xs text-sm"
                    rows="5"
                    placeholder="Masukkan alamat lengkap Anda"
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex items-center flex-shrink-0 gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 text-sm"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    Gunakan Lokasi Saat Ini
                  </button>
                </div>
                
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="w-full p-3 border border-gray-200 rounded-lg placeholder:text-xs text-sm"
                  placeholder="No. Telp. (contoh: 0812-3456-7890)"
                  pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                  required
                />

                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm placeholder:text-xs"
                  rows="3"
                  placeholder="Catatan tambahan (contoh: 'Sampah berada dalam kantong hitam dekat garasi')"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5 (pickup) or Step 4 (self-delivery): Confirmation */}
        {((formData.deliveryType === 'pickup' && step === 6) || (formData.deliveryType === 'self-delivery' && step === 4)) && (
          <div className="overflow-hidden sm:bg-white sm:shadow-lg rounded-xl">
            <div className="py-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Tinjau {formData.deliveryType === 'pickup' ? 'Penjemputan' : 'Pengantaran'} Anda</h2>
              <p className="mt-1 text-sm text-gray-500">Harap konfirmasi detail informasi Anda</p>
            </div>
            
            <div className="sm:p-6 text-left space-y-6">
              {/* WasteBank Info */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Bank Sampah</p>
                  <p className="text-sm font-semibold text-gray-900">{formData.wasteBankName}</p>
                  {formData.deliveryType === 'self-delivery' && (
                    <>
                      <p className="mt-2 text-sm text-gray-500">
                        {wasteBanks.find(bank => bank.id === formData.wasteBankId)?.profile?.address}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Kontak: {wasteBanks.find(bank => bank.id === formData.wasteBankId)?.profile?.phone || 'Tidak ada nomor telepon'}
                      </p>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Nomor Telepon Anda</p>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          className="w-full p-3 mt-1 border border-gray-200 rounded-lg placeholder:text-xs text-sm"
                          placeholder="No. Telp. (contoh: 0812-3456-7890)"
                          pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Schedule Info */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Jadwal</p>
                  <p className="text-gray-900 text-sm font-semibold">
                  <span>
                    {new Date(formData.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <br />
                  <span>
                    {formData.time}
                  </span>
                </p>
                </div>
              </div>

              {/* Waste Info */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Detail Sampah</p>
                  <div className="text-sm font-semibold sm:mt-2 sm:space-y-2">
                    {formData.wasteTypes.map(typeId => {
                      const waste = getWasteDetails(typeId);
                      const quantity = formData.wasteQuantities[typeId] || 0;
                      return waste ? (
                        <div key={typeId} className="flex justify-between">
                          <span className="text-gray-700">
                            {waste.name} ({quantity} kantong)
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {/* Location Info with Notes - Only for pickup */}
              {formData.deliveryType === 'pickup' && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Lokasi Penjemputan</p>
                    <p className="text-gray-900 text-sm font-semibold">{formData.location}</p>
                    {formData.phone && (
                      <>
                        <p className="mt-2 text-sm font-medium text-gray-500">Nomor Telepon</p>
                        <p className="text-gray-700 text-sm font-semibold">{formData.phone}</p>
                      </>
                    )}
                    {formData.notes && (
                      <>
                        <p className="mt-2 text-sm font-medium text-gray-500">Catatan Tambahan</p>
                        <p className="text-gray-700 text-sm font-semibold">{formData.notes}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons - Updated validation */}
        <div className="flex justify-between pt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm sm:text-base font-semibold flex items-center gap-2 px-6 py-3 shadow-sm text-gray-700 bg-gray-00 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          )}
          
          {((formData.deliveryType === 'pickup' && step < 6) || (formData.deliveryType === 'self-delivery' && step < 4)) && (
            <button
              type="button"
              onClick={() => {
                let validationError = '';
                
                switch (step) {
                  case 1:
                    if (!formData.deliveryType) {
                      validationError = 'Silahkan pilih tipe pengiriman untuk melanjutkan';
                    }
                    break;
                  case 2:
                    if (!formData.wasteBankId) {
                      validationError = 'Silahkan pilih Bank Sampah untuk melanjutkan';
                    }
                    break;
                  case 3:
                    if (!formData.date) {
                      validationError = 'Silahkan pilih tanggal untuk melanjutkan';
                    } else if (!formData.time) {
                      validationError = 'Silahkan pilih waktu untuk melanjutkan';
                    }
                    break;
                  case 4:
                    if (formData.wasteTypes.length === 0) {
                      validationError = 'Silahkan pilih minimal satu jenis sampah untuk melanjutkan';
                    } else if (formData.wasteTypes.some(typeId => !formData.wasteQuantities[typeId])) {
                      validationError = 'Silahkan tentukan jumlah untuk semua jenis sampah yang dipilih';
                    }
                    break;
                  case 5:
                    if (!formData.location.trim()) {
                      validationError = 'Silahkan masukkan lokasi penjemputan untuk melanjutkan';
                    } else if (!formData.phone) {
                      validationError = 'Silahkan masukkan nomor telepon untuk melanjutkan';
                    }
                    break;
                }
                
                if (validationError) {
                  setError(validationError);
                  return;
                }
                
                setError('');
                setStep(step + 1);
              }}
              className="flex text-sm sm:text-base font-semibold items-center gap-2 px-6 py-3 shadow-sm ml-auto text-white rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Lanjut
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          
          {((formData.deliveryType === 'pickup' && step === 6) || (formData.deliveryType === 'self-delivery' && step === 4)) && (
            <button
              type="submit"
              disabled={loading}
              className={`text-sm sm:text-base px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 ml-auto
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                'Konfirmasi'
              )}
            </button>
          )}
        </div>
      </form>

      {/* Success message */}
      {/* {success && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Jadwal Berhasil Dibuat!</h3>
                <p className="text-gray-500">Penjemputan sampah Anda telah berhasil dijadwalkan.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  deliveryType: '',
                  date: '',
                  time: '',
                  wasteTypes: [],
                  wasteQuantities: {},
                  location: userData?.profile?.address || '',
                  phone: '',
                  coordinates: null,
                  wasteBankId: '',
                  wasteBankName: '',
                  notes: '',
                });
              }}
              className="w-full px-4 py-2 text-white rounded-lg bg-emerald-500 hover:bg-emerald-600"
            >
              Jadwalkan Penjemputan Lainnya
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default SchedulePickup;