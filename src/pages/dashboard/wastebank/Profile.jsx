import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Save,
    Edit,
    Loader2,
    Check,
    X,
    MapPinIcon,
    Calendar,
    DollarSign,
    Users,
    CheckCircle,
    Shield,
    User
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import getCurrentLocation from '../../../lib/utils/getCurrentLocation';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';

const Profile = () => {
    const { userData, currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        institutionName: '',
        address: '',
        city: '',
        province: '',
        coordinates: { latitude: '', longitude: '' }
    });

    // Initialize form data when userData is available
    useEffect(() => {
        if (userData?.profile) {
            setFormData({
                fullName: userData.profile.fullName || '',
                phone: userData.profile.phone || '',
                institutionName: userData.profile.institutionName || '',
                address: userData.profile?.location?.address || '',
                city: userData.profile?.location?.city || '',
                province: userData.profile?.location?.province || '',
                coordinates: userData.profile?.location?.coordinates || { latitude: '', longitude: '' }
            });
        }
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            // Handle nested properties (e.g., "coordinates.latitude")
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
                'profile.institutionName': formData.institutionName,
                'profile.location.address': formData.address,
                'profile.location.city': formData.city,
                'profile.location.province': formData.province,
                'profile.location.coordinates': formData.coordinates,
                updatedAt: new Date()
            });

            Swal.fire({
                title: 'Sukses!',
                text: 'Profil Bank Sampah berhasil diperbarui',
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
        setLocationLoading(true);

        getCurrentLocation({
            onSuccess: (locationData) => {
                if (locationData.coordinates) {
                    // Convert string coordinates to numbers
                    const latitude = parseFloat(locationData.coordinates.lat);
                    const longitude = parseFloat(locationData.coordinates.lng);

                    setFormData(prev => ({
                        ...prev,
                        coordinates: { latitude: latitude, longitude: longitude },
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

    // Format date for display
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';

        let date;
        if (timestamp.seconds) {
            // Firestore timestamp
            date = new Date(timestamp.seconds * 1000);
        } else {
            // Regular date
            date = new Date(timestamp);
        }

        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-100 text-emerald-800';
            case 'inactive':
                return 'bg-gray-100 text-gray-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active':
                return 'Aktif';
            case 'inactive':
                return 'Tidak Aktif';
            case 'suspended':
                return 'Ditangguhkan';
            default:
                return 'Tidak Diketahui';
        }
    }; return (
        <div className="flex min-h-screen bg-zinc-50/50">
            {/* Sidebar */}
            <Sidebar
                role={userData?.role}
                onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
            />

            {/* Main content */}
            <main className={`flex-1 transition-all duration-300 ease-in-out
                ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
            >
                <div className="p-6">
                    <div className="grid gap-6 grid-cols-4">
                        {/* Main Profile Info */}
                        <div className="">
                            <div className="overflow-hidden sm:bg-white sm:border sm:border-gray-100 rounded-xl sm:shadow-sm">
                                <div className="flex flex-col items-center text-center sm:border-b sm:border-gray-100 p-6">
                                    <div className="flex items-center justify-center w-20 h-20 mb-4 text-white bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-md">
                                        <Building2 className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">{userData?.profile?.fullName || 'Bank Sampah'}</h2>
                                    <p className="text-gray-500 text-sm">{userData?.profile?.institutionName || 'Institusi'}</p>
                                    <p className="text-gray-400 text-xs mt-1">{userData?.email}</p>

                                    <div className="flex items-center mt-3 space-x-2">
                                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(userData?.status)}`}>
                                            {userData?.emailVerified && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {getStatusText(userData?.status)}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="space-y-3">
                                        <div className="text-left items-center flex px-3 py-2 text-sm sm:border sm:border-gray-100 rounded-lg">
                                            <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500">Bergabung sejak</p>
                                                <p className="font-medium text-gray-700">{formatDate(userData?.createdAt)}</p>
                                            </div>
                                        </div>

                                        {userData?.emailVerified && (
                                            <div className="p-3 text-left bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-emerald-600" />
                                                    <p className="text-xs font-medium text-emerald-700">Email Terverifikasi</p>
                                                </div>
                                                <p className="text-xs text-emerald-600 mt-1">
                                                    Akun Bank Sampah telah diverifikasi dan aktif.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards and Profile Information in same row */}
                        <div className="col-span-3 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Balance */}
                                <div className="bg-white sm:border sm:border-gray-100 rounded-xl sm:shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-left text-sm text-gray-500">Saldo</p>
                                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(userData?.balance)}</p>
                                        </div>
                                        <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg">
                                            <DollarSign className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Earnings */}
                                <div className="bg-white sm:border sm:border-gray-100 rounded-xl sm:shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-left text-sm text-gray-500">Total Pendapatan</p>
                                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(userData?.earnings)}</p>
                                        </div>
                                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                                            <DollarSign className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Profile Information Section */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="text-left overflow-hidden bg-white sm:border sm:border-gray-100 rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Informasi Detail</h3>
                                            {/* Last Updated */}
                                            {userData?.updatedAt && (
                                                <p className="text-xs text-gray-500">
                                                    Terakhir diperbarui: {formatDate(userData.updatedAt)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Edit Button */}
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

                                    <div className="p-6">
                                        {isEditing ? (
                                            <form onSubmit={handleSubmit} className="space-y-5">
                                                <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2">
                                                    <div>
                                                        <label htmlFor="fullName" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                            Nama Bank Sampah
                                                        </label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                id="fullName"
                                                                name="fullName"
                                                                value={formData.fullName}
                                                                onChange={handleChange}
                                                                className="block w-full py-2.5 pl-10 pr-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                                placeholder="Masukkan nama bank sampah"
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

                                                <div>
                                                    <label htmlFor="institutionName" className="block mb-1.5 text-sm font-medium text-gray-700">
                                                        Nama Institusi
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                            <Building2 className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            id="institutionName"
                                                            name="institutionName"
                                                            value={formData.institutionName}
                                                            onChange={handleChange}
                                                            className="block w-full py-2.5 pl-10 pr-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                                            placeholder="Masukkan nama institusi"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                                            Alamat Lengkap
                                                        </label>
                                                        <button
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
                                                            placeholder="Masukkan alamat lengkap bank sampah"
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
                                                {/* Informasi Buka Tutup Section */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Informasi Buka - Tutup</h4>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium text-emerald-800">Status Sekarang</p>
                                                                    <p className="text-xs text-emerald-600 mt-1">
                                                                        {(() => {
                                                                            const now = new Date();
                                                                            const currentHour = now.getHours();
                                                                            const isWeekend = now.getDay() === 0 || now.getDay() === 6;

                                                                            if (isWeekend) {
                                                                                return "Tutup - Akhir Pekan";
                                                                            } else if (currentHour >= 8 && currentHour < 16) {
                                                                                return "Buka - Melayani";
                                                                            } else {
                                                                                return "Tutup - Diluar Jam Operasional";
                                                                            }
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                                <div className={`w-3 h-3 rounded-full ${(() => {
                                                                    const now = new Date();
                                                                    const currentHour = now.getHours();
                                                                    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

                                                                    if (!isWeekend && currentHour >= 8 && currentHour < 16) {
                                                                        // return "bg-emerald-500"Vie;
                                                                    } else {
                                                                        // return "bg-red-500";
                                                                    }
                                                                })()}`}></div>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-800">Jam Operasional</p>
                                                                <p className="text-xs text-blue-600 mt-1">
                                                                    Senin - Jumat: 08:00 - 16:00
                                                                </p>
                                                                <p className="text-xs text-blue-600">
                                                                    Sabtu - Minggu: Tutup
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-xs text-yellow-800">
                                                            <strong>Catatan:</strong> Jadwal operasional dapat berubah pada hari libur nasional atau kondisi khusus lainnya.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bank Information Section */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700">Informasi Bank Sampah</h4>
                                                    <div className="grid grid-cols-2">
                                                        <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white">
                                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Nama Bank Sampah</p>
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {userData?.profile?.fullName || '-'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white">
                                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Email</p>
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {userData?.email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white">
                                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Nomor Telepon</p>
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {userData?.profile?.phone || '-'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 sm:p-3 rounded-lg bg-white">
                                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Institusi</p>
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {userData?.profile?.institutionName || '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Location Information Section */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700">Informasi Lokasi</h4>
                                                    <div>
                                                        <div className="flex items-start gap-3 sm:p-3 rounded-lg bg-white">
                                                            <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full mt-1">
                                                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Alamat Lengkap</p>
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {userData?.profile?.location?.address || '-'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2">
                                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white">
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Kota</p>
                                                                    <p className="text-sm font-medium text-emerald-600">
                                                                        {userData?.profile?.location?.city || '-'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white">
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Provinsi</p>
                                                                    <p className="text-sm font-medium text-emerald-600">
                                                                        {userData?.profile?.location?.province || '-'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {userData?.profile?.location?.coordinates?.latitude && (
                                                            <div className="flex items-center gap-3 sm:p-3 rounded-lg bg-white">
                                                                <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 text-emerald-600 bg-emerald-100 rounded-full">
                                                                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Koordinat</p>
                                                                    <p className="text-sm font-medium text-emerald-600">
                                                                        {`${userData.profile.location.coordinates.latitude}, ${userData.profile.location.coordinates.longitude}`}
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
                </div>
            </main>
        </div>
    );
};

export default Profile;