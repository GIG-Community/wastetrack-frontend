import { EMISSION_FACTORS, TRANSPORT, WASTE_CATEGORIES } from '../constants';
import { calculateDistance } from './distanceCalculator';
import { emissionFactors } from '../carbonConstants';

// Constants for carbon emission calculation
const emissionFactorTransport = 0.0000191; // EFSt value in kg CO2e/kg-km
const truckCapacity = 2500; // cap value in kg

export function calculateWasteEmissions(wastes, distance) {
  let totalEmissions = 0;
  let totalWeight = 0;

  // Calculate waste management emissions
  Object.entries(wastes).forEach(([wasteType, data]) => {
    const weight = data.weight || 0;
    const category = WASTE_CATEGORIES[wasteType];
    const emissionFactor = EMISSION_FACTORS[wasteType] || EMISSION_FACTORS[category] || 0;
    
    totalEmissions += emissionFactor * weight; // EFsi * mi
    totalWeight += weight;
  });

  // Calculate transportation emissions
  const transportEmissions = TRANSPORT.EMISSION_FACTOR * (totalWeight / TRANSPORT.VEHICLE_CAPACITY) * distance;
  
  return totalEmissions + transportEmissions;
}

/**
 * Calculates emissions for a pickup with detailed breakdown of different emission types
 * @param {Object} pickup - The pickup object containing waste data
 * @param {number} distance - The distance in kilometers
 * @returns {Object} Detailed emission breakdown
 */
export function calculateEmissions(pickup, distance) {
  let totalWasteWeight = 0;
  let wasteManagementEmission = 0;
  let recyclingSavings = 0;
  
  // Calculate total weight and waste management emissions
  if (pickup.wastes) {
    Object.entries(pickup.wastes).forEach(([wasteType, data]) => {
      const weight = data.weight || 0;
      totalWasteWeight += weight;
      
      const emissionFactor = emissionFactors[wasteType] || 0.001; // Default if waste type not found
      
      // Separate positive and negative emissions (recycling savings)
      if (emissionFactor >= 0) {
        wasteManagementEmission += emissionFactor * weight;
      } else {
        recyclingSavings += Math.abs(emissionFactor * weight);
      }
    });
  } else if (pickup.wasteQuantities) {
    // Fallback to wasteQuantities if wastes not available
    Object.keys(pickup.wasteQuantities).forEach(wasteType => {
      const weight = pickup.wasteQuantities[wasteType];
      totalWasteWeight += weight;
      
      const emissionFactor = emissionFactors[wasteType] || 0.001; // Default if waste type not found
      
      // Separate positive and negative emissions (recycling savings)
      if (emissionFactor >= 0) {
        wasteManagementEmission += emissionFactor * weight;
      } else {
        recyclingSavings += Math.abs(emissionFactor * weight);
      }
    });
  }
  
  // Calculate transportation emission
  const transportEmission = emissionFactorTransport * (totalWasteWeight / truckCapacity) * distance;
  
  // Log detailed information
  console.log(`Berat sampah: ${totalWasteWeight}kg, Jarak: ${distance.toFixed(2)}km`);
  console.log(`Emisi transportasi: ${transportEmission.toFixed(6)} kg CO₂e`);
  console.log(`Emisi pengolahan: ${wasteManagementEmission.toFixed(4)} kg CO₂e`);
  console.log(`Penghematan daur ulang: ${recyclingSavings.toFixed(4)} kg CO₂e`);
  
  // Total net emission for this pickup (emissions minus savings)
  const netEmission = wasteManagementEmission + transportEmission - recyclingSavings;
  
  return {
    wasteManagementEmission,
    transportEmission,
    recyclingSavings,
    totalEmission: netEmission,
    totalWeight: totalWasteWeight
  };
}

// Export constants to make them accessible
export { emissionFactorTransport, truckCapacity };
