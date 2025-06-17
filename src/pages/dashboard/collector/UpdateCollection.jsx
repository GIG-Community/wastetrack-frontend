import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  ArrowLeft,
  User,
  Loader2,
  AlertCircle,
  Coins,
  Calculator
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  calculatePoints, 
  calculateTotalValue, 
  WASTE_PRICES, 
  POINTS_CONVERSION_RATE,
  getWasteDetails 
} from '../../../lib/constants';

// Reusable Input Component
const Input = ({ label, error, className = "", ...props }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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

const UpdateCollection = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wasteData, setWasteData] = useState({});
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const { pickupId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPickup = async () => {
      try {
        const pickupRef = doc(db, 'pickups', pickupId);
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

  // Calculate points and value whenever waste data changes
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
    const points = calculatePoints(total);

    setCalculatedPoints(points);
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

      const pickupRef = doc(db, 'pickups', pickupId);
      
      // Prepare wastes object with weights, values and points
      const wastes = {};
      
      Object.entries(wasteData).forEach(([type, data]) => {
        if (data.weight > 0) {
          // Get base type (remove any prefixes/suffixes)
          const baseType = type.split('-').pop().toLowerCase();
          const price = WASTE_PRICES[baseType] || 1000; // Default price if type not found
          
          wastes[type] = {
            weight: data.weight,
            value: data.weight * price,
            points: calculatePoints(data.weight)
          };
        }
      });

      await updateDoc(pickupRef, {
        status: 'completed',
        completedAt: new Date(),
        wastes,
        totalValue,
        pointsAmount: calculatedPoints,
        pointsAdded: false, // Will be set to true by the waste bank
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
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
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
        <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => navigate('/dashboard/collector')}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
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
      <main className={`flex-1 p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard/collector')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Record Collection</h1>
            <p className="text-sm text-gray-500">Enter waste weights for collection #{pickup?.id?.slice(0, 6)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-start gap-4">
            <User className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-medium text-gray-900">{pickup?.userName}</h3>
              <p className="text-sm text-gray-600">{pickup?.phone}</p>
              <p className="text-sm text-gray-600 mt-1">{pickup?.wasteBankName}</p>
            </div>
          </div>
        </div>

        {/* Points and Value Summary */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            Points & Value Calculation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Coins className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Total Points</p>
                  <p className="text-2xl font-semibold text-emerald-700 mt-1">
                    {calculatedPoints} points
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">1 point per {POINTS_CONVERSION_RATE} Rupiah</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Value</p>
                  <p className="text-2xl font-semibold text-blue-700 mt-1">
                    Rp {totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Based on waste type market values
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waste Weights Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="space-y-4">
            {pickup?.wasteQuantities && Object.entries(pickup.wasteQuantities).map(([typeId, quantity]) => {
              const wasteDetails = getWasteDetails(typeId);
              const price = WASTE_PRICES[typeId] || 0;
              
              return (
                <div key={typeId} className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {wasteDetails ? wasteDetails.name : typeId}
                    </p>
                    <p className="text-sm text-gray-500">Quantity: {quantity} bags</p>
                    {wasteData[typeId]?.weight > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="text-emerald-600">
                          Points: {calculatePoints(wasteData[typeId].weight * price)}
                        </p>
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

          <div className="mt-6 flex justify-end">
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

export default UpdateCollection;