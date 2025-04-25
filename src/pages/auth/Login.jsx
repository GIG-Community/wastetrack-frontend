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
          popup: 'rounded-lg shadow-lg'
        }
      });

      navigate('/dashboard');
    } catch (err) {
      // SweetAlert2 untuk notifikasi error dengan tampilan custom
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: 'Email atau password tidak valid',
        background: '#fff5f5', // background merah muda muda
        color: '#333',         // teks yang gelap untuk kontras
        iconColor: '#d33',     // warna ikon error merah
        confirmButtonColor: '#d33',
        customClass: {
          popup: 'rounded-lg shadow-lg'
        }
      });
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
    <main className="grid min-h-screen lg:grid-cols-2 font-poppins">
      {/* Left Panel – Form Login */}
      <section className="flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-xl p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full shadow-sm bg-emerald-100">
              <LogIn size={24} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Selamat Datang Kembali!</h1>
            <p className="mt-2 text-sm text-gray-600">Masuk ke akun Anda</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Masukkan email Anda"
                  className="w-full p-3 pl-10 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full p-3 pl-10 pr-12 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400"
                />
                {/* Toggle show/hide password menggunakan elemen span */}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
            <p className="text-sm text-center text-gray-700">
              Belum punya akun?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Daftar Sekarang
              </Link>
            </p>
          </form>
        </div>
      </section>

      {/* Right Panel – Informasi */}
      <section className="flex-col items-center justify-center hidden p-8 lg:flex bg-gradient-to-br from-emerald-600 to-emerald-800 xl:p-16">
        <div className="w-full max-w-lg px-4">
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
  );
}
