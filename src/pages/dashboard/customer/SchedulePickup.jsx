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
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  // Fetch waste banks - Disederhanakan tanpa perhitungan jarak
  useEffect(() => {
    const fetchWasteBanks = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin')
        );
        const snapshot = await getDocs(q);
        const wasteBankData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setWasteBanks(wasteBankData);
      } catch (error) {
        console.error('Error fetching waste banks:', error);
      } finally {
        setLoadingWasteBanks(false);
      }
    };

    fetchWasteBanks();
  }, []); // No dependencies needed since we're not using coordinates anymore

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
    setFormData(prev => ({
      ...prev,
      wasteQuantities: {
        ...prev.wasteQuantities,
        [typeId]: Math.max(0, Math.min(10, (prev.wasteQuantities[typeId] || 0) + change))
      }
    }));
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

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Schedule a Waste Collection</h1>
        <p className="text-emerald-50">Let us help you manage your waste sustainably</p>
      </div>

      {/* Steps indicator with progress bar */}
      <div className="mb-8">
        {/* Progress bar */}
        <div className="relative mb-4">
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${(step / (formData.deliveryType === 'pickup' ? 6 : 4)) * 100}%`
              }}
            />
          </div>
          <div className="absolute -top-2 left-0 w-full flex justify-between">
            {['Delivery', 'WasteBank', 'Schedule', 'Details', 'Location', 'Confirm']
              .slice(0, formData.deliveryType === 'pickup' ? 6 : 4)
              .map((text, index) => (
                <div
                  key={text}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                    transition-all duration-300 -ml-3 first:ml-0 last:ml-0
                    ${step > index + 1 ? 'bg-emerald-500 text-white' :
                    step === index + 1 ? 'bg-emerald-500 text-white' :
                    'bg-gray-200 text-gray-500'}`}
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
        <div className="flex justify-between text-xs text-gray-600 px-1">
          {['Delivery', 'WasteBank', 'Schedule', 'Details', 'Location', 'Confirm']
            .slice(0, formData.deliveryType === 'pickup' ? 6 : 4)
            .map((text) => (
              <div key={text} className="text-center flex-1">{text}</div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Delivery Type Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">Select Delivery Type</h2>
                <p className="text-sm text-gray-500 mt-1">Choose how you want to handle your waste</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'pickup' })}
                    className={`p-6 rounded-lg border-2 transition-all text-left
                      ${formData.deliveryType === 'pickup'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Truck className="w-6 h-6 text-emerald-600" />
                          </div>
                          <h3 className="font-medium text-gray-900">Pickup Service</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">We'll pick up your waste from your location</p>
                        <p className="text-sm font-medium text-emerald-600 mt-2">Service fee applies</p>
                      </div>
                      {formData.deliveryType === 'pickup' && (
                        <div className="bg-emerald-500 text-white rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className={`p-6 rounded-lg border-2 transition-all
                    ${formData.deliveryType === 'self-delivery'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-full">
                        <div className="flex items-center gap-2 cursor-pointer"
                             onClick={() => setFormData({ ...formData, deliveryType: 'self-delivery' })}>
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-emerald-600" />
                          </div>
                          <h3 className="font-medium text-gray-900">Self Delivery</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Deliver waste to the waste bank yourself</p>
                        <p className="text-sm font-medium text-emerald-600 mt-2">No service fee</p>
                      </div>
                      {formData.deliveryType === 'self-delivery' && (
                        <div className="bg-emerald-500 text-white rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: WasteBank Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Recycle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Pilih Bank Sampah</h2>
                    <p className="text-sm text-gray-500 mt-1">Pilih bank sampah yang akan mengelola sampah Anda</p>
                  </div>
                </div>
              </div>

              {loadingWasteBanks ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {wasteBanks.map((bank) => (
                    <label
                      key={bank.id}
                      className={`group flex items-start p-6 cursor-pointer hover:bg-emerald-50/50 transition-all duration-300
                        ${formData.wasteBankId === bank.id ? 'bg-emerald-50/80' : ''}`}
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl transition-colors duration-300
                              ${formData.wasteBankId === bank.id ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-emerald-100'}`}
                            >
                              <Building2 className={`w-6 h-6 transition-colors duration-300
                                ${formData.wasteBankId === bank.id ? 'text-emerald-600' : 'text-gray-600 group-hover:text-emerald-600'}`} 
                              />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                                {bank.profile?.institution || 'Unnamed WasteBank'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <p className="text-sm text-gray-500">
                                  {bank.profile?.location?.address || 'No address provided'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Trees className="w-4 h-4 mr-1 text-emerald-500" />
                                  <span>Eco-friendly</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Timer className="w-4 h-4 mr-1 text-blue-500" />
                                  <span>Fast Service</span>
                                </div>
                                {bank.profile?.phone && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="w-4 h-4 mr-1 text-gray-400" />
                                    {bank.profile.phone}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex items-center gap-1">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-gray-500">Verified Waste Bank</span>
                              </div>
                            </div>
                          </div>
                          {formData.wasteBankId === bank.id && (
                            <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-lg shadow-emerald-100">
                              <Check className="w-5 h-5" />
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Select Date</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Choose your preferred pickup date</p>
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

            {/* Time selection */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Select Time</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Choose your preferred pickup time interval</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* Step 4: Waste Details */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Pilih Jenis Sampah</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Pilih jenis sampah yang akan disetorkan</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {wasteTypes.map(category => (
                    <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      </div>
                      <div className="p-4">
                        {category.subcategories ? (
                          // For categories with subcategories (like plastic)
                          <div className="space-y-4">
                            {category.subcategories.map((subcat, idx) => (
                              <div key={idx} className="space-y-2">
                                <h4 className="font-medium text-gray-700">{subcat.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {subcat.types.map(type => (
                                    <label key={type.id} className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        checked={formData.wasteTypes.includes(type.id)}
                                        onChange={() => {
                                          const newTypes = formData.wasteTypes.includes(type.id)
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
                                        className="h-4 w-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                                      />
                                      <span className="ml-2 text-sm text-gray-700">{type.name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // For categories without subcategories
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {category.types.map(type => (
                              <label key={type.id} className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={formData.wasteTypes.includes(type.id)}
                                  onChange={() => {
                                    const newTypes = formData.wasteTypes.includes(type.id)
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
                                  className="h-4 w-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{type.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {/* Quantity inputs for selected types */}
                        <div className="mt-4 space-y-2">
                          {formData.wasteTypes
                            .filter(typeId => {
                              // Find the type in the current category
                              const found = category.subcategories
                                ? category.subcategories.some(subcat =>
                                    subcat.types.some(type => type.id === typeId)
                                  )
                                : category.types.some(type => type.id === typeId);
                              return found;
                            })
                            .map(typeId => {
                              // Find the type details
                              let typeName = '';
                              if (category.subcategories) {
                                category.subcategories.forEach(subcat => {
                                  const found = subcat.types.find(t => t.id === typeId);
                                  if (found) typeName = found.name;
                                });
                              } else {
                                const found = category.types.find(t => t.id === typeId);
                                if (found) typeName = found.name;
                              }

                              return (
                                <div key={typeId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700">{typeName}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(typeId, -1)}
                                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-medium">
                                      {formData.wasteQuantities[typeId] || 1} kantong
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(typeId, 1)}
                                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Pickup Location</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Where should we pick up your waste?</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <textarea
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows="3"
                    placeholder="Enter your address"
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    Use Current
                  </button>
                </div>
                
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Phone number (e.g., 0812-3456-7890)"
                  pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                  required
                />

                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="3"
                  placeholder="Additional notes (e.g., 'Waste is in black bags near the garage')"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5 (pickup) or Step 4 (self-delivery): Confirmation */}
        {((formData.deliveryType === 'pickup' && step === 6) || (formData.deliveryType === 'self-delivery' && step === 4)) && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Review Your {formData.deliveryType === 'pickup' ? 'Pickup' : 'Self-Delivery'}</h2>
              <p className="text-sm text-gray-500 mt-1">Please confirm your details</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* WasteBank Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Selected WasteBank</p>
                  <p className="text-gray-900 font-medium">{formData.wasteBankName}</p>
                  {formData.deliveryType === 'self-delivery' && (
                    <>
                      <p className="text-sm text-gray-500 mt-2">
                        {wasteBanks.find(bank => bank.id === formData.wasteBankId)?.profile?.address}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Contact: {wasteBanks.find(bank => bank.id === formData.wasteBankId)?.profile?.phone || 'No phone number provided'}
                      </p>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Your Contact Number</p>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          className="mt-1 w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Phone number (e.g., 0812-3456-7890)"
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
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Schedule</p>
                  <p className="text-gray-900">
                    {new Date(formData.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {' at '}
                    {formData.time}
                  </p>
                </div>
              </div>

              {/* Waste Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Waste Details</p>
                  <div className="space-y-2 mt-2">
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
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pickup Location</p>
                    <p className="text-gray-900">{formData.location}</p>
                    {formData.phone && (
                      <>
                        <p className="text-sm font-medium text-gray-500 mt-2">Contact Number</p>
                        <p className="text-gray-700">{formData.phone}</p>
                      </>
                    )}
                    {formData.notes && (
                      <>
                        <p className="text-sm font-medium text-gray-500 mt-2">Additional Notes</p>
                        <p className="text-gray-700">{formData.notes}</p>
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
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
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
                      validationError = 'Please select a delivery type to continue';
                    }
                    break;
                  case 2:
                    if (!formData.wasteBankId) {
                      validationError = 'Please select a WasteBank to continue';
                    }
                    break;
                  case 3:
                    if (!formData.date) {
                      validationError = 'Please select a date to continue';
                    } else if (!formData.time) {
                      validationError = 'Please select a time slot to continue';
                    }
                    break;
                  case 4:
                    if (formData.wasteTypes.length === 0) {
                      validationError = 'Please select at least one waste type to continue';
                    } else if (formData.wasteTypes.some(typeId => !formData.wasteQuantities[typeId])) {
                      validationError = 'Please specify quantities for all selected waste types';
                    }
                    break;
                  case 5:
                    if (!formData.location.trim()) {
                      validationError = 'Please provide a pickup location to continue';
                    } else if (!formData.phone) {
                      validationError = 'Please provide a contact number to continue';
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
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 ml-auto flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {((formData.deliveryType === 'pickup' && step === 6) || (formData.deliveryType === 'self-delivery' && step === 4)) && (
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 ml-auto
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                'Confirm Schedule'
              )}
            </button>
          )}
        </div>
      </form>

      {/* Success message */}
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Pickup Scheduled!</h3>
                <p className="text-gray-500">Your waste pickup has been scheduled successfully.</p>
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
                  wasteQuantities: {}, // New: Store quantities per waste type
                  location: userData?.profile?.address || '',
                  phone: '',
                  coordinates: null,
                  wasteBankId: '',
                  wasteBankName: '',
                  notes: '', // New: Additional notes for pickup location
                });
              }}
              className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Schedule Another Pickup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePickup;