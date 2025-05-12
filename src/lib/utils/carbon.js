import { calculateDistance } from './distanceCalculator.js';

// Carbon emission factors for different waste types (kg CO2 per kg of waste)
const WASTE_EMISSION_FACTORS = {
  'kardus-bagus': 2.93, // Paper and cardboard
  'kabel': 3.41, // Metals/cables
  'plastik': 2.54, // Plastics
  'botol-plastik': 2.5, // Plastic bottles
  'organic': 0.5, // Organic waste
  'elektronik': 4.3, // Electronic waste
  'kaca': 0.85, // Glass
  'aluminium': 8.14, // Aluminium
  'besi': 2.89, // Iron/steel
  'kertas': 2.75, // Paper
  'default': 2.0 // Default factor for unspecified waste types
};

// Calculate the carbon emissions prevented by recycling different waste types
export function calculateRecyclingBenefit(wastes) {
  let totalCarbonReduction = 0;
  
  // Process waste entries from the provided wastes object structure
  Object.entries(wastes).forEach(([wasteType, wasteData]) => {
    if (wasteData && typeof wasteData === 'object' && wasteData.weight) {
      const emissionFactor = WASTE_EMISSION_FACTORS[wasteType] || WASTE_EMISSION_FACTORS['default'];
      totalCarbonReduction += emissionFactor * wasteData.weight;
    }
  });
  
  return totalCarbonReduction;
}

// Calculate additional environmental metrics
export function calculateEnvironmentalMetrics(carbonReduction) {
  return {
    treesEquivalent: carbonReduction / 20, // Approximately 20kg CO2 absorbed by one tree annually
    waterSaved: carbonReduction * 1.5, // Liters of water saved (approximate conversion)
    energySaved: carbonReduction * 4.5 // kWh of energy saved (approximate conversion)
  };
}

// Calculate transportation emissions for a pickup
export function calculateTransportEmissions(pickup) {
  if (!pickup.coordinates || !pickup.wasteBankCoordinates) {
    return 0;
  }
  
  // Calculate distance in km
  const distance = calculateDistance(
    pickup.coordinates.lat,
    pickup.coordinates.lng,
    pickup.wasteBankCoordinates.lat,
    pickup.wasteBankCoordinates.lng
  );
  
  // Average emission factor for vehicles (kg CO2 per km)
  const vehicleEmissionFactor = 0.12;
  
  return distance * vehicleEmissionFactor;
}

// Get a description of the environmental impact
export function getImpactDescription(carbonReduction) {
  const { treesEquivalent, waterSaved, energySaved } = calculateEnvironmentalMetrics(carbonReduction);
  
  return {
    mainText: `Your recycling activities prevented approximately ${carbonReduction.toFixed(1)} kg of CO₂ emissions`,
    treeText: `This is equivalent to ${treesEquivalent.toFixed(1)} trees planted for a year`,
    waterText: `Saved approximately ${waterSaved.toFixed(0)} liters of water`,
    energyText: `Conserved about ${energySaved.toFixed(0)} kWh of energy`
  };
}
