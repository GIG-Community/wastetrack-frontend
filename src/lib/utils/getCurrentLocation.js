/**
 * Get current geolocation with optional address information, optimized for accuracy
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Success callback that receives location data
 * @param {Function} options.onLoading - Callback for loading state changes
 * @param {Function} options.onError - Error callback
 * @param {boolean} options.includeAddress - Whether to fetch address details
 * @param {Object} options.previousData - Previous location data for comparison
 * @param {Object} options.geoOptions - Geolocation API options
 * @param {number} options.maxRetries - Maximum number of retries for low accuracy
 * @param {number} options.minAccuracy - Minimum accuracy in meters (lower is better)
 * @param {boolean} options.useITSFallback - Whether to use ITS Zero Point Monument as fallback
 * @returns {void}
 */
const getCurrentLocation = ({
    onSuccess = () => { },
    onLoading = () => { },
    onError = () => { },
    includeAddress = true,
    previousData = null,
    geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    },
    maxRetries = 3,
    minAccuracy = 100, // in meters
    useITSFallback = true // Enable ITS Zero Point Monument fallback by default
} = {}) => {
    let retryCount = 0;
    
    // ITS Zero Point Monument coordinates and details
    const ITS_ZERO_POINT = {
        coordinates: {
            lat: "-7.285727",
            lng: "112.795585"
        },
        address: "Monumen Titik Nol ITS, Jalan Teknik Mesin, Keputih, Sukolilo, Surabaya, Jawa Timur, Jawa, 60111, Indonesia",
        city: "Surabaya",
        province: "Jawa Timur",
        country: "Indonesia",
        postalCode: "60111",
        addressDetails: {
            road: "Jalan Teknik Mesin",
            suburb: "Keputih",
            city_district: "Sukolilo",
            city: "Surabaya",
            state: "Jawa Timur",
            region: "Jawa",
            postcode: "60111",
            country: "Indonesia"
        }
    };

    const getLocation = () => {
        if (!("geolocation" in navigator)) {
            const error = new Error('Geolocation not supported');
            onError(error);

            handleDefaultError(error, 'Geolocation tidak didukung oleh browser Anda');
            
            // Use ITS Zero Point as fallback if enabled
            if (useITSFallback) {
                console.log('Using ITS Zero Point Monument as fallback due to geolocation not being supported');
                onSuccess({
                    ...ITS_ZERO_POINT,
                    accuracy: 0, // Indicate this is a fallback, not real accuracy
                    timestamp: new Date().toISOString(),
                    isFallback: true
                });
            }
            return;
        }

        onLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                // Check if accuracy is good enough
                if (accuracy > minAccuracy && retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Location accuracy (${accuracy}m) exceeds threshold (${minAccuracy}m). Retrying... (${retryCount}/${maxRetries})`);
                    setTimeout(getLocation, 1000);
                    return;
                }

                // If we've reached max retries and accuracy is still poor, use ITS Zero Point if enabled
                if (accuracy > minAccuracy && retryCount >= maxRetries && useITSFallback) {
                    console.log(`Max retries (${maxRetries}) reached with poor accuracy (${accuracy}m). Using ITS Zero Point Monument as fallback.`);
                    onLoading(false);
                    onSuccess({
                        ...ITS_ZERO_POINT,
                        originalAccuracy: accuracy, // Store the original poor accuracy
                        timestamp: new Date().toISOString(),
                        isFallback: true
                    });
                    return;
                }

                // Create basic location data
                const locationData = {
                    coordinates: {
                        lat: latitude.toString(),
                        lng: longitude.toString()
                    },
                    accuracy: accuracy,
                    timestamp: new Date().toISOString()
                };

                // Check if coordinates are the same as previous data
                if (previousData?.coordinates?.lat === locationData.coordinates.lat &&
                    previousData?.coordinates?.lng === locationData.coordinates.lng) {
                    onLoading(false);
                    onSuccess(previousData);
                    return;
                }

                // Fetch address details if requested
                if (includeAddress) {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
                            {
                                headers: {
                                    'Accept-Language': 'id-ID', // Prefer Indonesian
                                    'User-Agent': 'WasteTrack App' // Required by Nominatim
                                }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();

                        // Add address information to location data
                        locationData.address = data.display_name || previousData?.address;
                        locationData.city = data.address?.city || data.address?.town ||
                            data.address?.village || previousData?.city;
                        locationData.province = data.address?.state || previousData?.province;
                        locationData.country = data.address?.country || previousData?.country;
                        locationData.postalCode = data.address?.postcode || previousData?.postalCode;

                        // Store detailed address components for better accuracy
                        locationData.addressDetails = data.address;
                    } catch (error) {
                        console.error('Error getting address from coordinates:', error);
                        // Still return coordinates even if address lookup fails

                        // Use previous address data if available
                        if (previousData?.address) {
                            locationData.address = previousData.address;
                            locationData.city = previousData.city;
                            locationData.province = previousData.province;
                            locationData.country = previousData.country;
                            locationData.postalCode = previousData.postalCode;
                            locationData.addressDetails = previousData.addressDetails;
                        }
                    }
                }

                onLoading(false);
                onSuccess(locationData);
            },
            (error) => {
                console.error('Error getting location:', error);
                onLoading(false);

                // Call custom error handler
                onError(error);

                // Default error handling
                let errorMessage = 'Tidak dapat mengakses lokasi Anda. Mohon aktifkan izin lokasi di browser.';

                // Provide more specific error messages
                if (error.code === 1) {
                    errorMessage = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi di pengaturan browser Anda.';
                } else if (error.code === 2) {
                    errorMessage = 'Lokasi tidak tersedia. Pastikan GPS perangkat Anda aktif dan coba lagi.';
                } else if (error.code === 3) {
                    errorMessage = 'Waktu mendapatkan lokasi habis. Silakan coba lagi.';
                }

                // Use ITS Zero Point as fallback if enabled
                if (useITSFallback) {
                    console.log(`Using ITS Zero Point Monument as fallback due to geolocation error: ${error.code}`);
                    onSuccess({
                        ...ITS_ZERO_POINT,
                        accuracy: 0, // Indicate this is a fallback, not real accuracy
                        timestamp: new Date().toISOString(),
                        isFallback: true,
                        originalError: error.code
                    });
                } else {
                    handleDefaultError(error, errorMessage);
                }
            },
            geoOptions
        );
    };

    const handleDefaultError = (error, message) => {
        // Default error handling if not overridden
        if (typeof Swal !== 'undefined' && onError === getCurrentLocation.defaultOnError) {
            Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonColor: '#10B981',
                customClass: {
                    popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
                    title: 'text-xl sm:text-2xl font-semibold text-gray-800',
                    htmlContainer: 'text-sm sm:text-base text-gray-600',
                    confirmButton: 'text-sm sm:text-base'
                }
            });
        }
    };

    // Start the location process
    getLocation();
};

// Default error handler (empty function)
getCurrentLocation.defaultOnError = () => { };

export default getCurrentLocation;