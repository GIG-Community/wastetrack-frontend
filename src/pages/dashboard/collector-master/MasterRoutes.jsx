import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
    MapPin, 
    Navigation2 as Route,
    Navigation,
    Loader2,
    AlertCircle,
    Package,
    ArrowRight,
    Clock,
    MapPin as RouteIcon
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import 'leaflet/dist/leaflet.css';

// Badge Component
const Badge = ({ children, variant }) => {
  const variants = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// Marker icons for different status
const createMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div class="w-8 h-8 rounded-full bg-${color}-100 border-4 border-${color}-500 flex items-center justify-center">
      <div class="w-2 h-2 rounded-full bg-${color}-500"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const statusIcons = {
  assigned: createMarkerIcon('blue'),
  in_progress: createMarkerIcon('yellow'),
  completed: createMarkerIcon('emerald')
};

const statusColors = {
  assigned: '#3B82F6',     // blue-500
  in_progress: '#FBBF24',  // yellow-500
  completed: '#10B981'     // emerald-500
};

// Component for the legend
const MapLegend = () => (
  <div className="absolute bottom-5 right-5 bg-white p-4 rounded-lg shadow-lg z-[1000]">
    <h4 className="mb-2 text-sm font-medium text-gray-900">Pickup Status</h4>
    <div className="space-y-2">
      {Object.entries(statusColors).map(([status, color]) => (
        <div key={status} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: color }} />
          <span className="text-sm text-gray-700 capitalize">
            {status.replace('_', ' ')}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Map Update Component
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Format duration helper
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  return `${hours} h ${mins} min`;
};

// Format distance helper
const formatDistance = (meters) => {
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
};

const MasterRoutes = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [optimalRoute, setOptimalRoute] = useState([]);
  const [mapCenter, setMapCenter] = useState([-7.2575, 112.7521]); // Default to Surabaya
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeStats, setRouteStats] = useState({
    totalDistance: 0,
    totalDuration: 0,
    segments: []
  });

  useEffect(() => {
    // Get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        // Fallback to default location (Surabaya)
        setCurrentLocation({
          lat: -7.2575,
          lng: 112.7521
        });
      }
    );
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPickups();
    }
  }, [currentUser?.uid]);

  // Fetch route details from OSRM
  const fetchRouteDetails = async (startLat, startLng, endLat, endLng) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&annotations=true`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
          distance: route.distance,
          duration: route.duration
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching route:', error);
      return null;
    }
  };

  // Update route when current location or optimal route changes
  useEffect(() => {
    const fetchAllRoutes = async () => {
      if (currentLocation && optimalRoute.length > 0) {
        let allRouteCoordinates = [];
        let totalDistance = 0;
        let totalDuration = 0;
        let segments = [];
        let currentPoint = [currentLocation.lat, currentLocation.lng];

        for (const pickup of optimalRoute) {
          const destinationPoint = [pickup.coordinates.lat, pickup.coordinates.lng];
          const routeData = await fetchRouteDetails(
            currentPoint[0],
            currentPoint[1],
            destinationPoint[0],
            destinationPoint[1]
          );
          
          if (routeData) {
            allRouteCoordinates = [...allRouteCoordinates, ...routeData.coordinates];
            totalDistance += routeData.distance;
            totalDuration += routeData.duration;
            segments.push({
              pickup: pickup,
              distance: routeData.distance,
              duration: routeData.duration
            });
          }
          
          currentPoint = destinationPoint;
        }

        setRouteCoordinates(allRouteCoordinates);
        setRouteStats({
          totalDistance,
          totalDuration,
          segments
        });
      }
    };

    fetchAllRoutes();
  }, [currentLocation, optimalRoute]);

  // Calculate optimal route
  useEffect(() => {
    if (currentLocation && pickups.length > 0) {
      const activePickups = pickups.filter(p => p.status !== 'completed');
      if (activePickups.length > 0) {
        const route = calculateRouteOrder(
          activePickups,
          currentLocation.lat,
          currentLocation.lng
        );
        setOptimalRoute(route);
      } else {
        setOptimalRoute([]);
      }
    }
  }, [currentLocation, pickups]);

  const calculateRouteOrder = (pickups, startLat, startLng) => {
    let unvisited = pickups
      .filter(pickup => pickup.coordinates) // Only include pickups with coordinates
      .map(pickup => ({
        ...pickup,
        estimatedWeight: Object.values(pickup.wasteQuantities || {})
          .reduce((sum, quantity) => sum + (quantity * 5), 0) // Estimate 5kg per bag
      }));
      
    let route = [];
    let currentLat = startLat;
    let currentLng = startLng;
  
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Number.MAX_VALUE;
  
      unvisited.forEach((pickup, idx) => {
        const distance = Math.sqrt(
          Math.pow(pickup.coordinates.lat - currentLat, 2) + 
          Math.pow(pickup.coordinates.lng - currentLng, 2)
        );
        
        // Consider weight in route optimization
        const weightFactor = Math.min(pickup.estimatedWeight / 100, 1); // Cap at 100kg
        const score = distance * (1 + weightFactor); // Heavier loads get priority
        
        if (score < minDistance) {
          minDistance = score;
          nearestIdx = idx;
        }
      });
  
      const nextPickup = unvisited[nearestIdx];
      route.push(nextPickup);
      currentLat = nextPickup.coordinates.lat;
      currentLng = nextPickup.coordinates.lng;
      unvisited.splice(nearestIdx, 1);
    }
  
    return route;
  };

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('collectorId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(pickupsQuery);
      const allPickupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure waste quantities are properly mapped
        wasteQuantities: doc.data().wasteQuantities || {},
        userName: doc.data().wasteBankName, // Use wasteBankName as the user name
        location: doc.data().address || doc.data().location?.address, // Handle both direct address and nested location
        coordinates: doc.data().coordinates || doc.data().location?.coordinates // Handle both direct coordinates and nested location
      }));

      // Filter for requests with valid coordinates
      const pickupsData = allPickupsData.filter(pickup => 
        pickup.coordinates !== null && 
        pickup.coordinates.lat !== undefined
      );

      setPickups(pickupsData);

      if (pickupsData.length > 0 && pickupsData[0].coordinates) {
        setMapCenter([
          pickupsData[0].coordinates.lat,
          pickupsData[0].coordinates.lng
        ]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setError('Failed to load pickup locations');
    } finally {
      setLoading(false);
    }
  };

  const handlePickupClick = (pickup) => {
    setSelectedPickup(pickup);
    setMapCenter([pickup.coordinates.lat, pickup.coordinates.lng]);
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
            onClick={fetchPickups}
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

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl">
                <Route className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Collection Routes</h1>
                <p className="text-sm text-gray-500">Optimize your pickup routes</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                <p className="text-sm text-gray-500">Pending Pickups</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {pickups.filter(p => !p.status || p.status === 'assigned').length}
                </p>
              </div>
              <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {pickups.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
              <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {pickups.filter(p => {
                    if (p.status !== 'completed') return false;
                    const today = new Date();
                    const pickupDate = p.completedAt ? new Date(p.completedAt.seconds * 1000) : null;
                    return pickupDate && pickupDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </div>
          </div>

          {/* Route Stats Card */}
          {routeStats.totalDistance > 0 && (
            <div className="p-4 mb-6 bg-white border border-gray-200 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <RouteIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimated Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDuration(routeStats.totalDuration / 60)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Container */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="relative h-[600px]">
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                className="w-full h-full"
              >
                <MapUpdater center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Current Location Marker */}
                {currentLocation && (
                  <Marker
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={L.divIcon({
                      className: 'custom-marker-icon',
                      html: `<div class="w-8 h-8 rounded-full bg-gray-100 border-4 border-gray-500 flex items-center justify-center">
                        <div class="w-4 h-4 rounded-full bg-gray-500 animate-ping"></div>
                      </div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32]
                    })}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-medium">Your Location</p>
                        <p className="text-sm text-gray-500">Current position</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Pickup Location Markers */}
                {pickups.map((pickup) => (
                  <Marker
                    key={pickup.id}
                    position={[pickup.coordinates.lat, pickup.coordinates.lng]}
                    icon={statusIcons[pickup.status]}
                    eventHandlers={{
                      click: () => handlePickupClick(pickup)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-medium text-gray-900">
                          {pickup.wasteBankName}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {pickup.location}
                        </p>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {Object.values(pickup.wasteQuantities || {})
                                .reduce((sum, quantity) => sum + quantity, 0)} bags total
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(pickup.wasteWeights || {}).map(([type, weight]) => (
                              <Badge key={type} variant={pickup.status}>
                                {type}: {weight} kg
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm text-gray-600">
                            <div>Time: {pickup.time || 'Not specified'}</div>
                            <div>Value: Rp {pickup.totalValue?.toLocaleString() || '0'}</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Badge variant={pickup.status || 'assigned'}>
                            {(pickup.status || 'assigned').charAt(0).toUpperCase() + (pickup.status || 'assigned').slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Route Lines */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    positions={routeCoordinates}
                    color="#10B981"
                    weight={4}
                    opacity={0.8}
                  />
                )}

                <MapLegend />
              </MapContainer>
            </div>
          </div>

          {/* Route Summary */}
          {optimalRoute.length > 0 && (
            <div className="p-6 mt-6 bg-white border border-gray-200 rounded-xl">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Suggested Route Order
              </h2>
              <div className="space-y-4">
                {routeStats.segments.map((segment, index) => (
                  <div 
                    key={segment.pickup.id}
                    className="flex items-center gap-4 p-4 transition-colors rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    onClick={() => handlePickupClick(segment.pickup)}
                  >
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100">
                      <span className="text-sm font-medium text-emerald-700">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{segment.pickup.userName}</p>
                      <p className="text-sm text-gray-500">{segment.pickup.location}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="w-4 h-4" />
                          {formatDistance(segment.distance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(segment.duration / 60)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {Object.values(segment.pickup.wasteQuantities || {})
                            .reduce((sum, quantity) => sum + quantity, 0)} items
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Rp {segment.pickup.totalValue?.toLocaleString() || '0'}
                      </div>
                      <Badge variant={segment.pickup.status || 'assigned'}>
                        {(segment.pickup.status || 'assigned').charAt(0).toUpperCase() + (segment.pickup.status || 'assigned').slice(1)}
                      </Badge>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Routes Message */}
          {optimalRoute.length === 0 && !loading && (
            <div className="p-8 mt-6 text-center bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                <Route className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No Active Routes
              </h3>
              <p className="max-w-md mx-auto text-gray-500">
                There are currently no pending pickups assigned to you. New pickups will appear here when they are assigned.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MasterRoutes;