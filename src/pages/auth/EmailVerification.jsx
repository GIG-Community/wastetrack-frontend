// src/pages/auth/EmailVerification.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { sendEmailVerification } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";
import Swal from "sweetalert2";
import { Mail, CheckCircle, ArrowLeft, Clock } from "lucide-react";

const EmailVerification = () => {
    const { currentUser, handleEmailVerified } = useAuth();
    const [cooldown, setCooldown] = useState(60);
    const [cooldownActive, setCooldownActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const checkVerificationInterval = useRef(null);
    const pageVisibilityHandler = useRef(null);

    // Mendapatkan email dari location state jika ada
    useEffect(() => {
        if (location.state && location.state.email) {
            setUserEmail(location.state.email);
        } else if (currentUser && currentUser.email) {
            setUserEmail(currentUser.email);
        }
    }, [location, currentUser]);

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

    // Pengecekan status verifikasi email secara periodik
    useEffect(() => {
        // Fungsi untuk memeriksa status verifikasi
        const checkEmailVerification = async () => {
            try {
                // Refresh token untuk mendapatkan status terbaru
                if (currentUser) {
                    await currentUser.reload();

                    // Jika email sudah diverifikasi, proses data user
                    if (currentUser.emailVerified) {
                        // Process verification with our new handler
                        await handleEmailVerified(currentUser);

                        Swal.fire({
                            icon: 'success',
                            title: 'Email Telah Diverifikasi',
                            text: 'Anda akan dialihkan ke halaman login',
                            background: '#f0fff4',
                            color: '#333',
                            iconColor: '#28a745',
                            timer: 2000,
                            showConfirmButton: false,
                            customClass: {
                                popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg shadow-lg',
                                title: 'text-base sm:text-xl font-semibold text-gray-800',
                                htmlContainer: 'text-sm sm:text-base text-gray-600'
                            }
                        });

                        // Tunggu sedikit agar user bisa melihat pesan sukses dan arahkan ke login
                        setTimeout(() => {
                            // First sign out the user
                            auth.signOut().then(() => {
                                navigate('/login');
                            });
                        }, 2000);
                    }
                }
            } catch (error) {
                console.error("Error checking email verification status:", error);
            }
        };

        // Set up interval untuk memeriksa status verifikasi setiap 10 detik
        checkVerificationInterval.current = setInterval(checkEmailVerification, 10000);

        // Periksa status verifikasi segera saat komponen di-mount
        checkEmailVerification();

        return () => {
            // Bersihkan interval saat komponen di-unmount
            if (checkVerificationInterval.current) {
                clearInterval(checkVerificationInterval.current);
            }
        };
    }, [currentUser, navigate, handleEmailVerified]);

    // Menangani perubahan visibilitas halaman (user berpindah tab/aplikasi dan kembali)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            // Ketika halaman menjadi visible lagi (user kembali dari tab/aplikasi lain)
            if (!document.hidden && currentUser) {
                // Reload user dan cek status verifikasi
                await currentUser.reload();

                if (currentUser.emailVerified) {
                    // Process verification with our handler
                    await handleEmailVerified(currentUser);

                    Swal.fire({
                        icon: 'success',
                        title: 'Email Telah Diverifikasi',
                        text: 'Anda akan dialihkan ke halaman login',
                        background: '#f0fff4',
                        color: '#333',
                        iconColor: '#28a745',
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg shadow-lg',
                            title: 'text-base sm:text-xl font-semibold text-gray-800',
                            htmlContainer: 'text-sm sm:text-base text-gray-600'
                        }
                    });

                    setTimeout(() => {
                        // First sign out the user
                        auth.signOut().then(() => {
                            navigate('/login');
                        });
                    }, 2000);
                }
            }
        };

        // Tambahkan event listener untuk visibilitychange
        document.addEventListener('visibilitychange', handleVisibilityChange);
        pageVisibilityHandler.current = handleVisibilityChange;

        return () => {
            // Bersihkan event listener saat komponen di-unmount
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentUser, navigate, handleEmailVerified]);

    const sendVerificationEmail = async () => {
        setLoading(true);
        setMessage("");

        try {
            if (currentUser) {
                // Jika user sudah login, langsung kirim email verifikasi
                await sendEmailVerification(currentUser);

                // Anggap email sudah berhasil dikirim
                setMessage("Email verifikasi telah dikirim!");

                Swal.fire({
                    icon: 'success',
                    title: 'Email Verifikasi Terkirim',
                    text: 'Silakan cek inbox atau folder spam email Anda',
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

                // Aktivasi cooldown setelah berhasil mengirim
                setCooldown(60);
                setCooldownActive(true);
            } else if (userEmail) {
                // Coba login untuk mendapatkan currentUser
                Swal.fire({
                    icon: 'info',
                    title: 'Sesi Berakhir',
                    text: 'Anda perlu login terlebih dahulu untuk mengirim ulang email verifikasi',
                    background: '#fff9e8',
                    color: '#333',
                    iconColor: '#f59e0b',
                    confirmButtonText: 'Ke Halaman Login',
                    confirmButtonColor: '#10b981',
                    customClass: {
                        popup: 'w-[90%] max-w-sm sm:max-w-md rounded-md sm:rounded-lg',
                        title: 'text-xl sm:text-2xl font-semibold text-gray-800',
                        htmlContainer: 'text-sm sm:text-base text-gray-600',
                        confirmButton: 'text-sm sm:text-base'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigate('/login', {
                            state: {
                                email: userEmail,
                                redirectAfterLogin: '/email-verification'
                            }
                        });
                    }
                });
            } else {
                throw new Error("Tidak dapat menemukan informasi pengguna untuk mengirim email verifikasi");
            }
        } catch (error) {
            console.error("Error sending verification email:", error);

            let errorMessage = error.message;
            // Jika error adalah auth/requires-recent-login, tampilkan pesan khusus
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = "Sesi Anda telah kedaluwarsa. Silakan login kembali untuk mengirim email verifikasi.";
            }

            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengirim Email',
                text: 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.',
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

            // Aktivasi cooldown bahkan setelah percobaan gagal untuk mencegah brute force
            setCooldown(60);
            setCooldownActive(true);
        } finally {
            setLoading(false);
        }
    };

    // Jika tidak ada currentUser dan tidak ada email yang tersimpan di state, 
    // tampilkan pesan dan link ke login
    if (!currentUser && !userEmail) {
        return (
            <div style={{ margin: '-24px' }}>
                <main className="flex min-h-screen w-full font-poppins">
                    <section className="w-full flex items-center justify-center p-6 sm:p-8">
                        <div className="w-full max-w-md space-y-6 rounded-lg sm:p-8">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full shadow-sm bg-emerald-100">
                                    <Mail className="text-emerald-600" size={24} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 sm:text-2xl">Verifikasi Email</h2>
                                <p className="mt-2 text-sm text-center text-gray-600 sm:text-base">
                                    Anda perlu login terlebih dahulu untuk mengakses halaman verifikasi email.
                                </p>
                            </div>
                            <Link
                                to="/login"
                                className="text-sm font-semibold w-full p-3 text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 sm:text-base inline-block text-center"
                            >
                                Kembali ke Login
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div style={{ margin: '-24px' }}>
            <main className="flex min-h-screen w-full font-poppins">
                <section className="w-full flex items-center justify-center p-6 sm:p-8">
                    <div className="w-full max-w-md space-y-6 rounded-lg sm:p-8">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full shadow-sm bg-emerald-100">
                                <Mail className="text-emerald-600" size={24} />
                            </div>
                            <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Verifikasi Email Anda</h1>
                            <p className="mt-2 text-sm text-center text-gray-600 sm:text-base">
                                Silakan verifikasi email <strong className="text-emerald-600">{userEmail || currentUser?.email}</strong>.
                                Klik tombol di bawah untuk mengirim email verifikasi.
                            </p>
                        </div>

                        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="text-left">
                                    <h2 className="text-md font-semibold text-gray-800">Petunjuk Verifikasi</h2>
                                    <p className="text-sm text-gray-600">
                                        Klik tautan yang dikirim ke email Anda untuk melakukan verifikasi.
                                        Pastikan email yang anda gunakan adalah email yang valid dan aktif.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className="p-4 text-sm bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="text-emerald-500" size={18} />
                                    <span>{message}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={sendVerificationEmail}
                            disabled={loading || cooldownActive}
                            className="text-sm font-medium w-full p-3 text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 sm:text-base"
                        >
                            {loading ? 'Mengirim...' : cooldownActive ? `Tunggu ${cooldown} detik` : 'Kirim Email Verifikasi'}
                        </button>

                        {cooldownActive && (
                            <div className="hidden flex items-center justify-center gap-2 text-xs sm:text-sm text-amber-600 mt-2">
                                <Clock className="w-4 h-4" />
                                <span>Mohon tunggu {cooldown} detik sebelum mencoba lagi</span>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default EmailVerification;