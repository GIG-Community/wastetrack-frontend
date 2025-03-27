// src/pages/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';
import Swal from 'sweetalert2';
import { GeoPoint } from 'firebase/firestore'; // Import GeoPoint untuk menyimpan koordinat

// Daftar role yang tersedia (ditambah role super_admin)
const ROLES = {
  super_admin: "Super Admin",
  customer: "Customer",
  collector: "Collector",
  wastebank_employee: "Wastebank Employee",
  wastebank_admin: "Wastebank Admin",
  industry: "Industry",
  government: "Government"
};

const ROLE_DESCRIPTIONS = {
  super_admin: "Manage all aspects of the system and oversee all users.",
  customer: "Manage your household waste and earn rewards",
  collector: "Collect and transport waste efficiently",
  wastebank_employee: "Process and manage waste at collection points",
  wastebank_admin: "Oversee waste bank operations",
  industry: "Access recycling materials and manage sustainability",
  government: "Monitor and analyze environmental impact"
};

export default function Register() {
  // State untuk multi-step form, tampilan password, data form, loading, dan error
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    fullName: '',
    phone: '',
    institution: '',
    address: '',
    city: '',
    province: '',
    // Awalnya koordinat di-set ke null agar tidak langsung tampil angka nol
    coordinates: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Fungsi untuk mendapatkan lokasi GPS dan melakukan reverse geocoding
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // Simpan data koordinat sebagai GeoPoint
          setFormData(prev => ({
            ...prev,
            coordinates: new GeoPoint(lat, lng)
          }));
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            setFormData(prev => ({
              ...prev,
              address: data.address.road || '',
              city: data.address.city || data.address.town || data.address.village || '',
              province: data.address.state || ''
            }));
          } catch (err) {
            console.error('Reverse geocoding failed', err);
            Swal.fire({
              icon: 'error',
              title: 'Location Error',
              text: 'Failed to retrieve address information.',
              background: '#fff5f5',
              color: '#333',
              iconColor: '#d33',
              confirmButtonColor: '#d33',
              customClass: { popup: 'rounded-lg shadow-lg' }
            });
          }
        },
        (error) => {
          console.error("Error obtaining location:", error);
          Swal.fire({
            icon: 'error',
            title: 'Location Error',
            text: 'Unable to retrieve location.',
            background: '#fff5f5',
            color: '#333',
            iconColor: '#d33',
            confirmButtonColor: '#d33',
            customClass: { popup: 'rounded-lg shadow-lg' }
          });
        }
      );
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Geolocation Unsupported',
        text: 'Geolocation is not supported by your browser.',
        background: '#fff5f5',
        color: '#333',
        iconColor: '#d33',
        confirmButtonColor: '#d33',
        customClass: { popup: 'rounded-lg shadow-lg' }
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi password
    if (formData.password !== formData.confirmPassword) {
      return Swal.fire({
        icon: 'error',
        title: 'Registration Error',
        text: 'Passwords do not match',
        background: '#fff5f5',
        color: '#333',
        iconColor: '#d33',
        confirmButtonColor: '#d33',
        customClass: { popup: 'rounded-lg shadow-lg' }
      });
    }

    try {
      setLoading(true);

      const profile = {
        fullName: formData.fullName,
        phone: formData.phone,
        institution: formData.institution,
        location: {
          address: formData.address,
          city: formData.city,
          province: formData.province,
          // Simpan GeoPoint sebagai koordinat
          coordinates: formData.coordinates
        }
      };

      const userData = {
        email: formData.email,
        role: formData.role,
        status: 'active',
        profile,
        ...(formData.role === 'customer' && {
          rewards: { points: 0, tier: 'rookie' }
        })
      };

      await signup(formData.email, formData.password, userData);
      await Swal.fire({
        icon: 'success',
        title: 'Account Created',
        text: 'Your account has been created successfully! Please log in.',
        background: '#f0fff4',
        color: '#333',
        iconColor: '#28a745',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'rounded-lg shadow-lg' }
      });
      navigate('/login'); // Redirect ke halaman login
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: 'Failed to create account',
        background: '#fff5f5',
        color: '#333',
        iconColor: '#d33',
        confirmButtonColor: '#d33',
        customClass: { popup: 'rounded-lg shadow-lg' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-blue-50 font-poppins flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <UserPlus className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
          <p className="mt-2 text-sm text-blue-600">
            {step === 1 ? 'Choose your role and create credentials' : 'Complete your profile information'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
            <div className="mx-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-emerald-500 text-emerald-500 bg-white">
              1
            </div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
            <div className="mx-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-emerald-500 text-emerald-500 bg-white">
              2
            </div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Account</span>
            <span>Profile</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Form Register */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 ? (
            <>
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Select Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800"
                >
                  {Object.entries(ROLES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {ROLE_DESCRIPTIONS[formData.role]}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Create a password"
                    required
                  />
                  <span
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowPassword(prev => !prev); }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </span>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Confirm your password"
                    required
                  />
                  <span
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowConfirmPassword(prev => !prev); }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              {/* Institution (jika role bukan customer) */}
              {formData.role !== 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Institution
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <input
                      type="text"
                      name="institution"
                      value={formData.institution}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                      placeholder="Enter your institution name"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your address"
                    required
                  />
                </div>
              </div>

              {/* City & Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your city"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Province
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your province"
                    required
                  />
                </div>
              </div>

              {/* Get Location */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="flex-1 p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Get Current Location
                </button>
                <div className="flex-1 text-center">
                  {formData.coordinates && (
                    <span className="text-sm text-gray-800">
                      {`Lat: ${formData.coordinates.latitude.toFixed(2)}, Lng: ${formData.coordinates.longitude.toFixed(2)}`}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
          <div className="flex justify-between">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Back
              </button>
            )}
            {step < 2 && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Next
              </button>
            )}
            {step === 2 && (
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-blue-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
