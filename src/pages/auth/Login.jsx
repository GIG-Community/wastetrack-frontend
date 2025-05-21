import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Bell,
  Zap
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, currentUser, loading: authLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);

      // SweetAlert2 untuk notifikasi sukses dengan tampilan custom
      await Swal.fire({
        icon: 'success',
        title: 'Login Sukses',
        text: 'Anda berhasil masuk!',
        background: '#f0fff4', // background hijau muda
        color: '#333',         // teks yang gelap
        iconColor: '#28a745',  // warna ikon hijau
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg shadow-lg',
          title: 'text-base sm:text-xl font-semibold text-gray-800',
          htmlContainer: 'text-sm sm:text-base text-gray-600'
        }
      });

      // Check if we need to redirect to a specific page after login
      const redirectPath = location.state?.redirectAfterLogin || '/dashboard';
      navigate(redirectPath, {
        state: location.state?.email ? { email: location.state.email } : undefined
      });
    } catch (err) {
      console.error("Login error:", err);
      // Cek apakah error terkait verifikasi email
      if (err.message && err.message.includes("Email belum diverifikasi")) {
        // SweetAlert untuk error verifikasi email
        Swal.fire({
          icon: 'warning',
          title: 'Email Belum Diverifikasi',
          text: 'Silakan verifikasi email Anda.',
          background: '#fff9e8',
          color: '#333',
          iconColor: '#f59e0b',
          confirmButtonText: 'Pergi ke halaman verifikasi',
          confirmButtonColor: '#f59e0b',
          customClass: {
            popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
            title: 'text-base sm:text-xl font-semibold text-gray-800',
            htmlContainer: 'text-sm sm:text-base text-gray-600',
            confirmButton: 'text-sm font-md sm:text-base',
          }
        }).then((result) => {
          if (result.isConfirmed) {
            navigate('/email-verification', { state: { email: formData.email } });
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'Email atau password tidak valid',
          background: '#fff5f5',
          color: '#333',
          iconColor: '#d33',
          confirmButtonColor: '#d33',
          customClass: {
            popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
            title: 'text-xl sm:text-2xl font-semibold text-gray-800',
            htmlContainer: 'text-sm sm:text-base text-gray-600',
            confirmButton: 'text-sm sm:text-base'
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (authLoading) return <div>Loading...</div>;
  if (currentUser) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ margin: '-24px' }}>
      <main className="flex min-h-screen w-full font-poppins">
        {/* Left Panel – Form Login */}
        <section className="w-full flex items-center justify-center p-6 sm:p-8 lg:w-1/2">
          <div className="w-full max-w-2xl space-y-6 rounded-lg sm:p-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full shadow-sm bg-emerald-100">
                <LogIn size={24} className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Selamat Datang Kembali!</h1>
              <p className="mt-2 text-sm text-gray-600 sm:text-base">Masuk ke akun Anda</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-left block mb-1 text-xs font-medium text-gray-500 sm:text-sm">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Masukkan email Anda"
                    className="text-sm w-full p-3 pl-10 text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="text-left block mb-1 text-xs font-medium text-gray-500 sm:text-sm">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Masukkan kata sandi Anda"
                    className="text-sm w-full p-3 pl-10 pr-12 text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm  sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                  />
                  {/* Toggle show/hide password menggunakan elemen span */}
                  <span
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setShowPassword(prev => !prev); }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </span>
                </div>
                <div className="text-right sm:pt-2">
                  <Link to="/forgot-password" className="text-[10px] sm:text-sm font-medium text-emerald-600 hover:text-emerald-700 sm:text-sm">
                    Lupa Password?
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="text-sm font-semibold w-full p-3 text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 sm:text-base"
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
              <p className="text-xs text-center text-gray-700 sm:text-sm">
                Belum punya akun?{' '}
                <Link to="/register" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 sm:text-sm">
                  Daftar
                </Link>
              </p>
            </form>
          </div>
        </section>

        {/* Right Panel – Informasi */}
        <section className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
          <div className="w-full max-w-xl mx-auto px-4">
            <h2 className="mb-6 text-3xl font-bold text-center text-white xl:text-4xl">
              Selamat Datang di WasteTrack
            </h2>
            <p className="mb-12 text-lg text-center text-white/90">
              Bergabunglah dengan kami untuk mewujudkan masa depan yang berkelanjutan melalui pengelolaan sampah yang efisien.
            </p>
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 text-white rounded-lg backdrop-blur-sm bg-white/10">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-lg">Pantau progres pengelolaan sampah Anda</p>
              </div>
              <div className="flex items-center gap-4 p-4 text-white rounded-lg backdrop-blur-sm bg-white/10">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                  <Bell className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-lg">Update dan notifikasi real-time</p>
              </div>
              <div className="flex items-center gap-4 p-4 text-white rounded-lg backdrop-blur-sm bg-white/10">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-lg">Solusi efisien dan berkelanjutan</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
