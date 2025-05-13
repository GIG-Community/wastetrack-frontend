import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
    MapPin,
    Navigation,
    Loader2,
    AlertCircle,
    Save,
    ArrowLeft,
    Search,
    Info,
    X
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon path issues
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Component for the help tooltip - reused from your existing code
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

const PickLocation = ({
    initialLocation = null,
    onSaveLocation,
    onCancel,
    pageTitle = "Pilih Lokasi Anda",
    useFirebase = false,
    allowBack = true
}) => {
    const [location, setLocation] = useState(initialLocation);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const navigate = useNavigate();

    // Create custom marker icon
    const customMarkerIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: `<div class="w-5 h-5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center" style="background: radial-gradient(circle, rgba(16,185,129,0.7) 0%, rgba(16,185,129,0.3) 60%, transparent 70%); box-shadow: 0 0 0 2px #10B981;">
            <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
            </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });    // Initialize map on component mount
    useEffect(() => {
        // First check if geolocation is available
        if (!navigator.geolocation) {
            setError('Geolokasi tidak didukung oleh browser Anda');
            setLoading(false);
            return;
        }

        // If we have initial location, use it
        if (initialLocation) {
            setLocation(initialLocation);
            fetchAddressFromCoordinates(initialLocation.latitude, initialLocation.longitude);
            setLoading(false);
            setTimeout(() => {
                initializeMap(initialLocation.latitude, initialLocation.longitude);
            }, 100);
            return;
        }

        // Get current location
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });

                // Reverse geocode to get address
                fetchAddressFromCoordinates(latitude, longitude);
                setLoading(false);

                // Delay map initialization to ensure DOM is ready
                setTimeout(() => {
                    initializeMap(latitude, longitude);
                }, 100);
            },
            err => {
                console.error('Error getting location:', err);
                setError('Tidak dapat mengambil lokasi Anda. Silakan pilih lokasi secara manual.');
                setLoading(false);

                // Initialize map with default location (Surabaya, Indonesia)
                const defaultLat = -7.2575;
                const defaultLng = 112.7521;
                setLocation({ latitude: defaultLat, longitude: defaultLng });
                fetchAddressFromCoordinates(defaultLat, defaultLng);

                // Delay map initialization to ensure DOM is ready
                setTimeout(() => {
                    initializeMap(defaultLat, defaultLng);
                }, 100);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        // Cleanup function
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
            }
        };
    }, []); const initializeMap = (lat, lng) => {
        if (mapContainerRef.current && !mapRef.current) {
            // Create map instance
            const mapInstance = L.map(mapContainerRef.current, {
                zoomControl: false // We'll add custom zoom controls
            }).setView([lat, lng], 16);

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance);

            // Add zoom control to bottom right
            L.control.zoom({
                position: 'bottomright'
            }).addTo(mapInstance);

            // Add marker at the initial position
            const markerInstance = L.marker([lat, lng], {
                draggable: true,
                icon: customMarkerIcon
            }).addTo(mapInstance);

            // Update location state when marker is dragged
            markerInstance.on('dragend', (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                setLocation({ latitude: position.lat, longitude: position.lng });
                fetchAddressFromCoordinates(position.lat, position.lng);
            });

            // Allow clicking on map to move marker
            mapInstance.on('click', (e) => {
                markerInstance.setLatLng(e.latlng);
                setLocation({ latitude: e.latlng.lat, longitude: e.latlng.lng });
                fetchAddressFromCoordinates(e.latlng.lat, e.latlng.lng);
            });

            mapRef.current = mapInstance;
            markerRef.current = markerInstance;
        }
    };

    // Fetch address using reverse geocoding from OpenStreetMap Nominatim
    const fetchAddressFromCoordinates = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'id' } } // Get results in Indonesian
            );
            const data = await response.json();

            if (data && data.display_name) {
                setAddress(data.display_name);
            } else {
                setAddress('Alamat tidak diketahui');
            }
        } catch (error) {
            console.error('Error fetching address:', error);
            setAddress('Alamat tidak dapat dimuat');
        }
    };

    // Handle search location by name/address
    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
                { headers: { 'Accept-Language': 'id' } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);

                setLocation({ latitude: lat, longitude: lng });
                setAddress(result.display_name);

                // Update map view and marker position
                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([lat, lng], 16);
                    markerRef.current.setLatLng([lat, lng]);
                }
            } else {
                setError('Lokasi tidak ditemukan. Coba kata kunci lain.');
                setTimeout(() => setError(null), 3000);
            }
        } catch (error) {
            console.error('Error searching location:', error);
            setError('Gagal mencari lokasi. Silakan coba lagi.');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsSearching(false);
        }
    }; const handleSaveLocation = async () => {
        if (!location) {
            setError('Silakan pilih lokasi pada peta');
            return;
        }

        try {
            setSaving(true);

            // Prepare location data
            const locationData = {
                latitude: location.latitude,
                longitude: location.longitude,
                address: address,
                updatedAt: new Date().toISOString()
            };

            // If using Firebase, import and use it
            if (useFirebase) {
                try {                    // Dynamically import Firebase dependencies
                    const { doc, updateDoc } = await import('firebase/firestore');
                    const { db, auth } = await import('../lib/firebase');

                    if (!auth.currentUser) {
                        setError('Anda harus masuk untuk menyimpan lokasi');
                        setSaving(false);
                        return;
                    }

                    const userDocRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userDocRef, { location: locationData });
                } catch (firebaseError) {
                    console.error('Firebase error:', firebaseError);
                    throw new Error('Firebase error: ' + firebaseError.message);
                }
            }
            // Use the callback for handling the save action
            else if (onSaveLocation) {
                await onSaveLocation(locationData);
            }

            setSaveSuccess(true);
            setSaving(false);

            // If there's no custom callback for cancellation (indicating we're in a standalone page)
            // redirect to previous page after successful save
            if (!onCancel && allowBack) {
                setTimeout(() => {
                    navigate(-1); // Go back to previous page
                }, 2000);
            }
        } catch (err) {
            console.error('Error saving location:', err);
            setError('Gagal menyimpan lokasi. Silakan coba lagi.');
            setSaving(false);
        }
    };

    const handleMyLocationClick = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });
                    fetchAddressFromCoordinates(latitude, longitude);

                    // Update map view and marker position
                    if (mapRef.current && markerRef.current) {
                        mapRef.current.setView([latitude, longitude], 16);
                        markerRef.current.setLatLng([latitude, longitude]);
                    }
                },
                (error) => {
                    console.error('Error getting current location:', error);
                    setError('Tidak dapat mengambil lokasi saat ini. Silakan pilih lokasi manual.');
                    setTimeout(() => setError(null), 3000);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            setError('Geolokasi tidak didukung di perangkat ini');
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <>
            <div className="sm:min-h-screen sm:bg-gray-50">
                <div className="sticky top-0 z-10 sm:bg-white shadow-md">
                    {/* Header */}
                    {/* <div className="relative flex items-center justify-center p-4 border-b">
                        {allowBack && (
                            <button
                                onClick={() => onCancel ? onCancel() : navigate(-1)}
                                className="absolute left-4 flex items-center gap-2 text-gray-700"
                            >
                                <ArrowLeft size={20} />
                                <span className="hidden sm:inline text-base font-medium">Kembali</span>
                            </button>
                        )}
                        <h1 className="text-md sm:text-lg font-semibold text-gray-800 text-center">
                            {pageTitle}
                        </h1>
                    </div> */}


                    {/* Search Bar */}
                    <div className="sm:p-4 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search size={16} className="text-gray-400 text-sm sm:text-base" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                                    placeholder="Cari lokasi (alamat, kota, tempat)"
                                    className="w-full py-2 pl-10 pr-4 bg-whiteborder-none rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white sm:text-base text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={handleSearchLocation}
                                disabled={isSearching || !searchQuery}
                                className={`px-4 py-2 rounded-lg ${isSearching || !searchQuery
                                    ? 'bg-gray-200 text-sm sm:text-base text-gray-400 cursor-not-allowed'
                                    : 'bg-emerald-500 text-sm sm:text-base text-white hover:bg-emerald-600'
                                    }`}
                            >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 size={40} className="mb-4 text-emerald-500 animate-spin" />
                        <p className="text-gray-600">Mendapatkan lokasi Anda...</p>
                    </div>
                ) : (
                    <>
                        {/* Map Container */}
                        <div className="relative h-[60vh] sm:h-[68vh]">
                            <div
                                ref={mapContainerRef}
                                className="w-full h-full"
                            />

                            {/* My Location Button */}
                            {/* <button
                            onClick={handleMyLocationClick}
                            className="absolute z-[1000] bottom-24 right-4 p-3 bg-white rounded-full shadow-lg"
                        >
                            <Navigation size={20} className="text-emerald-500" />
                        </button> */}

                            {/* Map Instructions */}
                            <div className="absolute z-[1000] top-4 left-4 right-4 sm:left-0 sm:right-0 mx-auto w-auto sm:w-max px-4 py-2 sm:px-6 sm:py-3 bg-white rounded-lg shadow-md text-sm">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="rounded-full bg-emerald-100">
                                        <Info className="text-emerald-600 text-base sm:text-lg" />
                                    </div>
                                    <p className="text-left text-xs sm:text-sm md:text-base text-gray-800">
                                        Geser pin atau klik pada peta untuk menyesuaikan lokasi
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Location Info & Action Buttons */}
                        <div className="left-0 right-0 sm:bg-white sm:shadow-lg sm:p-4 pt-4">
                            <div className="text-left max-h-28">
                                <div className="w-full">
                                    <h3 className="font-medium text-emerald-600">Lokasi Terpilih</h3>
                                    <div className="mb-2">
                                        <p className="text-sm text-gray-500 break-words line-clamp-2">{address}</p>
                                        {location && (
                                            <p className="mt-2 text-xs text-gray-400">
                                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={18} className="text-red-500" />
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 rounded-full bg-emerald-100">
                                            <MapPin size={16} className="text-emerald-600" />
                                        </div>
                                        <p className="text-sm text-emerald-600">
                                            Lokasi berhasil disimpan! Mengarahkan kembali...
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-4">
                                {onCancel && (
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 px-4 py-3 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                )}

                                {!onCancel && allowBack && (
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="flex-1 px-4 py-3 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                )}

                                <button
                                    onClick={handleSaveLocation}
                                    disabled={saving || !location}
                                    className={`flex-1 px-4 py-3 text-sm sm:text-base rounded-lg flex items-center justify-center gap-2 ${saving || !location
                                        ? 'bg-emerald-300 cursor-not-allowed'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                        }`}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            {/* <Save size={18} /> */}
                                            <span>Simpan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default PickLocation;

PickLocation.propTypes = {
    // Initial location to display on the map (optional)
    initialLocation: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired
    }),

    // Callback function when location is saved (required)
    onSaveLocation: PropTypes.func,

    // Callback function for cancel button (optional)
    onCancel: PropTypes.func,

    // Title to display at the top of the page (optional)
    pageTitle: PropTypes.string,

    // Whether to use Firebase for saving the location (optional)
    useFirebase: PropTypes.bool,

    // Whether to show the back button (optional)
    allowBack: PropTypes.bool
};