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
  ArrowLeft
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

const MasterRequestCollection = () => {
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
  });

  // Fetch master wastebanks
  useEffect(() => {
    const fetchMasterBanks = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'industry')
        );
        const snapshot = await getDocs(q);
        const masterBankData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMasterBanks(masterBankData);
      } catch (error) {
        console.error('Error fetching master banks:', error);
      } finally {
        setLoadingMasterBanks(false);
      }
    };

    fetchMasterBanks();
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
        console.error('Error fetching collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, [currentUser.uid]);

  // Fetch requests
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'masterBankRequests'),
      where('wasteBankId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);
      setLoadingRequests(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
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
        status: 'pending'
      });
      setStep(1);
    } catch (err) {
      setError('Failed to schedule collection');
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
          console.log(`Processing ${completionCallback.collectionIds.length} collection updates`);

          const batch = writeBatch(db);
          for (const collection of completionCallback.collectionIds) {
            const pickupRef = doc(db, 'masterBankRequests', collection.id);
            const pickupDoc = await getDoc(pickupRef);
            if (!pickupDoc.exists()) {
              console.log(`Pickup ${collection.id} not found`);
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
          console.log('Successfully updated pickup weights');
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setError("Failed to update request status: " + error.message);
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
                <h1 className="text-2xl font-semibold text-zinc-800">Request Collection</h1>
                <p className="text-sm text-zinc-500">Schedule a collection from master waste bank</p>
              </div>
            </div>
          </div>

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
                {['Master Bank', 'Schedule', 'Waste Details', 'Confirm']
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
              {['Master Bank', 'Schedule', 'Waste Details', 'Confirm'].map((text) => (
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
                    <h2 className="text-xl font-semibold text-gray-800">Select Master Waste Bank</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Choose the master waste bank for collection</p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {loadingMasterBanks ? (
                    <div className="flex justify-center p-6">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
                            masterBankName: bank.profile?.institution || 'Unnamed Master Bank'
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
                                  {bank.profile?.institution || 'Unnamed Master Bank'}
                                </h3>
                                <p className="text-sm text-gray-500">{bank.profile?.address || 'No address provided'}</p>
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
                      <h2 className="text-xl font-semibold text-gray-800">Select Date</h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Choose your preferred collection date</p>
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
                      <h2 className="text-xl font-semibold text-gray-800">Select Time</h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Choose your preferred collection time</p>
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
                    <h2 className="text-xl font-semibold text-gray-800">Select Waste Types</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Choose waste types from your storage</p>
                </div>
                <div className="p-6">
                  {loadingCollections ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : (
                    availableWasteTypes.length === 0 ? (
                      <div className="py-8 text-center">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <h3 className="font-medium text-gray-600">No Waste in Storage</h3>
                        <p className="mt-1 text-sm text-gray-500">Your storage is currently empty</p>
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
                                Available: {waste.currentStock.toFixed(1)} kg
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
                                  placeholder="Weight in kg"
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
                  <h2 className="text-xl font-semibold text-gray-800">Review Collection Request</h2>
                  <p className="mt-1 text-sm text-gray-500">Please confirm your details</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Master Bank Info */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Selected Master Bank</p>
                      <p className="font-medium text-gray-900">{formData.masterBankName}</p>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
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

                  {/* Waste Details */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <Package className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Selected Waste</p>
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

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows="3"
                      placeholder="Any special instructions..."
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
                  Back
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
                          validationError = 'Please select a master bank';
                          canProceed = false;
                        }
                        break;
                      case 2:
                        if (!formData.date || !formData.time) {
                          validationError = 'Please select both date and time';
                          canProceed = false;
                        }
                        break;
                      case 3:
                        if (formData.wasteTypes.length === 0) {
                          validationError = 'Please select at least one waste type';
                          canProceed = false;
                        } else if (formData.wasteTypes.some(type => !formData.wasteWeights[type])) {
                          validationError = 'Please enter weight for all selected waste types';
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
                  Continue
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
                      Processing...
                    </>
                  ) : (
                    'Submit Request'
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
                    <h3 className="text-lg font-semibold text-zinc-800">Request Submitted!</h3>
                    <p className="text-zinc-500">Your collection request has been sent successfully.</p>
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
                      status: 'pending'
                    });
                  }}
                  className="w-full px-4 py-2 text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300"
                >
                  Make Another Request
                </button>
              </div>
            </div>
          )}

          {/* Debug Panel - Request Status */}
          <div className="mt-8">
            <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Debug Panel - Request Status</h2>
              
              {loadingRequests ? (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : requests.length === 0 ? (
                <p className="text-gray-500">No requests found</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-700">
                            Request to: {request.masterBankName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Date: {new Date(request.date.seconds * 1000).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Time: {request.time}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-600">Waste Types:</p>
                            {Object.entries(request.wastes || {}).map(([type, data]) => (
                              <p key={type} className="text-sm text-gray-500">
                                {type}: {data.weight} kg
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            Current Status: <span className={`font-medium ${
                              request.status === 'completed' ? 'text-emerald-600' :
                              request.status === 'pending' ? 'text-amber-600' :
                              'text-gray-600'
                            }`}>{request.status}</span>
                          </p>
                          <select
                            value={request.status}
                            onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                            className="block w-full text-sm border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
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
