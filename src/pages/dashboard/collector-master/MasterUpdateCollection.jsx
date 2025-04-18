import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
  Calculator
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  calculateTotalValue, 
  WASTE_PRICES,
  getWasteDetails 
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
    const fetchPickup = async () => {
      try {
        const pickupRef = doc(db, 'masterBankRequests', pickupId);
        const pickupSnap = await getDoc(pickupRef);

        if (!pickupSnap.exists()) {
          throw new Error('Pickup not found');
        }

        const data = pickupSnap.data();
        setPickup({ id: pickupSnap.id, ...data });
        
        // Initialize waste data from existing quantities
        const initialWasteData = {};
        Object.entries(data.wasteQuantities || {}).forEach(([type, quantity]) => {
          initialWasteData[type] = {
            quantity: quantity,
            weight: 0 // New weight to be added
          };
        });
        setWasteData(initialWasteData);
        setError(null);
      } catch (err) {
        console.error('Error fetching pickup:', err);
        setError(err.message);
        Swal.fire({
          title: 'Error',
          text: err.message,
          icon: 'error',
          confirmButtonColor: '#10B981'
        });
      } finally {
        setLoading(false);
      }
    };

    if (pickupId) {
      fetchPickup();
    }
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
        throw new Error('Please enter weights for at least one waste type');
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
        title: 'Success',
        text: 'Collection has been recorded successfully',
        icon: 'success',
        confirmButtonColor: '#10B981'
      }).then(() => {
        navigate('/dashboard/collector');
      });

    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.message,
        icon: 'error',
        confirmButtonColor: '#10B981'
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
              Return to Dashboard
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
            <h1 className="text-2xl font-semibold text-gray-800">Record Collection</h1>
            <p className="text-sm text-gray-500">Enter waste weights for collection #{pickup?.id?.slice(0, 6)}</p>
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
            Value Calculation
          </h3>
          <div className="p-4 rounded-lg bg-blue-50">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total Value</p>
                <p className="mt-1 text-2xl font-semibold text-blue-700">
                  Rp {totalValue.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  Based on waste type market values
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
              
              return (
                <div key={typeId} className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">
                      {wasteDetails ? wasteDetails.name : typeId}
                    </p>
                    <p className="text-sm text-gray-500">Quantity: {quantity} bags</p>
                    {wasteData[typeId]?.weight > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="text-blue-600">
                          Value: Rp {(wasteData[typeId].weight * price).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Enter weight (kg)"
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
              Complete Collection
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default MasterUpdateCollection;