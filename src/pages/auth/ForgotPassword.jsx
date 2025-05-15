// src/pages/auth/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Mail, ArrowLeft, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [cooldownActive, setCooldownActive] = useState(false);

    // Handle cooldown timer
    useEffect(() => {
        let interval;
        if (cooldownActive && cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prevCooldown) => prevCooldown - 1);
            }, 1000);
        } else if (cooldown === 0) {
            setCooldownActive(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [cooldownActive, cooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await sendPasswordResetEmail(auth, email);

            // Tampilkan notifikasi sukses
            await Swal.fire({
                icon: 'success',
                title: 'Email Terkirim',
                text: 'Instruksi reset password telah dikirim ke email Anda',
                background: '#f0fff4',
                color: '#333',
                iconColor: '#28a745',
                timer: 3000,
                showConfirmButton: false,
                customClass: {
                    popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg shadow-lg',
                    title: 'text-base sm:text-xl font-semibold text-gray-800',
                    htmlContainer: 'text-sm sm:text-base text-gray-600'
                }
            });

            setMessage('Tautan reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam Anda.');
            
            // Activate cooldown after successful submission
            setCooldown(60);
            setCooldownActive(true);
            
        } catch (error) {
            console.error("Password reset error:", error);
            setError('Gagal mengirim email reset password. Pastikan email Anda terdaftar.');

            // Tampilkan notifikasi error
            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengirim Email',
                text: 'Pastikan email yang Anda masukkan sudah terdaftar dan coba lagi',
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
            
            // Activate cooldown even after failed attempts to prevent brute force
            setCooldown(60);
            setCooldownActive(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ margin: '-24px' }}>
            <main className="flex min-h-screen w-full font-poppins">
                <section className="w-full flex items-center justify-center p-6 sm:p-8">
                    <div className="w-full max-w-md space-y-6 rounded-lg sm:p-8">
                        <div className="flex flex-col items-center">
                            <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Lupa Password?</h1>
                            <p className="mt-2 text-sm text-center text-gray-600 sm:text-base">
                                Masukkan alamat email Anda untuk menerima tautan reset password
                            </p>
                        </div>

                        {message && (
                            <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Masukkan email Anda"
                                        className="text-sm w-full p-3 pl-10 text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || cooldownActive}
                                className="text-sm font-medium w-full p-3 text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 sm:text-base"
                            >
                                {loading ? 'Mengirim...' : cooldownActive ? `Tunggu ${cooldown} detik` : 'Reset Password'}
                            </button>

                            {cooldownActive && (
                                <div className="hidden flex items-center justify-center gap-2 text-xs sm:text-sm text-amber-600">
                                    <Clock className="w-4 h-4" />
                                    <span>Mohon tunggu {cooldown} detik sebelum mencoba lagi</span>
                                </div>
                            )}

                            <div className="text-center">
                                <Link to="/login" className="inline-flex items-center text-xs sm:text-sm font-medium text-emerald-600 hover:text-emerald-700">
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Kembali ke halaman login
                                </Link>
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ForgotPassword;