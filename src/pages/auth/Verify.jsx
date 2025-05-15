import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAuth, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { app } from '../../lib/firebase'; // Pastikan path ini sesuai dengan struktur folder Anda

const Verify = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Verifying...');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showResetForm, setShowResetForm] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth(app);

    useEffect(() => {
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        const continueUrl = searchParams.get('continueUrl');

        if (mode === 'verifyEmail' && oobCode) {
            applyActionCode(auth, oobCode)
                .then(() => {
                    setStatus('Email berhasil diverifikasi! Silakan login.');
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
                });
        } else if (mode === 'resetPassword' && oobCode) {
            // Verifikasi kode reset password
            verifyPasswordResetCode(auth, oobCode)
                .then(() => {
                    setShowResetForm(true);
                    setStatus('Masukkan password baru Anda');
                })
                .catch((error) => {
                    console.error(error);
                    setStatus('Link reset password tidak valid atau sudah kadaluarsa.');
                });
        } else if (mode === 'recoverEmail' && oobCode) {
            // Handle recover email
            applyActionCode(auth, oobCode)
                .then(() => {
                    setStatus('Email recovery berhasil! Email Anda telah dipulihkan.');
                })
                .catch((error) => {
                    console.error(error);
                    setStatus('Pemulihan email gagal atau link tidak valid.');
                });
        } else {
            setStatus('Parameter tidak valid.');
        }
    }, [searchParams, navigate, auth]);

    const handleResetPassword = (e) => {
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

        // Reset password
        confirmPasswordReset(auth, oobCode, password)
            .then(() => {
                setShowResetForm(false);
                setStatus('Password berhasil diubah! Silakan login dengan password baru Anda.');
                // Redirect ke halaman login setelah beberapa detik
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            })
            .catch((error) => {
                console.error(error);
                setError('Gagal mengubah password: ' + error.message);
            });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">{status}</h2>

                {showResetForm && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password Baru
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Konfirmasi Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Reset Password
                        </button>
                    </form>
                )}

                {!showResetForm && status !== 'Verifying...' && (
                    <div className="text-center mt-4">
                        <a
                            href="/login"
                            className="inline-block text-blue-600 hover:text-blue-800"
                        >
                            Kembali ke halaman login
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verify;