// Define waste types structure (shared with SchedulePickup)
export const wasteTypes = [
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

// Mapping from waste type IDs to prices
export const WASTE_PRICES = {
  'kardus-bagus': 1300,
  'kardus-jelek': 1200,
  'koran': 3500,
  'hvs': 2000,
  'buram': 1000,
  'majalah': 1000,
  'sak-semen': 700,
  'duplek': 400,
  
  'pet-bening': 4200,
  'pet-biru': 3500,
  'pet-warna': 1200,
  'pet-kotor': 500,
  'pet-jelek': 100,
  'pet-galon': 1500,
  'tutup-amdk': 2500,
  'tutup-galon': 2000,
  'tutup-campur': 1000,
  
  'ps-kaca': 1000,
  'keping-cd': 3500,
  'galon-utuh': 5000,
  'bak-hitam': 3000,
  'bak-campur': 1500,
  'plastik-keras': 200,
  
  'plastik-bening': 800,
  'kresek': 300,
  'sablon-tipis': 200,
  'sablon-tebal': 300,
  'karung-kecil': 200,
  'sachet': 50,
  'lembaran-campur': 50,
  
  'besi-tebal': 2500,
  'sepeda': 1500,
  'besi-tipis': 500,
  'kaleng': 1000,
  'seng': 1000,
  'tembaga': 55000,
  'kuningan': 15000,
  'perunggu': 8000,
  'aluminium': 9000,
  
  'botol-bensin': 800,
  'botol-bir': 500,
  'botol-kecap': 300,
  'botol-bening': 100,
  'botol-warna': 50,
  
  'karung-100': 1300,
  'karung-200': 1800,
  
  'karak': 1800,
  'gembos': 300,
  'jelantah': 4000,
  'kabel': 3000
};

// Master bank prices (20% markup from regular prices)
export const MASTER_WASTE_PRICES = Object.fromEntries(
  Object.entries(WASTE_PRICES).map(([key, value]) => [
    key,
    Math.ceil(value * 1.2) // 20% markup rounded up
  ])
);

// Points conversion rate (1 point = X Rupiah)
export const POINTS_CONVERSION_RATE = 100;

// Define waste categories for environmental impact calculations
export const WASTE_CATEGORIES = {
  // Metals
  'aluminium': 'metal',
  'besi-tebal': 'metal',
  'besi-tipis': 'metal',
  'kaleng': 'metal',
  'kuningan': 'metal',
  'perunggu': 'metal',
  'seng': 'metal',
  'tembaga': 'metal',
  'sepeda': 'metal',
  
  // Paper/Cardboard
  'kardus-bagus': 'paper',
  'kardus-jelek': 'paper',
  'koran': 'paper',
  'majalah': 'paper',
  'hvs': 'paper',
  'duplek': 'paper',
  'buram': 'paper',
  'sak-semen': 'paper',
  
  // Plastics
  'botol-bening': 'plastic',
  'botol-bensin': 'plastic',
  'botol-bir': 'plastic',
  'botol-kecap': 'plastic',
  'botol-warna': 'plastic',
  'galon-utuh': 'plastic',
  'pet-bening': 'plastic',
  'pet-biru': 'plastic',
  'pet-galon': 'plastic',
  'pet-jelek': 'plastic',
  'pet-kotor': 'plastic',
  'pet-warna': 'plastic',
  'plastik-bening': 'plastic',
  'plastik-keras': 'plastic',
  'ps-kaca': 'plastic',
  'kresek': 'plastic',
  'bak-campur': 'plastic',
  'bak-hitam': 'plastic',
  
  // Organic
  'jelantah': 'organic',
  'karak': 'organic',
  'gembos': 'organic',

  // Other recyclables
  'karung-100': 'other',
  'karung-200': 'other',
  'karung-kecil': 'other',
  'keping-cd': 'other',
  'kabel': 'other',
  'sachet': 'other',
  'sablon-tebal': 'other',
  'sablon-tipis': 'other',
  'lembaran-campur': 'other',
  'tutup-amdk': 'other',
  'tutup-campur': 'other',
  'tutup-galon': 'other'
};

// Environmental impact multipliers per category
export const WASTE_IMPACT_MULTIPLIERS = {
  plastic: { carbon: 2.5, water: 3.0, energy: 2.0 },
  paper: { carbon: 1.8, water: 2.5, energy: 1.5 },
  metal: { carbon: 3.0, water: 2.0, energy: 3.5 },
  glass: { carbon: 2.0, water: 1.5, energy: 2.5 },
  organic: { carbon: 1.2, water: 1.0, energy: 1.0 },
  default: { carbon: 1.5, water: 1.5, energy: 1.5 }
};

// Emission factors for waste types and categories
export const EMISSION_FACTORS = {
  // Basic waste types
  organic: 0.627,  // Landfill emission factor for food waste
  plastic: 2.5,    // Average for plastic waste
  paper: 1.1,      // Paper/cardboard waste
  metal: 4.0,      // Metal waste
  glass: 0.9,      // Glass waste
  
  // Specific waste types
  'kabel': 0.5,        // CO2 eq/kg
  'kardus-bagus': 0.25 // CO2 eq/kg
};

// Recycling factors for waste categories
export const RECYCLING_FACTORS = {
  plastic: 1.5,   // Recycling plastic saves vs new production
  paper: 0.8,     // Paper recycling benefit
  metal: 3.3,     // Metal recycling benefit
  glass: 0.6      // Glass recycling benefit
};

// Transport constants
export const TRANSPORT = {
  EMISSION_FACTOR: 0.2,    // kg CO2 eq/km
  VEHICLE_CAPACITY: 1000   // kg
};

// Available time slots for pickups
export const TIME_SLOTS = [
  { time: '08:00-10:00', available: true },
  { time: '10:00-12:00', available: true },
  { time: '13:00-15:00', available: true },
  { time: '15:00-17:00', available: true }
];

// Tier thresholds
export const TIER_THRESHOLDS = {
  rookie: { min: 0, max: 499, next: 'bronze' },
  bronze: { min: 500, max: 999, next: 'silver' },
  silver: { min: 1000, max: 2499, next: 'gold' },
  gold: { min: 2500, max: 4999, next: 'platinum' },
  platinum: { min: 5000, max: Infinity, next: null }
};

// Helper function to get current tier
export const getCurrentTier = (points) => {
  const tiers = Object.entries(TIER_THRESHOLDS);
  for (const [tier, { min, max }] of tiers) {
    if (points >= min && points <= max) {
      return tier;
    }
  }
  return 'rookie';
};

// Helper function to calculate points
export const calculatePoints = (totalValue) => {
  if (typeof totalValue !== 'number' || totalValue < 0) return 0;
  return Math.floor(totalValue / POINTS_CONVERSION_RATE); 
};

// Helper function to get waste details by ID
export const getWasteDetails = (typeId) => {
  for (const category of wasteTypes) {
    if (category.subcategories) {
      for (const subcat of category.subcategories) {
        const found = subcat.types.find(t => t.id === typeId);
        if (found) return found;
      }
    } else if (category.types) {
      const found = category.types.find(t => t.id === typeId);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to calculate environmental impact
export const calculateEnvironmentalImpact = (pickups) => {
  return pickups.reduce((impact, pickup) => {
    if (pickup.status !== 'completed') {
      return impact;
    }

    if (pickup.wastes) {
      Object.entries(pickup.wastes).forEach(([wasteType, data]) => {
        const category = WASTE_CATEGORIES[wasteType];
        const multipliers = WASTE_IMPACT_MULTIPLIERS[category] || WASTE_IMPACT_MULTIPLIERS.default;
        const weightInKg = data?.weight || 0;
        
        // Add to total waste bags (assume average 1kg per item for most types)
        impact.waste.total += Math.ceil(weightInKg);
        
        // Calculate environmental impact based on category multipliers
        impact.impact.carbonReduced += multipliers?.carbon * weightInKg;
        impact.impact.waterSaved += multipliers?.water * weightInKg;
        impact.impact.landfillSpaceSaved += multipliers?.landfillPerKg || 0;
        
        if (multipliers?.treesPerKg) {
          impact.impact.treesPreserved += multipliers.treesPerKg * weightInKg;
        }
      });
    }

    // Update pickup stats
    impact.pickups.total++;
    if (pickup.status === 'completed') impact.pickups.completed++;
    if (pickup.status === 'pending') impact.pickups.pending++;

    return impact;
  }, {
    pickups: { total: 0, pending: 0, completed: 0 },
    waste: { total: 0 },
    impact: {
      carbonReduced: 0,
      waterSaved: 0,
      treesPreserved: 0,
      landfillSpaceSaved: 0
    }
  });
};

// Helper function to calculate total value
export const calculateTotalValue = (wastes) => {
  let totalValue = 0;
  
  Object.entries(wastes).forEach(([typeId, data]) => {
    const price = WASTE_PRICES[typeId] || 0;
    if (price === 0) {
      console.warn(`No price found for waste type: ${typeId}`);
    }
    const quantity = data.weight || data.quantity || 0;
    totalValue += price * quantity;
  });
  
  return totalValue;
};

// Helper function to get storage data from collections
export const calculateStorageFromCollections = (collections) => {
  const storage = {};
  
  collections.forEach(collection => {
    if (collection.status === 'completed' && collection.wastes) {
      Object.entries(collection.wastes).forEach(([typeId, data]) => {
        storage[typeId] = (storage[typeId] || 0) + (data.weight || 0);
      });
    }
  });
  
  return storage;
};