import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  LeafyGreen,
  Loader2,
  AlertCircle,
  TreesIcon,
  Building2,
  Package,
  Download,
  Calendar,
  Recycle,
  DropletIcon,
  Scale,
  HelpCircle,
  Truck
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Import carbon calculation utilities
import { emissionFactors } from '../../../lib/carbonConstants';
import { calculateDistance } from '../../../lib/utils/distanceCalculator';
import { calculateEmissions, emissionFactorTransport, truckCapacity } from '../../../lib/utils/emissionCalculator';
import AiReportButton from '../../../components/AiReportButton';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];
const TRANSACTION_COLORS = {
  pickup: '#10B981',        // emerald for pickups
  masterRequest: '#6366F1', // indigo for master bank requests
  industryRequest: '#F59E0B' // amber for industry requests
};

// User Role Colors
const USER_ROLE_COLORS = {
  wastebank_admin: '#10B981',  // emerald for waste banks
  wastebank_master: '#6366F1', // indigo for master banks  
  industry: '#F59E0B',         // amber for industry
  government: '#EF4444',       // red for government
  default: '#71717A'           // gray for unknown roles
};

// Base Components
const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg 
      text-gray-700 text-sm transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      hover:border-emerald-500/50 
      ${className}`}
    {...props}
  />
);

// Filter Button Component
const FilterButton = ({ active, onClick, color = 'emerald', children }) => {
  const colorClasses = {
    emerald: active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'text-gray-600 hover:bg-gray-50',
    indigo: active ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'text-gray-600 hover:bg-gray-50',
    amber: active ? 'bg-amber-100 text-amber-800 border-amber-300' : 'text-gray-600 hover:bg-gray-50',
    gray: active ? 'bg-gray-200 text-gray-800 border-gray-300' : 'text-gray-600 hover:bg-gray-50',
    red: active ? 'bg-red-100 text-red-800 border-red-300' : 'text-gray-600 hover:bg-gray-50',
  };

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded-md border ${active ? 'font-medium border' : 'border-transparent'} ${colorClasses[color]}`}
    >
      {children}
    </button>
  );
};

// Replace calculateEnvironmentalImpact function with simplified carbon-focused version
const calculateEnvironmentalImpact = (wastes = {}, distance = 0) => {
  try {
    let impact = {
      carbon: 0,
      landfill: 0,
      carbonOffset: 0,
      potentialCredits: 0,
      transportEmissions: 0,
      processingEmissions: 0,
      totalEmissions: 0
    };

    if (!wastes) {
      console.warn('Waste data is missing. Using zero values.');
      return impact;
    }

    let totalWeight = 0;
    let recyclingSavings = 0;
    let wasteManagementEmission = 0;

    // Calculate impacts for each waste type using emission factors
    Object.entries(wastes).forEach(([type, data]) => {
      if (!data || !data.weight) return;
      
      const weight = Number(data.weight);
      totalWeight += weight;
      
      // Use emission factors from imported constants
      const emissionFactor = emissionFactors[type] || 0;
      
      if (emissionFactor < 0) {
        // Negative factor means recycling savings
        recyclingSavings += Math.abs(emissionFactor) * weight;
        impact.carbonOffset += Math.abs(emissionFactor) * weight;
      } else {
        // Positive factor means emissions
        wasteManagementEmission += emissionFactor * weight;
        impact.processingEmissions += emissionFactor * weight;
      }
      
      // Landfill space saved estimation (cubic meters)
      const density = 
        type.includes('plastic') ? 0.1 :
        type.includes('paper') || type.includes('kardus') ? 0.15 :
        type.includes('metal') ? 0.05 :
        type.includes('glass') ? 0.08 : 0.2; // default for organic
      
      impact.landfill += weight * density;
      
      // Potential carbon credits (very rough estimate)
      impact.potentialCredits += (recyclingSavings * 0.001); // Convert kg to tons
    });

    // Calculate transport emissions if distance is provided
    let transportEmission = 0;
    if (distance > 0 && totalWeight > 0) {
      const truckTrips = Math.ceil(totalWeight / truckCapacity);
      transportEmission = emissionFactorTransport * distance * truckTrips;
      impact.transportEmissions = transportEmission;
    }

    // Calculate total carbon impact
    impact.carbon = wasteManagementEmission - recyclingSavings;
    impact.totalEmissions = wasteManagementEmission + transportEmission - recyclingSavings;

    return impact;
  } catch (error) {
    console.error('Error calculating impact:', error);
    return {
      carbon: 0,
      landfill: 0,
      carbonOffset: 0,
      potentialCredits: 0,
      transportEmissions: 0,
      processingEmissions: 0,
      totalEmissions: 0
    };
  }
};

