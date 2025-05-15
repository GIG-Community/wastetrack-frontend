import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import app from '../../lib/firebase'; // Pastikan Anda mengimpor app dari file firebase Anda
import { CheckCircle, Lock, Eye, EyeOff, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const Verify = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Verifying...');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showResetForm, setShowResetForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const auth = getAuth(app);    useEffect(() => {
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        const continueUrl = searchParams.get('continueUrl');

        if (mode === 'verifyEmail' && oobCode) {
            applyActionCode(auth, oobCode)
                .then(() => {
                    setStatus('Email berhasil diverifikasi! Silakan login.');
                    setIsLoading(false);
                    // Sukses sweetalert
                    Swal.fire({
                        icon: 'success',
                        title: 'Email Terverifikasi',
                        text: 'Email Anda berhasil diverifikasi!',
                        background: '#f0fff4',
                        color: '#333',
                        iconColor: '#10b981',
                        timer: 3000,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'rounded-lg shadow-lg',
                        }
                    });
                    
                    // Redirect ke halaman login setelah beberapa detik jika ada continueUrl
                    if (continueUrl) {
                        setTimeout(() => {
                            window.location.href = continueUrl;
                        }, 3000);
                    }
                })
                .catch((error) => {
                    console.error(error);
                    setStatus('Verifikasi gagal atau link tidak valid.');
                    setIsLoading(false);
                    // Error sweetalert
                    Swal.fire({
                        icon: 'error',
                        title: 'Verifikasi Gagal',
                        text: 'Link verifikasi tidak valid atau sudah kadaluarsa.',
                        background: '#fff5f5',
                        color: '#333',
                        iconColor: '#ef4444',
                        confirmButtonColor: '#ef4444',
                    });
                });
        } else if (mode === 'resetPassword' && oobCode) {
            // Verifikasi kode reset password
            verifyPasswordResetCode(auth, oobCode)
                .then(() => {
                    setShowResetForm(true);
                    setStatus('Masukkan password baru Anda');
                    setIsLoading(false);
                })
                .catch((error) => {
                    console.error(error);
                    setStatus('Link reset password tidak valid atau sudah kadaluarsa.');
                    setIsLoading(false);
                    // Error sweetalert
                    Swal.fire({
                        icon: 'error',
                        title: 'Link Tidak Valid',
                        text: 'Link reset password tidak valid atau sudah kadaluarsa.',
                        background: '#fff5f5',
                        color: '#333',
                        iconColor: '#ef4444',
                        confirmButtonColor: '#ef4444',
                    });
                });
        } else if (mode === 'recoverEmail' && oobCode) {
            // Handle recover email
            applyActionCode(auth, oobCode)
                .then(() => {
                    setStatus('Email recovery berhasil! Email Anda telah dipulihkan.');
                    setIsLoading(false);
                    // Sukses sweetalert
                    Swal.fire({
                        icon: 'success',
                        title: 'Email Dipulihkan',
                        text: 'Email Anda berhasil dipulihkan!',
                        background: '#f0fff4',
                        color: '#333',
                        iconColor: '#10b981',
                        timer: 3000,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'rounded-lg shadow-lg',
                        }
                    });
                })
                .catch((error) => {
                    console.error(error);
                    setStatus('Pemulihan email gagal atau link tidak valid.');
                    setIsLoading(false);
                    // Error sweetalert
                    Swal.fire({
                        icon: 'error',
                        title: 'Pemulihan Gagal',
                        text: 'Link pemulihan email tidak valid atau sudah kadaluarsa.',
                        background: '#fff5f5',
                        color: '#333',
                        iconColor: '#ef4444',
                        confirmButtonColor: '#ef4444',
                    });
                });
        } else {
            setStatus('Parameter tidak valid.');
            setIsLoading(false);
            // Warning sweetalert
            Swal.fire({
                icon: 'warning',
                title: 'Parameter Tidak Valid',
                text: 'Link yang Anda gunakan tidak valid.',
                background: '#fff9e8',
                color: '#333',
                iconColor: '#f59e0b',
                confirmButtonColor: '#f59e0b',
            });
        }
    }, [searchParams, navigate, auth]);    const handleResetPassword = (e) => {
        e.preventDefault();
        const oobCode = searchParams.get('oobCode');

        // Validasi password
        if (password.length < 6) {
            setError('Password harus minimal 6 karakter');
            return;
        }

        if (password !== confirmPassword) {
            setError('Password tidak cocok');
            return;
        }

        setIsLoading(true);
        // Reset password
        confirmPasswordReset(auth, oobCode, password)
            .then(() => {
                setShowResetForm(false);
                setStatus('Password berhasil diubah! Silakan login dengan password baru Anda.');
                setIsLoading(false);
                
                // Sukses sweetalert
                Swal.fire({
                    icon: 'success',
                    title: 'Password Diubah',
                    text: 'Password Anda berhasil diubah! Silakan login dengan password baru Anda.',
                    background: '#f0fff4',
                    color: '#333',
                    iconColor: '#10b981',
                    timer: 3000,
                    showConfirmButton: false,
                    customClass: {
                        popup: 'rounded-lg shadow-lg',
                    }
                });
                
                // Redirect ke halaman login setelah beberapa detik
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            })
            .catch((error) => {
                console.error(error);
                setError('Gagal mengubah password: ' + error.message);
                setIsLoading(false);
                
                // Error sweetalert
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Mengubah Password',
                    text: `Gagal mengubah password: ${error.message}`,
                    background: '#fff5f5',
                    color: '#333',
                    iconColor: '#ef4444',
                    confirmButtonColor: '#ef4444',
                });
            });
    };    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 mx-auto bg-white rounded-xl shadow-lg sm:p-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-700">Memproses...</h2>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-center mb-6">
                            {showResetForm ? (
                                <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-emerald-100">
                                    <Lock size={28} className="text-emerald-600" />
                                </div>
                            ) : status.includes('berhasil') ? (
                                <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-emerald-100">
                                    <CheckCircle size={28} className="text-emerald-600" />
                                </div>
                            ) : status.includes('gagal') || status.includes('invalid') || status.includes('tidak valid') ? (
                                <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
                                    <AlertCircle size={28} className="text-red-600" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-100">
                                    <Mail size={28} className="text-blue-600" />
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">{status}</h2>
                        </div>

                        {showResetForm && (
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password Baru
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full p-3 pl-10 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="Masukkan password baru"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Password minimal 6 karakter</p>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                        Konfirmasi Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full p-3 pl-10 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="Konfirmasi password baru"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start">
                                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                        )}

                        {!showResetForm && status !== 'Verifying...' && (
                            <div className="text-center mt-6">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center py-2 px-4 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors duration-200"
                                >
                                    Kembali ke halaman login
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Verify;