import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
  Calculator,
  Info
} from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  calculateTotalValue, 
  WASTE_PRICES,
  getWasteDetails,
  wasteTypes
} from '../../../lib/constants';

// Reusable Input Component
const Input = ({ label, error, className = "", ...props }) => (
  <div>
    {label && (
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
    )}
    <input
      className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg
        text-gray-700 text-sm transition-all
        focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-red-500' : ''} 
        ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

const MasterUpdateCollection = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wasteData, setWasteData] = useState({});
  const [totalValue, setTotalValue] = useState(0);
  const { pickupId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribePickup;

    const fetchPickup = () => {
      try {
        const pickupRef = doc(db, 'masterBankRequests', pickupId);
        
        // Set up real-time listener for the pickup document
        unsubscribePickup = onSnapshot(
          pickupRef,
          (pickupSnap) => {
            if (!pickupSnap.exists()) {
              throw new Error('Pengambilan tidak ditemukan');
            }

            const data = pickupSnap.data();
            setPickup({ id: pickupSnap.id, ...data });
            
            // Initialize waste data from existing quantities
            const initialWasteData = {};
            Object.entries(data.wasteQuantities || {}).forEach(([type, quantity]) => {
              initialWasteData[type] = {
                quantity: quantity,
                weight: wasteData[type]?.weight || 0 // Preserve any entered weights
              };
            });
            setWasteData(prev => {
              // Only replace if there are no weights already entered
              if (Object.values(prev).some(item => item.weight > 0)) {
                return prev;
              }
              return initialWasteData;
            });
            setError(null);
            setLoading(false);
          },
          (err) => {
            console.error('Error fetching pickup:', err);
            setError(err.message);
            setLoading(false);
            Swal.fire({
              title: 'Error',
              text: `Gagal memuat data: ${err.message}`,
              icon: 'error',
              confirmButtonColor: '#10B981',
              confirmButtonText: 'Tutup'
            });
          }
        );
      } catch (err) {
        console.error('Error setting up snapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (pickupId) {
      fetchPickup();
    }

    // Clean up the subscription when the component unmounts
    return () => {
      if (unsubscribePickup) unsubscribePickup();
    };
  }, [pickupId]);

  // Calculate value whenever waste data changes
  useEffect(() => {
    const wastes = {};
    Object.entries(wasteData).forEach(([typeId, data]) => {
      if (data.weight > 0) {
        const price = WASTE_PRICES[typeId] || 0;
        const typeValue = data.weight * price;
        wastes[typeId] = {
          weight: data.weight,
          value: typeValue
        };
      }
    });

    const total = calculateTotalValue(wastes);
    setTotalValue(total);
  }, [wasteData]);

  const handleWeightChange = (typeId, weight) => {
    setWasteData(prev => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        weight: parseFloat(weight) || 0
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate that weights have been entered
      const hasWeights = Object.values(wasteData).some(waste => waste.weight > 0);
      if (!hasWeights) {
        throw new Error('Silakan masukkan berat untuk setidaknya satu jenis sampah');
      }

      const pickupRef = doc(db, 'masterBankRequests', pickupId);
      
      // Prepare wastes object with weights and values
      const wastes = {};
      
      Object.entries(wasteData).forEach(([type, data]) => {
        if (data.weight > 0) {
          const baseType = type.split('-').pop().toLowerCase();
          const price = WASTE_PRICES[baseType] || 1000; // Default price if type not found
          
          wastes[type] = {
            weight: data.weight,
            value: data.weight * price
          };
        }
      });

      await updateDoc(pickupRef, {
        status: 'completed',
        completedAt: new Date(),
        wastes,
        totalValue,
        updatedAt: new Date()
      });

      Swal.fire({
        title: 'Berhasil',
        text: 'Pengumpulan telah berhasil dicatat',
        icon: 'success',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'OK'
      }).then(() => {
        navigate('/dashboard/collector');
      });

    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.message,
        icon: 'error',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Tutup'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="ml-2 text-gray-600">Memuat data pengambilan...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => navigate('/dashboard/collector')}
              className="px-4 py-2 text-white rounded-lg bg-emerald-500"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={userData?.role} onCollapse={setIsSidebarCollapsed} />
      <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard/collector')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Catat Pengumpulan</h1>
            <p className="text-sm text-gray-500">Masukkan berat sampah untuk pengambilan #{pickup?.id?.slice(0, 6)}</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800">Petunjuk Pengisian</h3>
              <p className="text-sm text-blue-600">
                Masukkan berat aktual setiap jenis sampah dalam kilogram (kg). 
                Data ini akan digunakan untuk menghitung nilai total sampah yang dikumpulkan.
                Nilai dihitung secara otomatis berdasarkan harga pasar untuk setiap jenis sampah.
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-start gap-4">
            <User className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-medium text-gray-900">{pickup?.userName}</h3>
              <p className="text-sm text-gray-600">{pickup?.phone}</p>
              <p className="mt-1 text-sm text-gray-600">{pickup?.wasteBankName}</p>
            </div>
          </div>
        </div>

        {/* Value Summary */}
        <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl">
          <h3 className="flex items-center gap-2 mb-4 font-medium text-gray-900">
            <Calculator className="w-5 h-5 text-emerald-500" />
            Perhitungan Nilai
          </h3>
          <div className="p-4 rounded-lg bg-blue-50">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total Nilai</p>
                <p className="mt-1 text-2xl font-semibold text-blue-700">
                  Rp {totalValue.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  Berdasarkan nilai pasar untuk setiap jenis sampah
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waste Weights Form */}
        <form onSubmit={handleSubmit} className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="space-y-4">
            {pickup?.wasteQuantities && Object.entries(pickup.wasteQuantities).map(([typeId, quantity]) => {
              const wasteDetails = getWasteDetails(typeId);
              const price = WASTE_PRICES[typeId] || 0;
              
              // Improved function to get consistent waste type names
              const getWasteTypeName = (typeId) => {
                // First try to get name from wasteDetails (from constants)
                if (wasteDetails) return wasteDetails.name;
                
                // Otherwise, look through waste types structure
                for (const category of wasteTypes) {
                  if (category.id === typeId) {
                    return category.name.split(' ').slice(1).join(' '); // Remove emoji
                  }
                  
                  // Check in subcategories if present
                  if (category.subcategories) {
                    for (const subcat of category.subcategories) {
                      for (const type of subcat.types) {
                        if (type.id === typeId) {
                          return type.name;
                        }
                      }
                    }
                  }
                  // Check in direct types if present
                  else if (category.types) {
                    for (const type of category.types) {
                      if (type.id === typeId) {
                        return type.name;
                      }
                    }
                  }
                }
                
                // Fallback translations for basic categories (if specific type not found)
                const basicTranslations = {
                  'plastic': 'Plastik',
                  'paper': 'Kertas',
                  'organic': 'Organik',
                  'metal': 'Logam',
                  'glass': 'Kaca',
                  'electronic': 'Elektronik',
                  'fabric': 'Kain',
                  'others': 'Lainnya',
                  'kabel': 'Kabel'
                };
                
                return basicTranslations[typeId.toLowerCase()] || typeId;
              };
              
              return (
                <div key={typeId} className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">
                      {getWasteTypeName(typeId)}
                    </p>
                    <p className="text-sm text-gray-500">Jumlah: {quantity} kantong</p>
                    {wasteData[typeId]?.weight > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="text-blue-600">
                          Nilai: Rp {(wasteData[typeId].weight * price).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Masukkan berat (kg)"
                    value={wasteData[typeId]?.weight || ''}
                    onChange={(e) => handleWeightChange(typeId, e.target.value)}
                    className="text-right"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Selesaikan Pengumpulan
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default MasterUpdateCollection;