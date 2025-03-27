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
  Star
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
    date: '',
    time: '',
    wasteTypes: [],
    quantity: 1,
    location: userData?.profile?.address || '',
    phone: '',
    coordinates: null,
    wasteBankId: '',
    wasteBankName: ''
  });

  // Fetch waste banks
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
          ...doc.data(),
          distance: Math.random() * 5 + 0.5, // Simulated distance in km
          rating: (Math.random() * 2 + 3).toFixed(1) // Simulated rating between 3-5
        }));
        setWasteBanks(wasteBankData);
      } catch (error) {
        console.error('Error fetching waste banks:', error);
      } finally {
        setLoadingWasteBanks(false);
      }
    };

    fetchWasteBanks();
  }, []);

  // Available waste types with improved descriptions
  const wasteTypes = [
    {
      id: 'organic',
      name: 'Organic Waste',
      description: 'Food scraps, garden waste, biodegradable materials',
      price: 10000,
      icon: '🌱'
    },
    {
      id: 'plastic',
      name: 'Plastic',
      description: 'Bottles, containers, clean plastic packaging',
      price: 5000,
      icon: '♳'
    },
    {
      id: 'paper',
      name: 'Paper & Cardboard',
      description: 'Newspapers, magazines, boxes, paper packaging',
      price: 8000,
      icon: '📄'
    },
    {
      id: 'metal',
      name: 'Metal',
      description: 'Cans, aluminum items, metal containers',
      price: 12000,
      icon: '🥫'
    }
  ];

  // Time slots with availability
  const timeSlots = [
    { time: '08:00', available: true },
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: true },
    { time: '13:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: true }
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
        date: '',
        time: '',
        wasteTypes: [],
        quantity: 1,
        location: userData?.profile?.address || '',
        phone: '',
        coordinates: null,
        wasteBankId: '',
        wasteBankName: ''
      });
      setStep(1);
    } catch (err) {
      setError('Failed to schedule pickup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Schedule a Pickup</h1>
        <p className="text-emerald-50">Let us help you manage your waste sustainably</p>
      </div>

      {/* Steps indicator */}
      <div className="flex justify-between mb-8">
        {['WasteBank', 'Schedule', 'Details', 'Location', 'Confirm'].map((text, index) => (
          <div 
            key={text}
            className={`flex items-center ${index < 4 ? 'flex-1' : ''}`}
          >
            <div className={`
              relative w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-300
              ${step > index + 1 ? 'bg-emerald-500 text-white' : 
                step === index + 1 ? 'bg-emerald-500 text-white' : 
                'bg-gray-200 text-gray-500'}
            `}>
              {step > index + 1 ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
              <span className="absolute -bottom-6 text-xs font-medium text-gray-600 whitespace-nowrap">
                {text}
              </span>
            </div>
            {index < 4 && (
              <div className={`flex-1 h-1 mx-4 mt-0 
                transition-all duration-300
                ${step > index + 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} 
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: WasteBank Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">Select a WasteBank</h2>
                <p className="text-sm text-gray-500 mt-1">Choose the nearest WasteBank to handle your pickup</p>
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
                      className={`flex items-start p-6 cursor-pointer hover:bg-gray-50 transition-colors
                        ${formData.wasteBankId === bank.id ? 'bg-emerald-50' : ''}`}
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
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {bank.profile?.institution || 'Unnamed WasteBank'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {bank.profile?.address || 'No address provided'}
                            </p>
                          </div>
                          {formData.wasteBankId === bank.id && (
                            <div className="bg-emerald-500 text-white rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-emerald-500" />
                            {bank.distance.toFixed(1)} km away
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-400" />
                            {bank.rating}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
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
                <p className="text-sm text-gray-500 mt-1">Choose your preferred pickup time</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3">
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

        {/* Step 3: Waste Details */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Waste type selection */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Select Waste Types</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Choose the types of waste you want to recycle</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wasteTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        const newTypes = formData.wasteTypes.includes(type.id)
                          ? formData.wasteTypes.filter(t => t !== type.id)
                          : [...formData.wasteTypes, type.id];
                        setFormData({ ...formData, wasteTypes: newTypes });
                      }}
                      className={`p-4 rounded-lg border-2 transition-all
                        ${formData.wasteTypes.includes(type.id)
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-200'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{type.icon}</span>
                            <h3 className="font-medium text-gray-900">{type.name}</h3>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                          <p className="text-sm font-medium text-emerald-600 mt-2">
                            Rp {type.price.toLocaleString()}/bag
                          </p>
                        </div>
                        {formData.wasteTypes.includes(type.id) && (
                          <div className="bg-emerald-500 text-white rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity selection */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Quantity</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">How many bags of waste do you have?</p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      quantity: Math.max(1, prev.quantity - 1)
                    }))}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-emerald-100 flex items-center justify-center text-gray-600 hover:text-emerald-600"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-3xl font-bold text-gray-800 w-12 text-center">
                    {formData.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      quantity: Math.min(10, prev.quantity + 1)
                    }))}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-emerald-100 flex items-center justify-center text-gray-600 hover:text-emerald-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 text-center mt-4">
                  Maximum 10 bags per pickup
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Location input */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-800">Pickup Location</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Where should we pick up your waste?</p>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <textarea
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows="3"
                    placeholder="Enter your address"
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
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
  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
  placeholder="Enter phone number"
  pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" // Optional: to match the format 123-456-7890
/>


                {/* <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="2"
                  placeholder="Additional notes (optional)"
                /> */}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Review Your Pickup</h2>
              <p className="text-sm text-gray-500 mt-1">Please confirm your pickup details</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* WasteBank Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Selected WasteBank</p>
                  <p className="text-gray-900 font-medium">{formData.wasteBankName}</p>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pickup Schedule</p>
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
                <div>
                  <p className="text-sm font-medium text-gray-500">Waste Details</p>
                  <div className="space-y-2">
                    {formData.wasteTypes.map(typeId => {
                      const waste = wasteTypes.find(w => w.id === typeId);
                      return (
                        <div key={typeId} className="flex justify-between">
                          <span className="text-gray-700">{waste.name}</span>
                          <span className="text-gray-900 font-medium">
                            {formData.quantity} bags × Rp {waste.price.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-900">Total Amount</span>
                        <span className="text-emerald-600">
                          Rp {(formData.wasteTypes.reduce((acc, typeId) => {
                            const waste = wasteTypes.find(w => w.id === typeId);
                            return acc + (waste.price * formData.quantity);
                          }, 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pickup Location</p>
                  <p className="text-gray-900">{formData.location}</p>
                  {formData.phone && (
                    <>
                      <p className="text-sm font-medium text-gray-500 mt-2">Additional Phone Number</p>
                      <p className="text-gray-700">{formData.phone}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
          )}
          
          {step < 5 && (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !formData.wasteBankId) {
                  setError('Please select a WasteBank');
                  return;
                }
                if (step === 2 && (!formData.date || !formData.time)) {
                  setError('Please select both date and time');
                  return;
                }
                if (step === 3 && formData.wasteTypes.length === 0) {
                  setError('Please select at least one waste type');
                  return;
                }
                if (step === 4 && !formData.location) {
                  setError('Please enter pickup location');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 ml-auto"
            >
              Continue
            </button>
          )}
          
          {step === 5 && (
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
                'Confirm Pickup'
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
                  date: '',
                  time: '',
                  wasteTypes: [],
                  quantity: 1,
                  location: userData?.profile?.address || '',
                  phone: '',
                  coordinates: null,
                  wasteBankId: '',
                  wasteBankName: ''
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