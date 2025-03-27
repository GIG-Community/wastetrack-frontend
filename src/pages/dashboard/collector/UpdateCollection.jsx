import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  MapPin, 
  Package,
  Scale,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Phone,
  ArrowRight,
  Info,
  ArrowLeft,
  Truck
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import Swal from 'sweetalert2';

// Constants
const wasteTypes = [
  {
    id: 'organic',
    name: 'Organic Waste',
    price: 10000,
    icon: '🌱'
  },
  {
    id: 'plastic',
    name: 'Plastic',
    price: 5000,
    icon: '♳'
  },
  {
    id: 'paper',
    name: 'Paper & Cardboard',
    price: 8000,
    icon: '📄'
  },
  {
    id: 'metal',
    name: 'Metal',
    price: 12000,
    icon: '🥫'
  }
];

// Base components
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

const Button = ({ variant = "primary", isLoading, className = "", children, ...props }) => {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700"
  };

  return (
    <button
      className={`px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Badge = ({ variant = "default", children, className = "" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Card Components
const PickupCard = ({ pickup, onSelect }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Pickup #{pickup.id.slice(0, 6)}</h3>
            <Badge variant={pickup.status} className="mt-1">
              {pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
            </Badge>
          </div>
        </div>
        <Badge variant="default">{pickup.time}</Badge>
      </div>

      {/* Customer Info */}
      <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <User className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{pickup.userName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">{pickup.phone || 'No phone number'}</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button onClick={() => onSelect(pickup)} className="w-full">
        <Scale className="w-4 h-4" />
        Record Collection
      </Button>
    </div>
  );
};

const CollectionForm = ({ pickup, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    wastes: {},
    notes: ''
  });

  const [totals, setTotals] = useState({
    totalWeight: 0,
    totalValue: 0
  });

  const [errors, setErrors] = useState({});

  // Initialize waste data
  useEffect(() => {
    const initialWastes = {};
    (pickup.wasteTypes || []).forEach(typeId => {
      initialWastes[typeId] = { weight: '', notes: '' };
    });
    setFormData(prev => ({ ...prev, wastes: initialWastes }));
  }, [pickup.wasteTypes]);

  const handleWasteChange = (typeId, weight) => {
    setFormData(prev => ({
      ...prev,
      wastes: {
        ...prev.wastes,
        [typeId]: { weight: weight }
      }
    }));

    // Hitung total
    const newWastes = {
      ...formData.wastes,
      [typeId]: { weight: weight }
    };
    
    let totalWeight = 0;
    let totalValue = 0;

    Object.entries(newWastes).forEach(([wasteTypeId, waste]) => {
      const wasteType = wasteTypes.find(w => w.id === wasteTypeId);
      if (wasteType && waste.weight) {
        const weightNum = Number(waste.weight) || 0;
        totalWeight += weightNum;
        totalValue += weightNum * wasteType.price;
      }
    });

    setTotals({ totalWeight, totalValue });
  };


  const validateForm = () => {
    const newErrors = {};
    const hasWeight = Object.values(formData.wastes).some(waste => 
      Number(waste.weight) > 0
    );

    if (!hasWeight) {
      newErrors.general = 'At least one waste type must have weight recorded';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let totalValue = 0;
    const processedWastes = {};

    Object.entries(formData.wastes).forEach(([typeId, waste]) => {
      const wasteType = wasteTypes.find(w => w.id === typeId);
      if (wasteType && waste.weight) {
        const weight = Number(waste.weight);
        const value = weight * wasteType.price;
        totalValue += value;
        processedWastes[typeId] = {
          weight: weight,
          value: value
        };
      }
    });

    const finalData = {
      wastes: processedWastes,
      totalValue,
      notes: formData.notes,
      status: 'completed',
      completedAt: new Date()
    };

    try {
      await onSubmit(finalData);
    } catch (error) {
      setErrors({ submit: 'Failed to submit collection. Please try again.' });
    }
  };
  

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{pickup.userName}</h3>
            <p className="text-sm text-gray-600 mt-1">{pickup.phone}</p>
          </div>
        </div>
      </div>

     {/* Waste Collection */}
     <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Collection Details</h3>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Weight</p>
            <p className="font-medium text-gray-900">{totals.totalWeight.toFixed(1)} kg</p>
          </div>
        </div>
        
        {errors.general && (
          <div className="p-3 mb-4 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-700">{errors.general}</p>
          </div>
        )}

        <div className="space-y-4">
          {(pickup.wasteTypes || []).map(typeId => {
            const wasteType = wasteTypes.find(w => w.id === typeId);
            if (!wasteType) return null;

            const weight = formData.wastes[typeId]?.weight || '';
            const value = Number(weight) * wasteType.price;

            return (
              <div key={typeId} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl">{wasteType.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{wasteType.name}</p>
                    <p className="text-sm text-gray-500">Rp {wasteType.price.toLocaleString()} / kg</p>
                  </div>
                  <Input
                    type="number"
                    className="w-32"
                    placeholder="Weight (kg)"
                    value={weight}
                    onChange={(e) => handleWasteChange(typeId, e.target.value)}
                    min="0"
                    step="0.1"
                  />
                </div>
                {weight > 0 && (
                  <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700">
                      Value: Rp {value.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total Summary */}
        {totals.totalValue > 0 && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-emerald-800">Total Collection Value</p>
                <p className="text-xs text-emerald-600">For {totals.totalWeight.toFixed(1)} kg of waste</p>
              </div>
              <p className="text-lg font-semibold text-emerald-700">
                Rp {totals.totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <Input
          label="Collection Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any notes about this collection"
          as="textarea"
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} className="min-w-[200px]">
          Complete Collection
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};

const UpdateCollection = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPickups();
    }
  }, [currentUser?.uid]);

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('collectorId', '==', currentUser.uid),
        where('status', 'in', ['assigned', 'in_progress'])
      );
      
      const snapshot = await getDocs(pickupsQuery);
      const pickupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPickups(pickupsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setError('Failed to load pickups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCollection = async (updateData) => {
    setSubmitting(true);
    try {
      const pickupRef = doc(db, 'pickups', selectedPickup.id);
      await updateDoc(pickupRef, {
        wastes: updateData.wastes,
        totalValue: updateData.totalValue,
        notes: updateData.notes,
        status: updateData.status,
        completedAt: updateData.completedAt,
        updatedAt: new Date()
      });

      await fetchPickups();
      setSelectedPickup(null);

      Swal.fire({
        title: 'Collection Completed',
        text: 'Waste collection has been successfully recorded',
        icon: 'success',
        confirmButtonColor: '#10B981',
        timer: 2000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error updating collection:', error);
      Swal.fire({
        title: 'Update Failed',
        text: 'Failed to update collection. Please try again.',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter pickups based on search term
  const filteredPickups = pickups.filter(pickup => {
    const searchString = searchTerm.toLowerCase();
    const userName = (pickup.userName || '').toLowerCase();
    return userName.includes(searchString);
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedPickup && (
              <button
                onClick={() => setSelectedPickup(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-500" />
              </button>
            )}
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <ClipboardList className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
            <h1 className="text-2xl font-semibold text-gray-800">
                {selectedPickup ? 'Record Collection' : 'My Collections'}
              </h1>
              <p className="text-sm text-gray-500">
                {selectedPickup ? 'Update pickup details' : 'View and manage your assigned collections'}
              </p>
            </div>
          </div>

          {!selectedPickup && (
            <div className="flex gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Pending Collections</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {pickups.filter(p => p.status === 'assigned').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {pickups.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-gray-500">Loading collections...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
            <p className="text-gray-500">{error}</p>
            <Button
              onClick={fetchPickups}
              variant="primary"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : selectedPickup ? (
          <CollectionForm
            pickup={selectedPickup}
            onSubmit={handleUpdateCollection}
            isSubmitting={submitting}
          />
        ) : (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-10 py-2.5 bg-white border border-gray-200 rounded-lg
                    text-gray-700 text-sm transition-all
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {filteredPickups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No collections found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search' : 'You have no assigned collections'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPickups.map((pickup) => (
                  <PickupCard
                    key={pickup.id}
                    pickup={pickup}
                    onSelect={setSelectedPickup}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default UpdateCollection;