const StatCard = ({ icon: Icon, label, value, subValue }) => (
  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-emerald-50">
        <Icon className="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-800">{value}</p>
        {subValue && (
          <p className="mt-1 text-sm text-gray-500">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, description, children }) => (
  <div className="p-6 bg-white border border-gray-200 rounded-xl">
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <InfoTooltip>{description}</InfoTooltip>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="relative inline-block group">
    <HelpCircle className="w-4 h-4 text-gray-400 transition-colors hover:text-gray-600" />
    <div className="absolute invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all -translate-x-1/2 bg-gray-800 rounded-lg opacity-0 bottom-full left-1/2 group-hover:opacity-100 group-hover:visible">
      {children}
      <div className="absolute -mt-1 -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-gray-800" />
    </div>
  </div>
);

const GovernmentReports = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickupData, setPickupData] = useState([]);
  const [masterRequests, setMasterRequests] = useState([]);
  const [industryRequests, setIndustryRequests] = useState([]);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [masterBanks, setMasterBanks] = useState([]);
  const [industryUsers, setIndustryUsers] = useState([]);
  const [mapCenter] = useState([-7.2575, 112.7521]); // Default: Surabaya
  const [dateRange, setDateRange] = useState('month');
  const [transactionFilters, setTransactionFilters] = useState([]);
  const [facilityFilters, setFacilityFilters] = useState([]);
  const [showBankLocations, setShowBankLocations] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [stats, setStats] = useState({
    totalImpact: {
      carbon: 0,
      landfill: 0
    },
    wasteTypes: [],
    locations: [],
    monthlyTrends: [],
    bankPerformance: {
      small: {
        totalTransactions: 0,
        totalValue: 0,
        avgTransactionValue: 0,
        topPerformers: []
      },
      master: {
        totalTransactions: 0,
        totalValue: 0,
        avgTransactionValue: 0,
        topPerformers: []
      }
    },
    transactionLocations: []
  });

  const [carbonStats, setCarbonStats] = useState({
    totalOffset: 0,
    potentialCredits: 0,
    monthlyOffset: [],
    wasteTypeOffset: [],
    projectedSavings: 0,
    carbonEfficiency: 0,
    transportEmissions: 0,
    processingEmissions: 0,
    distanceTraveled: 0
  });

  // Toggle function for transaction filters
  const toggleTransactionFilter = (filter) => {
    if (transactionFilters.includes(filter)) {
      setTransactionFilters(transactionFilters.filter(f => f !== filter));
    } else {
      setTransactionFilters([...transactionFilters, filter]);
    }
  };

  // Toggle function for facility filters
  const toggleFacilityFilter = (filter) => {
    if (facilityFilters.includes(filter)) {
      setFacilityFilters(facilityFilters.filter(f => f !== filter));
    } else {
      setFacilityFilters([...facilityFilters, filter]);
    }
  };

  // Helper function to clear all filters
  const clearFilters = () => {
    setTransactionFilters([]);
    setFacilityFilters([]);
  };

  // Fetch data
  useEffect(() => {
    setLoading(true);
    
    try {
      // Create query references
      const wasteBankQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_admin')
      );
      const masterBankQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master')
      );
      const industryQuery = query(
        collection(db, 'users'),
        where('role', '==', 'industry')
      );
      const pickupsQuery = query(collection(db, 'pickups'));
      const masterRequestsQuery = query(collection(db, 'masterBankRequests'));
      const industryRequestsQuery = query(collection(db, 'industryRequests')); 
      
      // Create unsubscribe functions array for cleanup
      const unsubscribes = [];
      
      // Data containers
      let wasteBankData = [];
      let masterBankData = [];
      let industryData = [];
      let pickupsData = [];
      let masterRequestsData = [];
      let industryRequestsData = []; 
      
      // Counter to track when all data sources are loaded
      let dataSourcesLoaded = 0;
      const totalDataSources = 6; // Updated to 6 to include industry users
      
      // Process data once all sources are loaded
      const processData = () => {
        if (dataSourcesLoaded < totalDataSources) return;
        
        // Filter completed pickups
        const completedPickups = pickupsData.filter(pickup => pickup.status === 'completed');
        
        // Filter completed master requests
        const completedMasterRequests = masterRequestsData.filter(request => request.status === 'completed');
        
        // Filter completed industry requests
        const completedIndustryRequests = industryRequestsData.filter(request => request.status === 'completed');
        
        // Set the data states
        setWasteBanks(wasteBankData);
        setMasterBanks(masterBankData);
        setIndustryUsers(industryData);
        setPickupData(completedPickups);
        setMasterRequests(completedMasterRequests);
        setIndustryRequests(completedIndustryRequests);
        
        // Process statistics with all data
        calculateStatistics(
          wasteBankData, 
          masterBankData, 
          industryData,
          completedPickups, 
          completedMasterRequests, 
          completedIndustryRequests
        );
        
        setLoading(false);
      };
      
      // Set up real-time listeners
      
      // Listen for waste banks
      const wasteBankUnsubscribe = onSnapshot(
        wasteBankQuery,
        (snapshot) => {
          wasteBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching waste banks:', error);
          setError('Failed to load waste bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(wasteBankUnsubscribe);
      
      // Listen for master banks
      const masterBankUnsubscribe = onSnapshot(
        masterBankQuery,
        (snapshot) => {
          masterBankData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master banks:', error);
          setError('Failed to load master bank data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterBankUnsubscribe);
      
      // Listen for industry users
      const industryUnsubscribe = onSnapshot(
        industryQuery,
        (snapshot) => {
          industryData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching industry users:', error);
          setError('Failed to load industry user data');
          setLoading(false);
        }
      );
      unsubscribes.push(industryUnsubscribe);
      
      // Listen for pickups
      const pickupsUnsubscribe = onSnapshot(
        pickupsQuery,
        (snapshot) => {
          pickupsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching pickups:', error);
          setError('Failed to load pickup data');
          setLoading(false);
        }
      );
      unsubscribes.push(pickupsUnsubscribe);
      
      // Listen for master requests
      const masterRequestsUnsubscribe = onSnapshot(
        masterRequestsQuery,
        (snapshot) => {
          masterRequestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching master requests:', error);
          setError('Failed to load master request data');
          setLoading(false);
        }
      );
      unsubscribes.push(masterRequestsUnsubscribe);
      
      // Listen for industry requests
      const industryRequestsUnsubscribe = onSnapshot(
        industryRequestsQuery,
        (snapshot) => {
          industryRequestsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dataSourcesLoaded++;
          processData();
        },
        (error) => {
          console.error('Error fetching industry requests:', error);
          setError('Failed to load industry request data');
          setLoading(false);
        }
      );
      unsubscribes.push(industryRequestsUnsubscribe);
      
      // Cleanup function to unsubscribe from all listeners when component unmounts
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
      
    } catch (err) {
      console.error('Error setting up data listeners:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  }, [dateRange]);

  // Enhanced impact calculation - reference the standalone function
  const calculateImpact = (wastes = {}, distance = 0) => {
    return calculateEnvironmentalImpact(wastes, distance);
  };

  // Update the calculateStatistics function to fix the avgMonthlyOffset error
  const calculateStatistics = (wasteBanks, masterBanks, industries, pickups, masterRequests, industryRequests) => {
    try {
      // Calculate waste bank performance
      const bankPerformance = {
        small: {
          totalTransactions: pickups.length,
          totalValue: pickups.reduce((acc, pickup) => acc + (pickup.totalValue || 0), 0),
          avgTransactionValue: 0,
          topPerformers: []
        },
        master: {
          totalTransactions: masterRequests.length,
          totalValue: masterRequests.reduce((acc, request) => acc + (request.totalValue || 0), 0),
          avgTransactionValue: 0,
          topPerformers: []
        }
      };

      // Calculate averages
      bankPerformance.small.avgTransactionValue = 
        bankPerformance.small.totalValue / (bankPerformance.small.totalTransactions || 1);
      bankPerformance.master.avgTransactionValue = 
        bankPerformance.master.totalValue / (bankPerformance.master.totalTransactions || 1);

      // Calculate top performing waste banks
      const smallBankStats = {};
      pickups.forEach(pickup => {
        if (!smallBankStats[pickup.wasteBankId]) {
          smallBankStats[pickup.wasteBankId] = {
            id: pickup.wasteBankId,
            name: pickup.wasteBankName,
            transactions: 0,
            totalValue: 0,
            totalWeight: 0
          };
        }

        smallBankStats[pickup.wasteBankId].transactions += 1;
        smallBankStats[pickup.wasteBankId].totalValue += pickup.totalValue || 0;
        
        Object.values(pickup.wastes || {}).forEach(waste => {
          smallBankStats[pickup.wasteBankId].totalWeight += waste.weight || 0;
        });
      });

      // Calculate top performing master banks
      const masterBankStats = {};
      masterRequests.forEach(request => {
        if (!masterBankStats[request.masterBankId]) {
          masterBankStats[request.masterBankId] = {
            id: request.masterBankId,
            name: request.masterBankName,
            transactions: 0,
            totalValue: 0,
            totalWeight: 0
          };
        }

        masterBankStats[request.masterBankId].transactions += 1;
        masterBankStats[request.masterBankId].totalValue += request.totalValue || 0;
        
        Object.values(request.wastes || {}).forEach(waste => {
          masterBankStats[request.masterBankId].totalWeight += waste.weight || 0;
        });
      });

      // Sort and set top performers
      bankPerformance.small.topPerformers = Object.values(smallBankStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
      bankPerformance.master.topPerformers = Object.values(masterBankStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      // Calculate total environmental impact from all transactions (focused on carbon)
      const totalImpact = {
        carbon: 0,
        landfill: 0
      };

      // Track total distance for carbon calculations
      let totalDistanceTraveled = 0;
      let totalTransportEmissions = 0;
      let totalProcessingEmissions = 0;
      let totalCarbonOffset = 0;
      let totalPotentialCredits = 0;
      let totalWeight = 0;

      // Process small bank pickups
      pickups.forEach(pickup => {
        let distance = 0;
        
        // Calculate distance if coordinates are available
        if (pickup.coordinates && pickup.wasteBankCoordinates) {
          distance = calculateDistance(
            pickup.coordinates.lat, 
            pickup.coordinates.lng,
            pickup.wasteBankCoordinates.lat, 
            pickup.wasteBankCoordinates.lng
          );
          totalDistanceTraveled += distance;
        }
        
        const impact = calculateEnvironmentalImpact(pickup.wastes, distance);
        totalImpact.carbon += impact.carbon;
        totalImpact.landfill += impact.landfill;
        
        totalTransportEmissions += impact.transportEmissions;
        totalProcessingEmissions += impact.processingEmissions;
        totalCarbonOffset += impact.carbonOffset;
        totalPotentialCredits += impact.potentialCredits;
        
        // Calculate total weight
        Object.values(pickup.wastes || {}).forEach(waste => {
          totalWeight += waste.weight || 0;
        });
      });

      // Process master bank requests
      masterRequests.forEach(request => {
        let distance = 0;
        
        // Calculate distance if coordinates are available
        if (request.location?.coordinates && request.masterBankCoordinates) {
          distance = calculateDistance(
            request.location.coordinates.lat, 
            request.location.coordinates.lng,
            request.masterBankCoordinates.lat, 
            request.masterBankCoordinates.lng
          );
          totalDistanceTraveled += distance;
        }
        
        const impact = calculateEnvironmentalImpact(request.wastes, distance);
        totalImpact.carbon += impact.carbon;
        totalImpact.landfill += impact.landfill;
        
        totalTransportEmissions += impact.transportEmissions;
        totalProcessingEmissions += impact.processingEmissions;
        totalCarbonOffset += impact.carbonOffset;
        totalPotentialCredits += impact.potentialCredits;
        
        // Calculate total weight
        Object.values(request.wastes || {}).forEach(waste => {
          totalWeight += waste.weight || 0;
        });
      });

      // Calculate waste type distribution combining both pickups and master requests
      const wasteTypes = {};
      const processWastes = (wastes, source) => {
        Object.entries(wastes || {}).forEach(([type, data]) => {
          if (!wasteTypes[type]) {
            wasteTypes[type] = { weight: 0, impact: 0, sources: { small: 0, master: 0 } };
          }
          wasteTypes[type].weight += data.weight || 0;
          wasteTypes[type].impact += calculateImpact({ [type]: data }).carbon;
          wasteTypes[type].sources[source] += data.weight || 0;
        });
      };

      pickups.forEach(pickup => processWastes(pickup.wastes, 'small'));
      masterRequests.forEach(request => processWastes(request.wastes, 'master'));

      // Update all locations data combining all types of facilities
      const locations = [
        ...wasteBanks.map(bank => {
          const coordinates = bank.profile?.location?.coordinates;
          return {
            id: bank.id,
            name: bank.profile?.institution || 'Unknown Bank',
            type: 'wastebank_admin',
            role: 'wastebank_admin',
            coordinates: coordinates ? {
              lat: coordinates.latitude || coordinates._lat || coordinates[0],
              lng: coordinates.longitude || coordinates._long || coordinates[1]
            } : null,
            address: bank.profile?.location?.address,
            city: bank.profile?.location?.city,
            province: bank.profile?.location?.province,
            phone: bank.profile?.phone,
            stats: smallBankStats[bank.id] || {
              transactions: 0,
              totalValue: 0,
              totalWeight: 0
            }
          };
        }),
        ...masterBanks.map(bank => {
          const coordinates = bank.profile?.location?.coordinates;
          return {
            id: bank.id,
            name: bank.profile?.institution || 'Unknown Master Bank',
            type: 'wastebank_master',
            role: 'wastebank_master',
            coordinates: coordinates ? {
              lat: coordinates.latitude || coordinates._lat || coordinates[0],
              lng: coordinates.longitude || coordinates._long || coordinates[1]
            } : null,
            address: bank.profile?.location?.address,
            city: bank.profile?.location?.city,
            province: bank.profile?.location?.province,
            phone: bank.profile?.phone,
            stats: masterBankStats[bank.id] || {
              transactions: 0,
              totalValue: 0,
              totalWeight: 0
            }
          };
        }),
        ...industries.map(industry => {
          const coordinates = industry.profile?.location?.coordinates;
          return {
            id: industry.id,
            name: industry.profile?.institution || industry.profile?.institutionName || 'Unknown Industry',
            type: 'industry',
            role: 'industry',
            coordinates: coordinates ? {
              lat: coordinates.latitude || coordinates._lat || coordinates[0],
              lng: coordinates.longitude || coordinates._long || coordinates[1]
            } : null,
            address: industry.profile?.location?.address,
            city: industry.profile?.location?.city,
            province: industry.profile?.location?.province,
            phone: industry.profile?.phone,
            stats: {
              transactions: 0, // We can calculate this if needed
              totalValue: 0,
              totalWeight: 0
            }
          };
        })
      ].filter(location => location.coordinates && location.coordinates.lat && location.coordinates.lng);

      // Create array to store all transaction locations
      const transactionLocations = [];

      // Process pickup locations
      pickups.forEach(pickup => {
        if (pickup.coordinates && pickup.coordinates.lat && pickup.coordinates.lng) {
          const totalWeight = Object.values(pickup.wastes || {}).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0);
          
          transactionLocations.push({
            id: pickup.id,
            type: 'pickup',
            coordinates: {
              lat: pickup.coordinates.lat,
              lng: pickup.coordinates.lng
            },
            address: pickup.location || '',
            date: pickup.completedAt,
            totalValue: pickup.totalValue || 0,
            totalWeight,
            wasteBankName: pickup.wasteBankName || 'Unknown Bank',
            userName: pickup.userName || 'Unknown User'
          });
        }
      });

      // Process master bank request locations
      masterRequests.forEach(request => {
        if (request.location && request.location.coordinates && 
            request.location.coordinates.lat && request.location.coordinates.lng) {
          
          const totalWeight = Object.values(request.wastes || {}).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0);
          
          transactionLocations.push({
            id: request.id,
            type: 'masterRequest',
            coordinates: {
              lat: request.location.coordinates.lat,
              lng: request.location.coordinates.lng
            },
            address: request.location.address || '',
            date: request.completedAt,
            totalValue: request.totalValue || 0,
            totalWeight,
            wasteBankName: request.wasteBankName || 'Unknown Bank',
            masterBankName: request.masterBankName || 'Unknown Master Bank'
          });
        }
      });

      // Process industry request locations
      industryRequests.forEach(request => {
        if (request.location && request.location.coordinates && 
            request.location.coordinates.lat && request.location.coordinates.lng) {
          
          const totalWeight = request.totalWeight || 
            Object.values(request.wastes || {}).reduce((sum, waste) => sum + (Number(waste.weight) || 0), 0);
          
          transactionLocations.push({
            id: request.id,
            type: 'industryRequest',
            coordinates: {
              lat: request.location.coordinates.lat,
              lng: request.location.coordinates.lng
            },
            address: request.location.address || request.address || '',
            date: request.completedAt,
            totalValue: request.totalValue || 0,
            totalWeight,
            industryName: request.industryName || 'Unknown Industry',
            masterBankName: request.masterBankName || 'Unknown Master Bank'
          });
        }
      });

      // Calculate monthly trends but only focus on carbon
      const monthlyData = {};
      const processTransaction = (transaction, type) => {
        // Add null check for completedAt
        if (!transaction.completedAt) return;
        
        // Check if completedAt is a Firebase timestamp or regular date
        const timestamp = transaction.completedAt;
        let date;
        
        if (timestamp.seconds) {
          // Firebase Timestamp
          date = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
          // Regular Date object
          date = timestamp;
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          // String or number timestamp
          date = new Date(timestamp);
        } else {
          // Invalid timestamp format
          console.warn('Invalid timestamp format:', timestamp);
          return;
        }
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: date.toLocaleString('default', { month: 'short' }),
            weight: 0,
            impact: 0,
            smallBankValue: 0,
            masterBankValue: 0,
            transactions: {
              small: 0,
              master: 0
            }
          };
        }

        const impact = calculateEnvironmentalImpact(transaction.wastes);
        monthlyData[monthKey].impact += Math.abs(impact.carbon);

        if (type === 'small') {
          monthlyData[monthKey].smallBankValue += transaction.totalValue || 0;
          monthlyData[monthKey].transactions.small += 1;
        } else {
          monthlyData[monthKey].masterBankValue += transaction.totalValue || 0;
          monthlyData[monthKey].transactions.master += 1;
        }

        Object.values(transaction.wastes || {}).forEach(waste => {
          monthlyData[monthKey].weight += waste.weight || 0;
        });
      };

      pickups.forEach(pickup => processTransaction(pickup, 'small'));
      masterRequests.forEach(request => processTransaction(request, 'master'));

      // Enhanced carbon offset calculations
      totalCarbonOffset = 0;
      totalPotentialCredits = 0;
      const monthlyOffset = {};
      const wasteTypeOffset = {};

      // Process carbon offset from small bank pickups with null check
      pickups.forEach(pickup => {
        const impact = calculateImpact(pickup.wastes);
        totalCarbonOffset += impact.carbonOffset;
        totalPotentialCredits += impact.potentialCredits;

        // Calculate monthly offset with null check for timestamp
        if (pickup.completedAt) {
          let date;
          if (pickup.completedAt.seconds) {
            date = new Date(pickup.completedAt.seconds * 1000);
          } else if (pickup.completedAt instanceof Date) {
            date = pickup.completedAt;
          } else {
            date = new Date(pickup.completedAt);
          }
          
          const monthKey = date.toISOString().slice(0, 7);
          monthlyOffset[monthKey] = (monthlyOffset[monthKey] || 0) + impact.carbonOffset;
        }

        // Calculate offset by waste type
        Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
          if (!wasteTypeOffset[type]) {
            wasteTypeOffset[type] = {
              offset: 0,
              credits: 0,
              weight: 0
            };
          }
          const typeImpact = calculateImpact({ [type]: data });
          wasteTypeOffset[type].offset += typeImpact.carbonOffset;
          wasteTypeOffset[type].credits += typeImpact.potentialCredits;
          wasteTypeOffset[type].weight += data.weight || 0;
        });
      });

      // Process carbon offset from master requests with null check
      masterRequests.forEach(request => {
        const impact = calculateImpact(request.wastes);
        totalCarbonOffset += impact.carbonOffset;
        totalPotentialCredits += impact.potentialCredits;

        // Add to monthly offset with null check
        if (request.completedAt) {
          let date;
          if (request.completedAt.seconds) {
            date = new Date(request.completedAt.seconds * 1000);
          } else if (request.completedAt instanceof Date) {
            date = request.completedAt;
          } else {
            date = new Date(request.completedAt);
          }
          
          const monthKey = date.toISOString().slice(0, 7);
          monthlyOffset[monthKey] = (monthlyOffset[monthKey] || 0) + impact.carbonOffset;
        }

        // Add to waste type offset
        Object.entries(request.wastes || {}).forEach(([type, data]) => {
          if (!wasteTypeOffset[type]) {
            wasteTypeOffset[type] = {
              offset: 0,
              credits: 0,
              weight: 0
            };
          }
          const typeImpact = calculateImpact({ [type]: data });
          wasteTypeOffset[type].offset += typeImpact.carbonOffset;
          wasteTypeOffset[type].credits += typeImpact.potentialCredits;
          wasteTypeOffset[type].weight += data.weight || 0;
        });
      });

      // Calculate projected savings (simple linear projection)
      const monthlyOffsetArray = Object.entries(monthlyOffset)
        .map(([month, offset]) => ({
          month,
          offset
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      let projectedSavings = 0;
      let avgMonthlyOffset = 0; // Define outside if statement so it's in scope later
      
      if (monthlyOffsetArray.length > 0) {
        avgMonthlyOffset = monthlyOffsetArray.reduce((sum, item) => sum + item.offset, 0) / monthlyOffsetArray.length;
        projectedSavings = avgMonthlyOffset * 12; // Annual projection
      }

      // Calculate carbon efficiency (offset per kg of waste)
      const carbonEfficiency = totalWeight > 0 ? totalCarbonOffset / totalWeight : 0;

      // Update carbon stats
      setCarbonStats({
        totalOffset: totalCarbonOffset,
        potentialCredits: totalPotentialCredits,
        transportEmissions: totalTransportEmissions,
        processingEmissions: totalProcessingEmissions,
        totalEmissions: totalProcessingEmissions + totalTransportEmissions - totalCarbonOffset,
        distanceTraveled: totalDistanceTraveled,
        monthlyOffset: monthlyOffsetArray || [],
        wasteTypeOffset: Object.entries(wasteTypeOffset || {}).map(([type, data]) => ({
          type,
          ...data
        })),
        projectedSavings: avgMonthlyOffset * 12, // Now avgMonthlyOffset is in scope
        carbonEfficiency
      });

      // Update stats state but remove water and trees
      setStats({
        totalImpact,
        wasteTypes: Object.entries(wasteTypes || {}).map(([type, data]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          ...data
        })),
        locations,
        transactionLocations,
        monthlyTrends: Object.values(monthlyData),
        bankPerformance
      });
    } catch (error) {
      console.error('Error in calculateStatistics:', error);
      setError('Failed to process environmental statistics. Please try again later.');
    }
  };

  // Simplified map content that focuses only on transactions and users with multi-filter support
  const renderMapContent = () => {
    return (
      <>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location markers (facilities) */}
        {showBankLocations && stats.locations
          .filter(location => 
            facilityFilters.length === 0 || 
            facilityFilters.includes(location.role)
          )
          .map((location) => {
            if (!location.coordinates?.lat || !location.coordinates?.lng) return null;
            
            const roleColor = USER_ROLE_COLORS[location.role] || USER_ROLE_COLORS.default;
            
            return (
              <React.Fragment key={location.id}>
                <Circle
                  center={[location.coordinates.lat, location.coordinates.lng]}
                  radius={300} // Standard size for facility markers
                  pathOptions={{
                    color: roleColor,
                    fillColor: roleColor,
                    fillOpacity: 0.2
                  }}
                />
                <Marker
                  position={[location.coordinates.lat, location.coordinates.lng]}
                  icon={L.divIcon({
                    className: 'custom-marker-icon',
                    html: `<div class="w-8 h-8 rounded-full bg-white border-4 flex items-center justify-center"
                          style="border-color: ${roleColor}">
                      <div class="w-4 h-4 rounded-full" style="background-color: ${roleColor}"></div>
                    </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                  })}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-medium text-gray-900">
                        {location.name}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {location.role === 'wastebank_admin' ? 'Bank Sampah Unit' : 
                         location.role === 'wastebank_master' ? 'Bank Sampah Induk' : 
                         location.role === 'industry' ? 'Industri' : 'Fasilitas'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {location.address}
                      </p>
                      <p className="text-xs text-gray-500">
                        {location.city}, {location.province}
                      </p>
                      {location.phone && (
                        <p className="mt-1 text-xs text-gray-500">
                          Tel: {location.phone}
                        </p>
                      )}
                      {(location.role === 'wastebank_admin' || location.role === 'wastebank_master') && (
                        <div className="pt-2 mt-2 border-t border-gray-200">
                          <p className="text-sm font-medium text-emerald-600">
                            Rp {Math.round(location.stats.totalValue).toLocaleString('id')} nilai ekonomi
                          </p>
                          <p className="text-xs text-gray-500">
                            {location.stats.totalWeight.toFixed(1)} kg sampah terkumpul
                          </p>
                          <p className="text-xs text-gray-500">
                            {location.stats.transactions} transaksi selesai
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
        })}
        
        {/* Transaction Location Markers with multi-filter support */}
        {stats.transactionLocations
          .filter(tx => 
            transactionFilters.length === 0 || 
            transactionFilters.includes(tx.type)
          )
          .map((transaction) => {
            if (!transaction.coordinates?.lat || !transaction.coordinates?.lng) return null;
            
            // Determine marker color based on transaction type
            const color = TRANSACTION_COLORS[transaction.type];
            
            // Scale radius based on weight (make it smaller for clarity)
            const radius = Math.min(Math.max(transaction.totalWeight * 50, 200), 1000);
            
            return (
              <React.Fragment key={`tx-${transaction.id}`}>
                <Circle
                  center={[transaction.coordinates.lat, transaction.coordinates.lng]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.25
                  }}
                />
                <Marker
                  position={[transaction.coordinates.lat, transaction.coordinates.lng]}
                  icon={L.divIcon({
                    className: 'custom-transaction-marker',
                    html: `<div class="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center"
                          style="border-color: ${color}">
                      <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
                    </div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 24]
                  })}
                >
                  <Popup>
                    <div className="max-w-xs p-2">
                      <h3 className="font-medium text-gray-900">
                        {transaction.type === 'pickup' ? 'Pickup Personal' : 
                        transaction.type === 'masterRequest' ? 'Master Bank Request' : 
                        'Industry Request'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 break-words">
                        {transaction.address}
                      </p>
                      <div className="pt-2 mt-2 border-t border-gray-200">
                        {transaction.type === 'pickup' && (
                          <>
                            <p className="text-sm text-gray-700">Bank: {transaction.wasteBankName}</p>
                            <p className="text-sm text-gray-700">Pengguna: {transaction.userName}</p>
                          </>
                        )}
                        {transaction.type === 'masterRequest' && (
                          <>
                            <p className="text-sm text-gray-700">Bank Sampah: {transaction.wasteBankName}</p>
                            <p className="text-sm text-gray-700">Bank Induk: {transaction.masterBankName}</p>
                          </>
                        )}
                        {transaction.type === 'industryRequest' && (
                          <>
                            <p className="text-sm text-gray-700">Industri: {transaction.industryName}</p>
                            <p className="text-sm text-gray-700">Bank Induk: {transaction.masterBankName}</p>
                          </>
                        )}
                        <p className="mt-1 text-sm font-medium text-emerald-600">
                          {transaction.totalValue > 0 ? `Rp ${Math.round(transaction.totalValue).toLocaleString('id')}` : '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.totalWeight.toFixed(1)} kg sampah
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.date && new Date(
                            typeof transaction.date === 'object' && transaction.date.seconds 
                              ? transaction.date.seconds * 1000 
                              : transaction.date
                          ).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
        })}
      </>
    );
  };

  // Enhanced Map Legend Component showing active filters
  const MapLegend = () => {
    return (
      <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-md border border-gray-200 max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium text-gray-800">Legenda Peta:</h4>
          {(transactionFilters.length > 0 || facilityFilters.length > 0) && (
            <button 
              onClick={clearFilters}
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              Reset Filter
            </button>
          )}
        </div>
        
        {/* Transaction Types Legend */}
        <div className="mb-3">
          <h5 className="mb-1 text-xs font-medium text-gray-600">Jenis Transaksi:</h5>
          <div className="mb-3 space-y-1.5">
            <div className={`flex items-center gap-2 p-0.5 rounded ${transactionFilters.includes('pickup') ? 'bg-emerald-50' : ''}`}>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-600">Pickup (Personal)</span>
            </div>
            <div className={`flex items-center gap-2 p-0.5 rounded ${transactionFilters.includes('masterRequest') ? 'bg-indigo-50' : ''}`}>
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Master Bank Request</span>
            </div>
            <div className={`flex items-center gap-2 p-0.5 rounded ${transactionFilters.includes('industryRequest') ? 'bg-amber-50' : ''}`}>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-gray-600">Industry Request</span>
            </div>
          </div>
        </div>
        
        {/* Facility Types Legend */}
        {showBankLocations && (
          <div className="pt-2 mb-3 border-t border-gray-200">
            <h5 className="mb-1 text-xs font-medium text-gray-600">Jenis Fasilitas:</h5>
            <div className="mb-3 space-y-1.5">
              <div className={`flex items-center gap-2 p-0.5 rounded ${facilityFilters.includes('wastebank_admin') ? 'bg-emerald-50' : ''}`}>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-gray-600">Bank Sampah Unit</span>
              </div>
              <div className={`flex items-center gap-2 p-0.5 rounded ${facilityFilters.includes('wastebank_master') ? 'bg-indigo-50' : ''}`}>
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Bank Sampah Induk</span>
              </div>
              <div className={`flex items-center gap-2 p-0.5 rounded ${facilityFilters.includes('industry') ? 'bg-amber-50' : ''}`}>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-gray-600">Industri</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{error}</h3>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Header with Indonesian Language */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
             <div className="flex items-center gap-4">
  <Select
    value={dateRange}
    onChange={(e) => setDateRange(e.target.value)}
    className="w-44"
  >
    <option value="month">Bulan Ini</option>
    <option value="quarter">3 Bulan Terakhir</option>
    <option value="year">Tahun Ini</option>
    <option value="all">Semua Waktu</option>
  </Select>
  
  <AiReportButton 
  reportData={{
    displayedMetrics: [
      {
        name: "Dampak Karbon",
        value: `${Math.round(stats.totalImpact.carbon)} kg CO₂e`,
        description: "Total emisi yang berhasil dicegah"
      },
      {
        name: "Tempat Pembuangan",
        value: `${stats.totalImpact.landfill.toFixed(1)} m³`,
        description: "Ruang TPA yang dihemat"
      }
    ],
    wasteDistribution: stats.wasteTypes.map(type => ({
      name: type.name,
      weight: type.weight,
      impact: type.impact
    })),
    mapData: {
      wasteBankLocations: stats.locations.filter(l => l.role === 'wastebank_admin').length,
      masterBankLocations: stats.locations.filter(l => l.role === 'wastebank_master').length,
      industryLocations: stats.locations.filter(l => l.role === 'industry').length,
      transactionCount: stats.transactionLocations.length
    },
    performanceTrends: {
      timePeriod: dateRange,
      topPerformers: stats.bankPerformance.small.topPerformers.slice(0, 3).map(p => p.name),
      carbonTrend: carbonStats.monthlyOffset.length > 1 ? 
        (carbonStats.monthlyOffset[carbonStats.monthlyOffset.length-1].offset > 
         carbonStats.monthlyOffset[0].offset ? "meningkat" : "menurun") : "stabil"
    }
  }}
/>
</div>
  
              <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                <LeafyGreen className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Laporan Dampak Lingkungan</h1>
                <p className="text-sm text-gray-500">
                  Analisis lengkap pengelolaan sampah dan pengurangan emisi karbon
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-44"
              >
                <option value="month">Bulan Ini</option>
                <option value="quarter">3 Bulan Terakhir</option>
                <option value="year">Tahun Ini</option>
                <option value="all">Semua Waktu</option>
              </Select>
            </div>
          </div>

          {/* Explanation Panel for Users */}
          <div className="p-4 mb-6 text-blue-700 border border-blue-100 rounded-lg bg-blue-50">
            <h3 className="mb-2 text-lg font-medium">Panduan Membaca Laporan:</h3>
            <ul className="ml-4 text-sm list-disc">
              <li className="mb-1">Laporan ini menampilkan dampak positif dari pengelolaan sampah terhadap lingkungan</li>
              <li className="mb-1">Karbon (CO₂e): Jumlah gas rumah kaca yang berhasil dikurangi</li>
              <li className="mb-1">1 ton karbon ≈ Emisi dari 1 mobil selama 3 bulan</li>
              <li className="mb-1">Klik pada grafik untuk melihat detail lebih lanjut</li>
            </ul>
          </div>

          {/* Carbon Offset Overview in Indonesian */}
          <div className="grid grid-cols-1 gap-4 mb-8 lg:grid-cols-4">
            <div className="p-6 text-white bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Recycle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Total Pengurangan Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold">
                {Math.round(carbonStats.totalOffset)} ton CO₂e
              </p>
              <p className="text-emerald-100">
                Setara dengan {Math.round(carbonStats.totalOffset * 0.2)} mobil tidak beroperasi
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Kredit Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.potentialCredits.toFixed(1)} kredit
              </p>
              <p className="text-sm text-gray-500">
                Potensi nilai kredit karbon yang bisa dijual
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Efisiensi Karbon</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {carbonStats.carbonEfficiency.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                Ton CO₂e per ton sampah yang dikelola
              </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Proyeksi Tahunan</h3>
              </div>
              <p className="mb-2 text-3xl font-bold text-gray-900">
                {Math.round(carbonStats.projectedSavings)} ton
              </p>
              <p className="text-sm text-gray-500">
                Perkiraan pengurangan karbon per tahun
              </p>
            </div>
          </div>

          {/* Stats Grid in Indonesian */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Recycle}
              label="Dampak Karbon"
              value={`${Math.round(stats.totalImpact.carbon)} kg CO₂e`}
              subValue="Total emisi yang berhasil dicegah"
            />
            <StatCard
              icon={Building2}
              label="Bank Sampah Aktif"
              value={wasteBanks.length}
              subValue={`${pickupData.length} total pengambilan sampah`}
            />
          </div>

          {/* Map and Charts Grid in Indonesian */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Map Container with Instructions */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm lg:col-span-2 rounded-xl">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-800">Peta Sebaran Transaksi & Fasilitas</h3>
                <p className="text-xs text-gray-500">
                  Visualisasi menunjukkan lokasi transaksi dan fasilitas pengelolaan sampah. 
                  Anda dapat memilih kombinasi filter untuk melihat data spesifik.
                </p>
                
                {/* Enhanced filtering UI with multiple selection */}
                <div className="flex flex-wrap gap-6 p-3 mt-3 bg-white border border-gray-100 rounded-lg">
                  {/* Facility filters */}
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Fasilitas:</p>
                      <FilterButton
                        active={showBankLocations}
                        onClick={() => setShowBankLocations(!showBankLocations)}
                        color="gray"
                      >
                        {showBankLocations ? 'Tampilkan' : 'Sembunyikan'}
                      </FilterButton>
                    </div>
                    
                    {showBankLocations && (
                      <div className="flex flex-wrap gap-1">
                        <FilterButton
                          active={facilityFilters.length === 0}
                          onClick={() => setFacilityFilters([])}
                          color="gray"
                        >
                          Semua Fasilitas
                        </FilterButton>
                        
                        <FilterButton
                          active={facilityFilters.includes('wastebank_admin')}
                          onClick={() => toggleFacilityFilter('wastebank_admin')}
                          color="emerald"
                        >
                          Bank Sampah Unit
                        </FilterButton>
                        
                        <FilterButton
                          active={facilityFilters.includes('wastebank_master')}
                          onClick={() => toggleFacilityFilter('wastebank_master')}
                          color="indigo"
                        >
                          Bank Sampah Induk
                        </FilterButton>
                        
                        <FilterButton
                          active={facilityFilters.includes('industry')}
                          onClick={() => toggleFacilityFilter('industry')}
                          color="amber"
                        >
                          Industri
                        </FilterButton>
                      </div>
                    )}
                  </div>
                  
                  {/* Transaction type filters - can be combined */}
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Jenis Transaksi:</p>
                      {transactionFilters.length > 0 && (
                        <FilterButton
                          active={false}
                          onClick={() => setTransactionFilters([])}
                          color="gray"
                        >
                          Hapus Filter
                        </FilterButton>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <FilterButton
                        active={transactionFilters.length === 0}
                        onClick={() => setTransactionFilters([])}
                        color="gray"
                      >
                        Semua Transaksi
                      </FilterButton>
                      
                      <FilterButton
                        active={transactionFilters.includes('pickup')}
                        onClick={() => toggleTransactionFilter('pickup')}
                        color="emerald"
                      >
                        Pickup Personal
                      </FilterButton>
                      
                      <FilterButton
                        active={transactionFilters.includes('masterRequest')}
                        onClick={() => toggleTransactionFilter('masterRequest')}
                        color="indigo"
                      >
                        Master Bank Request
                      </FilterButton>
                      
                      <FilterButton
                        active={transactionFilters.includes('industryRequest')}
                        onClick={() => toggleTransactionFilter('industryRequest')}
                        color="amber"
                      >
                        Industry Request
                      </FilterButton>
                    </div>
                  </div>
                </div>
                
                {/* Filter summary */}
                {(facilityFilters.length > 0 || transactionFilters.length > 0) && (
                  <div className="p-2 mt-2 border border-blue-100 rounded-md bg-blue-50">
                    <p className="flex items-center text-xs text-blue-700">
                      <span className="mr-1 font-medium">Filter aktif:</span>
                      {facilityFilters.length > 0 && (
                        <span>
                          Fasilitas: {facilityFilters.length} terpilih
                        </span>
                      )}
                      {facilityFilters.length > 0 && transactionFilters.length > 0 && (
                        <span className="mx-1">|</span>
                      )}
                      {transactionFilters.length > 0 && (
                        <span>
                          Transaksi: {transactionFilters.length} terpilih
                        </span>
                      )}
                      <button
                        onClick={clearFilters}
                        className="ml-auto text-xs text-blue-600 underline hover:text-blue-800"
                      >
                        Reset
                      </button>
                    </p>
                  </div>
                )}
              </div>
              <div className="relative h-[450px]">
                <MapContainer 
                  center={mapCenter} 
                  zoom={13} 
                  className="w-full h-full"
                >
                  {renderMapContent()}
                </MapContainer>
                <MapLegend />
              </div>
            </div>

            {/* Top Performers List in Indonesian */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Bank Sampah Terbaik
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Daftar bank sampah dengan kinerja terbaik berdasarkan nilai ekonomi yang dihasilkan
              </p>
              <div className="space-y-4 overflow-y-auto max-h-[300px]">
                {stats.bankPerformance.small.topPerformers
                  .concat(stats.bankPerformance.master.topPerformers)
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .slice(0, 5)
                  .map((location, index) => (
                    <div 
                      key={location.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100">
                        <span className="text-sm font-medium text-emerald-700">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {location.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {location.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">
                          Rp {Math.round(location.totalValue).toLocaleString('id')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {location.transactions} transaksi
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Charts Row in Indonesian */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Monthly Trends */}
            <ChartCard 
              title="Tren Dampak Bulanan" 
              description="Berat sampah terkumpul dan dampak karbon per bulan"
            >
              <div className="p-4 mb-2 text-xs text-gray-600 rounded-lg bg-gray-50">
                <p className="font-medium">Cara Membaca Grafik ini:</p>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Batang hijau: Berat sampah yang dikumpulkan (kg)</li>
                  <li>Batang ungu: Jumlah karbon yang dikurangi (kg CO₂e)</li>
                  <li>Semakin tinggi batang, semakin besar dampak positifnya</li>
                </ul>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[...stats.monthlyTrends].sort((a, b) => {
                      // Extract year and month for proper chronological sorting
                      const aDate = new Date(`${a.month} 1, ${a.year || new Date().getFullYear()}`);
                      const bDate = new Date(`${b.month} 1, ${b.year || new Date().getFullYear()}`);
                      return aDate - bDate;
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#71717A"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value} kg`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value} CO₂e`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'weight') return [`${value.toFixed(1)} kg`, 'Berat Sampah'];
                        return [`${value.toFixed(1)} kg CO₂e`, 'Dampak Karbon'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="weight" fill="#10B981" name="weight" />
                    <Bar yAxisId="right" dataKey="impact" fill="#6366F1" name="impact" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Waste Type Distribution with Bar Chart */}
            <ChartCard 
              title="Dampak per Jenis Sampah" 
              description="Kontribusi pengurangan karbon berdasarkan jenis sampah"
            >
              <div className="p-4 mb-2 text-xs text-gray-600 rounded-lg bg-gray-50">
                <p className="font-medium">Cara Membaca Grafik ini:</p>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Grafik menunjukkan dampak karbon masing-masing jenis sampah</li>
                  <li>Panjang batang menunjukkan kontribusi terhadap pengurangan karbon</li>
                  <li>Warna yang berbeda menunjukkan jenis sampah yang berbeda</li>
                </ul>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={stats.wasteTypes
                      .slice(0, 10)
                      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))}
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis 
                      type="number"
                      stroke="#71717A" 
                      fontSize={12}
                      tickFormatter={(value) => `${value.toFixed(1)} kg`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      stroke="#71717A" 
                      fontSize={12}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                    />
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(2)} kg CO₂e`, 'Dampak Karbon']}
                      labelFormatter={(label) => `Jenis: ${label}`}
                    />
                    <Bar 
                      dataKey="impact" 
                      name="Dampak"
                      radius={[0, 4, 4, 0]}
                      fill={(entry) => {
                        // Use different colors based on whether the impact is positive or negative
                        return entry.impact < 0 ? '#10B981' : '#EF4444';
                      }}
                    >
                      {stats.wasteTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 overflow-y-auto max-h-[150px] pr-2">
                <p className="mb-2 text-sm font-medium text-gray-700">Rincian per Jenis Sampah:</p>
                <div className="space-y-3">
                  {stats.wasteTypes
                    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
                    .map((type, index) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${type.impact < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Math.round(type.impact)} kg CO₂e
                        </p>
                        <p className="text-xs text-gray-500">
                          {type.weight.toFixed(1)} kg terkumpul
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Environmental Impact Summary in Indonesian */}
          <div className="p-6 border bg-emerald-50 rounded-xl border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TreesIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Ringkasan Dampak Lingkungan</h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Total dampak lingkungan positif dari kegiatan pengelolaan sampah:
                </p>
                <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Pengurangan Karbon</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {Math.round(stats.totalImpact.carbon)} kg CO₂e
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">emisi yang tercegah</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Tempat Pembuangan</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {stats.totalImpact.landfill.toFixed(1)} m³
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">ruang TPA yang dihemat</p>
                  </div>
                </div>

                <div className="p-4 mt-4 border rounded-lg border-emerald-200 bg-white/70">
                  <h4 className="font-medium text-emerald-800">Apa artinya angka-angka ini?</h4>
                  <ul className="mt-2 ml-4 text-sm list-disc text-emerald-700">
                    <li>Pengurangan {Math.round(stats.totalImpact.carbon)} kg CO₂e setara dengan {Math.round(stats.totalImpact.carbon/150)} orang tidak menggunakan kendaraan bermotor selama sebulan</li>
                    <li>Ruang TPA yang dihemat ({stats.totalImpact.landfill ? stats.totalImpact.landfill.toFixed(1) : '0'}) m³ setara dengan volume {Math.round((stats.totalImpact.landfill || 0) / 0.5)} mobil</li>
                    <li>Transportasi sampah menghasilkan sekitar {(carbonStats.transportEmissions || 0).toFixed(2)} kg CO₂e emisi dari {(carbonStats.distanceTraveled || 0).toFixed(1)} km jarak tempuh</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GovernmentReports;