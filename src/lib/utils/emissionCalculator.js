import { EMISSION_FACTORS, TRANSPORT, WASTE_CATEGORIES } from '../constants';
import { calculateDistance } from './distanceCalculator';

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
