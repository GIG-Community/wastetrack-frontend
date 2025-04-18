// src/pages/auth/Register.jsx
import { useState, useEffect } from 'react';
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
import { GeoPoint, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Daftar role yang tersedia (ditambah role super_admin)
const ROLES = {
  super_admin: "Super Admin",
  customer: "Customer",
  collector: "Collector",
  wastebank_master: "Wastebank Master",
  wastebank_admin: "Wastebank Admin",
  industry: "Industry",
  government: "Government",
  marketplace: "Marketplace",
  wastebank_master_collector: "Wastebank Master Collector",
};

const ROLE_DESCRIPTIONS = {
  super_admin: "Manage all aspects of the system and oversee all users.",
  customer: "Manage your household waste and earn rewards",
  collector: "Collect and transport waste efficiently from small wastebank",
  wastebank_master: "Bank sampah induk",
  wastebank_admin: "Oversee waste bank operations",
  industry: "Access recycling materials and manage sustainability",
  government: "Monitor and analyze environmental impact",
  marketplace: "Marketplace for buying and selling waste products",
  wastebank_master_collector: "Collector for waste bank induk",
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
  const [wasteBanks, setWasteBanks] = useState([]);
  const [wasteBankMasters, setWasteBankMasters] = useState([]);
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

  // Function to fetch waste banks based on role
  const fetchWasteBanks = async (role) => {
    try {
      let queryRef;
      if (role === 'collector') {
        queryRef = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin')
        );
      } else if (role === 'wastebank_master_collector') {
        queryRef = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_master')
        );
      }

      const snapshot = await getDocs(queryRef);
      const banks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (role === 'collector') {
        setWasteBanks(banks);
      } else {
        setWasteBankMasters(banks);
      }
    } catch (error) {
      console.error('Error fetching waste banks:', error);
    }
  };

  // Watch for role changes to fetch appropriate waste banks
  useEffect(() => {
    if (formData.role === 'collector') {
      fetchWasteBanks('collector');
    } else if (formData.role === 'wastebank_master_collector') {
      fetchWasteBanks('wastebank_master_collector');
    }
  }, [formData.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
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
      setError(''); // Clear any existing errors
      console.log('Registration data:', formData); // Debug log

      const profile = {
        fullName: formData.fullName,
        phone: formData.phone,
        institution: formData.role === 'collector' || formData.role === 'wastebank_master_collector' 
          ? formData.institution // Gunakan ID institusi langsung dari form
          : formData.institution,
        institutionName: formData.role === 'collector' || formData.role === 'wastebank_master_collector'
          ? (wasteBanks.find(bank => bank.id === formData.institution)?.profile?.institution || 
             wasteBankMasters.find(bank => bank.id === formData.institution)?.profile?.institution)
          : formData.institution,
        location: {
          address: formData.address,
          city: formData.city,
          province: formData.province,
          coordinates: formData.coordinates
        }
      };

      console.log('Profile to be saved:', profile); // Debug log

      const userData = {
        email: formData.email,
        role: formData.role,
        status: 'active',
        profile,
        // Add balance fields based on role
        ...(formData.role === 'customer' && {
          rewards: { points: 0, tier: 'rookie' },
          balance: 0, // Balance for redeemed points
          earnings: 0, // Earnings from waste deposits
        }),
        ...(formData.role === 'wastebank_admin' && {
          balance: 0, // Bank's available balance for paying collectors/customers
          pendingPayments: 0, // Bank's pending payments to customers/collectors
        }),
        ...(formData.role === 'collector' && {
          balance: 0, // Collector's earned balance
          earnings: 0, // Collector's pending earnings
        }),
        ...(formData.role === 'wastebank_master' && {
          balance: 0, // Initial balance for waste bank master
          pendingPayments: 0, // Pending payments for waste bank master
        }),
        ...(formData.role === 'wastebank_master_collector' && {
          balance: 0, // Collector's earned balance
          earnings: 0, // Collector's pending earnings
        })
      };

      console.log('Final user data:', userData); // Debug log

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
      console.error('Registration error:', err);
      const errorMessage = err.code === 'auth/email-already-in-use' 
        ? 'This email is already registered. Please use a different email or try logging in.'
        : 'Failed to create account. Please try again.';
      
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: errorMessage,
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

  const handleNextStep = () => {
    // Validate passwords before allowing to proceed
    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError(''); // Clear error if validation passes
    setStep(step + 1);
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4 bg-blue-50 font-poppins">
      <div className="w-full max-w-2xl p-8 bg-white shadow-lg rounded-xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4 rounded-full h-14 w-14 bg-emerald-100">
            <UserPlus className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl">Create Account</h2>
          <p className="mt-2 text-sm text-blue-600">
            {step === 1 ? 'Choose your role and create credentials' : 'Complete your profile information'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
            <div className="flex items-center justify-center w-6 h-6 mx-2 text-xs font-medium bg-white border-2 rounded-full border-emerald-500 text-emerald-500">
              1
            </div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
            <div className="flex items-center justify-center w-6 h-6 mx-2 text-xs font-medium bg-white border-2 rounded-full border-emerald-500 text-emerald-500">
              2
            </div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Account</span>
            <span>Profile</span>
          </div>
        </div>

        {/* Error Message - Moved outside the form to be always visible */}
        {error && (
          <div className="p-3 mb-6 text-sm text-center text-red-600 border border-red-100 rounded-lg bg-red-50">
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
                    <Mail className="w-5 h-5 text-blue-400" />
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
                    <Lock className="w-5 h-5 text-blue-400" />
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowPassword(prev => !prev); }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    <Lock className="w-5 h-5 text-blue-400" />
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowConfirmPassword(prev => !prev); }}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    <User className="w-5 h-5 text-blue-400" />
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
                    <Phone className="w-5 h-5 text-blue-400" />
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

              {/* Institution */}
              {formData.role !== 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Institution
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    {(formData.role === 'collector' || formData.role === 'wastebank_master_collector') ? (
                      <select
                        name="institution"
                        value={formData.institution}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800"
                        required
                      >
                        <option value="">Select a waste bank</option>
                        {formData.role === 'collector' && wasteBanks.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.profile?.institution || 'Unnamed Bank'}
                          </option>
                        ))}
                        {formData.role === 'wastebank_master_collector' && wasteBankMasters.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.profile?.institution || 'Unnamed Master Bank'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="institution"
                        value={formData.institution}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder:text-gray-400"
                        placeholder="Enter your institution name"
                        required
                      />
                    )}
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
                    <MapPin className="w-5 h-5 text-blue-400" />
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Back
              </button>
            )}
            {step < 2 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700"
              >
                Next
              </button>
            )}
            {step === 2 && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>
        <p className="mt-4 text-sm text-center text-blue-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
