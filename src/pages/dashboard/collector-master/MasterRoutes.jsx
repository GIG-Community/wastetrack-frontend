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
  MapPin as RouteIcon,
  Info,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';
import 'leaflet/dist/leaflet.css';

// Badge Component
const Badge = ({ children, variant }) => {
  const variants = {
    pending: "bg-yellow-100 text-yellow-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// Create the marker icons once outside the component
const createCustomIcon = (color) => {
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

// Pre-create icons outside of component render cycle
const statusIcons = {
  pending: createCustomIcon('yellow'),
  assigned: createCustomIcon('blue'),
  in_progress: createCustomIcon('lime'),
  completed: createCustomIcon('emerald'),
  cancelled: createCustomIcon('red')
};

// Updated current location icon for better visibility
const currentLocationIcon = L.divIcon({
  className: 'custom-marker-icon',
  html: `<div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: radial-gradient(circle, rgba(16,185,129,0.7) 0%, rgba(16,185,129,0.3) 60%, transparent 70%); box-shadow: 0 0 0 2px #10B981;">
    <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

const statusColors = {
  pending: '#FBBF24',    // yellow-500
  assigned: '#3B82F6',   // blue-500
  in_progress: '#95ff00', // lime
  completed: '#10B981',  // emerald-500
  cancelled: '#EF4444'   // red-500
};

// Status translations in Indonesian
const statusTranslations = {
  pending: "Tertunda",
  assigned: "Ditugaskan",
  in_progress: "Dalam Proses",
  completed: "Selesai",
  cancelled: "Dibatalkan"
};

// Component for the legend
const MapLegend = () => (
  <div className="absolute bottom-5 right-5 bg-white p-4 rounded-lg shadow-lg z-[1000]">
    <h4 className="mb-2 text-sm font-medium text-gray-900">Status Pengambilan</h4>
    <div className="space-y-2">
      {Object.entries(statusColors).map(([status, color]) => (
        <div key={status} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: color }} />
          <span className="text-sm text-gray-700">
            {statusTranslations[status]}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Help tooltip component
const HelpTooltip = ({ title, content }) => (
  <div className="relative group">
    <button className="p-1 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200">
      <Info size={16} />
    </button>
    <div className="absolute z-10 hidden w-64 p-2 mb-2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-md shadow-lg group-hover:block bottom-full left-1/2">
      <h4 className="mb-1 text-sm font-medium">{title}</h4>
      <p className="text-xs text-gray-600">{content}</p>
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

// Current Location Updater Component with flexible zoom
const CurrentLocationUpdater = ({ center, active }) => {
  const map = useMap();

  useEffect(() => {
    if (active && center) {
      // Use a wider view when following location to see more surrounding pickups
      map.setView(center, 14);
    }
  }, [center, active, map]);

  return null;
};

// Format duration helper
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} menit`;
  return `${hours} jam ${mins} menit`;
};

// Format distance helper
const formatDistance = (meters) => {
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
};

const MasterRoutes = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
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
  const [followCurrentLocation, setFollowCurrentLocation] = useState(false);

  // Watch current location continuously
  useEffect(() => {
    let watchId;

    const startLocationWatch = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCurrentLocation(newLocation);

            // If following current location, update map center
            if (followCurrentLocation) {
              setMapCenter([newLocation.lat, newLocation.lng]);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to default location (Surabaya)
            if (!currentLocation) {
              setCurrentLocation({
                lat: -7.2575,
                lng: 112.7521
              });
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000, // Shorter cache time for more frequent updates
            timeout: 10000 // Longer timeout to allow for GPS lock
          }
        );
      }
    };

    startLocationWatch();

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [followCurrentLocation]);

  useEffect(() => {
    if (currentUser?.uid) {
      setupPickupsListener();
    }
  }, [currentUser?.uid]);

  // Fetch route details from OSRM
  const fetchRouteDetails = async (startLat, startLng, endLat, endLng) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&annotations=true&continue_straight=true`
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

  // Calculate optimal route without distance limitations
  useEffect(() => {
    if (currentLocation && pickups.length > 0) {
      // Only include active pickups (not completed or cancelled)
      const activePickups = pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
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
        // Calculate distance without limitations
        const distance = Math.sqrt(
          Math.pow(pickup.coordinates.lat - currentLat, 2) +
          Math.pow(pickup.coordinates.lng - currentLng, 2)
        );

        // Priority based on status (in_progress first)
        const statusPriority = pickup.status === 'in_progress' ? 0.5 : 1;

        // Weight factor - higher weight gets higher priority but don't limit maximum
        const weightFactor = pickup.estimatedWeight / 500; // No cap on weight

        // Final score - lower is higher priority
        const score = distance * statusPriority * (1 - weightFactor * 0.3);

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

  // Set up real-time listener for pickups
  const setupPickupsListener = () => {
    setLoading(true);
    try {
      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('collectorId', '==', currentUser.uid)
      );

      // Use onSnapshot instead of getDocs for real-time updates
      const unsubscribe = onSnapshot(
        pickupsQuery,
        (snapshot) => {
          const allPickupsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure coordinates are properly extracted from location
              coordinates: data.location?.coordinates || null,
              // Ensure address is properly extracted
              address: data.location?.address || data.address,
              // Handle wastes and waste quantities consistently
              wasteQuantities: data.wasteQuantities ||
                (data.wastes ? Object.keys(data.wastes).reduce((acc, key) => {
                  acc[key] = data.wastes[key].weight || 0;
                  return acc;
                }, {}) : {}),
              // Provide fallback values for essential fields
              status: data.status || 'pending',
              userName: data.userName || data.wasteBankName || 'Unnamed'
            };
          });

          // Filter for pickups with valid coordinates
          const pickupsData = allPickupsData.filter(pickup =>
            pickup.coordinates !== null &&
            pickup.coordinates.lat !== undefined
          );

          setPickups(pickupsData);

          if (pickupsData.length > 0 && pickupsData[0].coordinates && !followCurrentLocation) {
            setMapCenter([
              pickupsData[0].coordinates.lat,
              pickupsData[0].coordinates.lng
            ]);
          }

          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching pickups:', err);
          setError('Gagal memuat lokasi pengambilan');
          setLoading(false);
        }
      );

      // Return the unsubscribe function for cleanup
      return unsubscribe;
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError('Gagal memuat lokasi pengambilan');
      setLoading(false);
    }
  };

  const handlePickupClick = (pickup) => {
    setSelectedPickup(pickup);
    setFollowCurrentLocation(false);
    setMapCenter([pickup.coordinates.lat, pickup.coordinates.lng]);
  };

  const handleFollowLocationToggle = () => {
    setFollowCurrentLocation(!followCurrentLocation);
    if (!followCurrentLocation && currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lng]);
    }
  };

  // Information panel component - modified with collapsible behavior
  const InfoPanel = ({ title, children }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="text-left p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <h3 className="mb-1 font-medium text-blue-800">{title}</h3>
              <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            {isExpanded && (
              <div className="text-sm text-blue-700">{children}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
          <p className="text-gray-600">Memuat data pengambilan sampah...</p>
        </div>
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
            onClick={setupPickupsListener}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Coba Lagi
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
        <div className="p-6">
          {/* Header */}
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Route className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Rute Pengambilan</h1>
              <p className="text-sm text-gray-500">Optimalkan rute pengambilan sampah Anda</p>
            </div>
          </div>

          {/* Information Panel */}
          <InfoPanel title="Informasi">
            <ul className="ml-4 list-disc">
              <li>Klik tombol "Ikuti Lokasi Saya" untuk peta mengikuti posisi Anda secara real-time</li>
              <li>Titik-titik pada peta menunjukkan lokasi pengambilan sampah dengan warna sesuai statusnya</li>
              <li>Klik pada titik pengambilan untuk melihat detail dan memindahkan peta ke lokasi tersebut</li>
              <li>Urutan rute yang disarankan mempertimbangkan jarak dan jumlah sampah yang diambil</li>
            </ul>
          </InfoPanel>

          {/* Quick Stats */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col">
              <p className="text-sm text-gray-500">Pengambilan Tertunda</p>
              <p className="text-2xl font-semibold text-blue-600">
                {pickups.filter(p => p.status === 'assigned' || p.status === 'pending').length}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col">
              <p className="text-sm text-gray-500">Dalam Proses</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {pickups.filter(p => p.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col">
              <p className="text-sm text-gray-500">Selesai Hari Ini</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {pickups.filter(p => {
                  if (p.status !== 'completed') return false;
                  const today = new Date();
                  const pickupDate = new Date(p.completedAt?.seconds * 1000);
                  return pickupDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>

          {/* Location & Route Info */}
          <div className="flex items-center justify-between my-6">
            <div className="w-full flex items-center gap-2">
              <button
                onClick={handleFollowLocationToggle}
                className={`flex-1 px-4 py-3 rounded-lg flex items-center text-sm justify-center gap-2 transition-colors ${followCurrentLocation
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
              >
                <Navigation className="w-4 h-4 flex-shrink-0" />
                <span className="text-center w-full">
                  {followCurrentLocation ? 'Mengikuti Lokasi Anda' : 'Ikuti Lokasi Saya'}
                </span>
              </button>
              <HelpTooltip
                title="Ikuti Lokasi"
                content="Aktifkan fitur ini untuk terus mengikuti posisi Anda saat ini pada peta. Peta akan otomatis berpindah saat Anda bergerak."
              />
            </div>

            {/* Route Stats Card */}
            {routeStats.totalDistance > 0 && (
              <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <div className="p-2 rounded-lg bg-blue-50">
                  <RouteIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimasi Waktu Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDuration(routeStats.totalDuration / 60)}
                  </p>
                </div>
                <div className="h-10 mx-2 border-l border-gray-200"></div>
                <div>
                  <p className="text-sm text-gray-500">Jarak Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDistance(routeStats.totalDistance)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="relative h-[600px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                className="w-full h-full"
                key={`map-${mapCenter[0]}-${mapCenter[1]}`} // Add a key to force re-render when center changes
              >
                <MapUpdater center={mapCenter} />
                <CurrentLocationUpdater center={currentLocation ? [currentLocation.lat, currentLocation.lng] : null} active={followCurrentLocation} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Current Location Marker */}
                {currentLocation && (
                  <Marker
                    key={`current-location-${currentLocation.lat}-${currentLocation.lng}`}
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={currentLocationIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-medium">Lokasi Anda</p>
                        <p className="text-sm text-gray-500">Posisi saat ini</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Pickup Location Markers */}
                {pickups.map((pickup) => (
                  <Marker
                    key={`pickup-${pickup.id}-${pickup.status}`}
                    position={[pickup.coordinates.lat, pickup.coordinates.lng]}
                    icon={statusIcons[pickup.status] || statusIcons['assigned']}
                    eventHandlers={{
                      click: () => handlePickupClick(pickup)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-medium text-gray-900">
                          {pickup.userName}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {typeof pickup.address === 'string'
                            ? pickup.address
                            : pickup.location?.address || 'Alamat tidak tersedia'}
                        </p>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {Object.values(pickup.wasteQuantities || {})
                                .reduce((sum, quantity) => sum + quantity, 0)} kantong total
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(pickup.wasteQuantities || {}).map(([type, quantity]) => (
                              <Badge key={type} variant={pickup.status}>
                                {type}: {quantity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <Badge variant={pickup.status}>
                            {statusTranslations[pickup.status]}
                          </Badge>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Route Lines */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    key={`route-${routeCoordinates.length}`}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Urutan Rute yang Disarankan
                </h2>
                <HelpTooltip
                  title="Tentang Rute yang Disarankan"
                  content="Pengurutan rute dioptimalkan berdasarkan jarak dan jumlah sampah. Klik pada lokasi pengambilan untuk melihat detail dan berpindah ke posisi tersebut di peta."
                />
              </div>
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
                      <p className="text-sm text-gray-500">
                        {typeof segment.pickup.address === 'string'
                          ? segment.pickup.address
                          : segment.pickup.location?.address || 'Alamat tidak tersedia'}
                      </p>
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
                          {Object.values(segment.pickup.wasteQuantities || {}).reduce((sum, quantity) => sum + quantity, 0)} kantong
                        </span>
                      </div>
                      <Badge variant={segment.pickup.status}>
                        {statusTranslations[segment.pickup.status]}
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
                Tidak Ada Rute Aktif
              </h3>
              <p className="max-w-md mx-auto text-gray-500">
                Saat ini tidak ada pengambilan sampah yang tertunda yang ditugaskan kepada Anda. Pengambilan baru akan muncul di sini saat ditugaskan.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MasterRoutes;