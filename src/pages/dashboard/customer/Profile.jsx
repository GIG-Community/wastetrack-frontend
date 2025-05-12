import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
    User,
    MapPin,
    Phone,
    Mail,
    Award,
    Save,
    Edit,
    Loader2,
    Check,
    X,
    ChevronRight,
    MapPinIcon,
    Calendar,
    AlertCircle,
    Package,
    TreesIcon,
    Recycle,
    Droplet
} from 'lucide-react';
import {
    calculatePoints,
    calculateTotalValue,
    calculateEnvironmentalImpact,
    TIER_THRESHOLDS,
    getCurrentTier
} from '../../../lib/constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import getCurrentLocation from '../../../lib/utils/getCurrentLocation';
import Swal from 'sweetalert2';

const Profile = () => {
    const { userData, currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        coordinates: { lat: '', lng: '' }
    });

    // Initialize form data when userData is available
    useEffect(() => {
        if (userData?.profile) {
            setFormData({
                fullName: userData.profile.fullName || '',
                phone: userData.profile.phone || '',
                address: userData.profile?.location?.address || '',
                city: userData.profile?.location?.city || '',
                province: userData.profile?.location?.province || '',
                coordinates: userData.profile?.location?.coordinates || { lat: '', lng: '' }
            });
        }
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            // Handle nested properties (e.g., "coordinates.lat")
            const [parent, child] = name.split('.');
            setFormData({
                ...formData,
                [parent]: {
                    ...formData[parent],
                    [child]: value
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userRef = doc(db, 'users', currentUser.uid);

            // Structure the data according to the Firebase collection
            await updateDoc(userRef, {
                'profile.fullName': formData.fullName,
                'profile.phone': formData.phone,
                'profile.location.address': formData.address,
                'profile.location.city': formData.city,
                'profile.location.province': formData.province,
                'profile.location.coordinates': formData.coordinates
            });

            Swal.fire({
                title: 'Sukses!',
                text: 'Profil Anda berhasil diperbarui',
                icon: 'success',
                confirmButtonColor: '#10B981',
                customClass: {
                    popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
                    title: 'text-xl sm:text-2xl font-semibold text-gray-800',
                    htmlContainer: 'text-sm sm:text-base text-gray-600',
                    confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700'
                }
            });

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);

            Swal.fire({
                title: 'Error',
                text: 'Gagal memperbarui profil. Silakan coba lagi.',
                icon: 'error',
                confirmButtonColor: '#10B981',
                customClass: {
                    popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
                    title: 'text-xl sm:text-2xl font-semibold text-gray-800',
                    htmlContainer: 'text-sm sm:text-base text-gray-600',
                    confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    // Function to get user's current location
    const handleGetLocation = () => {
        setLocationLoading(true); // Use locationLoading instead of the generic loading state

        getCurrentLocation({
            onSuccess: (locationData) => {
                if (locationData.coordinates) {
                    // Convert string coordinates to numbers
                    const latitude = parseFloat(locationData.coordinates.lat);
                    const longitude = parseFloat(locationData.coordinates.lng);

                    setFormData(prev => ({
                        ...prev,
                        // Store coordinates as an object with lat/lng properties, not as a GeoPoint
                        coordinates: { lat: latitude, lng: longitude },
                        // Optionally update address fields if they're empty
                        address: prev.address || locationData.address || '',
                        city: prev.city || locationData.city || '',
                        province: prev.province || locationData.province || ''
                    }));
                }
                setLocationLoading(false);
            },
            onLoading: (loading) => {
                setLocationLoading(loading);
            },
            onError: (error) => {
                console.error('Error getting location:', error);
                // Use Swal for error notification instead of undefined setError
                Swal.fire({
                    title: 'Error',
                    text: 'Gagal mendapatkan lokasi. Silakan coba lagi.',
                    icon: 'error',
                    confirmButtonColor: '#10B981',
                    customClass: {
                        popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
                        title: 'text-xl sm:text-2xl font-semibold text-gray-800',
                        htmlContainer: 'text-sm sm:text-base text-gray-600',
                        confirmButton: 'text-sm sm:text-base'
                    }
                });
                setLocationLoading(false);
            }
        });
    };

    // Calculate next tier info
    const calculateNextTier = () => {
        const currentPoints = userData?.rewards?.points || 0;
        const currentTier = getCurrentTier(currentPoints);
        const tierInfo = TIER_THRESHOLDS[currentTier];

        if (!tierInfo.next) return null;

        const nextTierInfo = TIER_THRESHOLDS[tierInfo.next];
        const progress = ((currentPoints - tierInfo.min) / (nextTierInfo.min - tierInfo.min)) * 100;
        const remaining = Math.max(0, nextTierInfo.min - currentPoints);

        return {
            nextTier: tierInfo.next,
            progress: Math.min(progress, 100),
            remaining,
            required: nextTierInfo.min
        };
    };

    // Format numbers consistently with HomePage
    const formatNumber = (num, decimals = 1) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return Number(num).toFixed(decimals);
    };

    const nextTierInfo = calculateNextTier();
    const joinDate = new Date(userData?.createdAt?.seconds * 1000 || Date.now());
    const formattedJoinDate = joinDate.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Rookie':
                return 'bg-gray-100 text-gray-800';
            case 'Bronze':
                return 'bg-amber-100 text-amber-800';
            case 'Silver':
                return 'bg-slate-200 text-slate-800';
            case 'Gold':
                return 'bg-yellow-100 text-yellow-800';
            case 'Platinum':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-emerald-100 text-emerald-800';
        }
    };

    return (
        <div className="sm:container sm:max-w-4xl sm:p-4 mx-auto space-y-6">
            {/* Main Profile Section */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-1">
                    <div className="overflow-hidden sm:bg-white sm:border sm:border-gray-100 rounded-xl sm:shadow-sm">
                        <div className="flex flex-col items-center text-center sm:border-b sm:border-gray-100">
                            <div className="flex items-center justify-center w-20 h-20 mb-4 text-white bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-md">
                                <User className="w-10 h-10" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">{userData?.profile?.fullName || 'Pengguna'}</h2>
                            <p className="text-gray-500">{userData?.email}</p>

                            <div className="flex items-center mt-3 space-x-2">
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${getTierColor(userData?.rewards?.tier || 'Rookie')}`}>
                                    <Award className="w-3 h-3 mr-1" />
                                    {getCurrentTier(userData?.rewards?.points || 0).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="sm:p-4">
                            <div className="space-y-3">
                                <div className="text-left items-center mt-4 flex px-3 py-2 text-sm sm:border sm:border-gray-100 rounded-lg">
                                    <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Bergabung sejak</p>
                                        <p className="font-medium text-gray-700">{formattedJoinDate}</p>
                                    </div>
                                </div>

                                {/* Eco Tip */}
                                <div className="p-3 text-left bg-yellow-50 border border-yellow-100 rounded-lg">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs font-medium text-yellow-700">Tingkatkan Level</p>
                                        <p className="text-xs text-yellow-600">
                                            Setor sampah secara rutin untuk meningkatkan level dan mendapatkan reward lebih banyak.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="md:col-span-2">
                    <div className="text-left overflow-hidden bg-white sm:border sm:border-gray-100 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800">Informasi</h3>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-emerald-700 transition-colors bg-emerald-100 rounded-lg hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                                >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Edit
                                </button>
                            )}
                        </div>

                        <div className="p-4 sm:p-6">
                            {isEditing ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="fullName" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Nama Lengkap
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="fullName"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className="block w-full py-2.5 pl-10 pr-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                    placeholder="Masukkan nama lengkap"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="phone" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Nomor Telepon
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="block w-full py-2.5 pl-10 pr-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                    placeholder="Masukkan nomor telepon"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                                Alamat Lengkap
                                            </label>                                            <button
                                                type="button"
                                                onClick={handleGetLocation}
                                                disabled={locationLoading}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors bg-emerald-100 rounded-md hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {locationLoading ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                        Memuat Lokasi...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MapPinIcon className="w-3 h-3 mr-1" />
                                                        Lokasi Saat Ini
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                id="address"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                rows={3}
                                                className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Masukkan alamat lengkap"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="city" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Kota
                                            </label>
                                            <input
                                                type="text"
                                                id="city"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Masukkan kota"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="province" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Provinsi
                                            </label>
                                            <input
                                                type="text"
                                                id="province"
                                                name="province"
                                                value={formData.province}
                                                onChange={handleChange}
                                                className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Masukkan provinsi"
                                            />
                                        </div>
                                    </div>

                                    <div className="hidden grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="coordinates.lat" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Latitude
                                            </label>
                                            <input
                                                type="text"
                                                id="coordinates.lat"
                                                name="coordinates.lat"
                                                value={formData.coordinates?.lat || ''}
                                                onChange={handleChange}
                                                className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Koordinat latitude"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="coordinates.lng" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                Longitude
                                            </label>
                                            <input
                                                type="text"
                                                id="coordinates.lng"
                                                name="coordinates.lng"
                                                value={formData.coordinates?.lng || ''}
                                                onChange={handleChange}
                                                className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                placeholder="Koordinat longitude"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium transition-colors text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200"
                                            disabled={loading}
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium transition-colors text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm disabled:opacity-60"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Simpan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    {/* User Information Section - styled like HomePage cards */}
                                    <div>
                                        <h4 className="mb-2 text-sm font-semibold text-gray-700">Personal</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 sm:p-3 mt-4 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Nama Lengkap</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData?.profile?.fullName || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Email</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData?.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Nomor Telepon</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData?.profile?.phone || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Information Section */}
                                    <div>
                                        <h4 className="mb-2 text-sm font-semibold text-gray-700">Alamat</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Alamat Lengkap</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData?.profile?.location?.address || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Kota</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData.profile.location.city}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                <div>
                                                    <p className="text-xs text-gray-500 sm:text-emerald-600">Provinsi</p>
                                                    <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                        {userData.profile.location.province}
                                                    </p>
                                                </div>
                                            </div>

                                            {userData?.profile?.location?.coordinates?.lat && (
                                                <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white sm:bg-emerald-50 sm:border sm:border-emerald-200">
                                                    <div>
                                                        <p className="text-xs text-gray-500 sm:text-emerald-600">Koordinat</p>
                                                        <p className="text-sm font-medium text-emerald-600 sm:text-emerald-700">
                                                            {`${userData.profile.location.coordinates.lat}, ${userData.profile.location.coordinates.lng}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;