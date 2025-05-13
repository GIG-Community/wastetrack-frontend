import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';

const Forbidden = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: 'Access Forbidden',
            subtitle: 'You do not have permission to access this page.',
            description: 'Please contact your administrator if you believe this is an error.',
            button: 'Return to Home',
            errorCode: '403'
        },
        id: {
            title: 'Akses Ditolak',
            subtitle: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
            description: 'Silakan hubungi administrator Anda jika Anda yakin ini adalah kesalahan.',
            button: 'Kembali ke Beranda',
            errorCode: '403'
        }
    };

    const text = content[language] || content.en;

    return (
        <div className="min-h-screen flex items-center justify-center sm:bg-gradient-to-r from-red-50 to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-4 text-center">
                <div>
                    <h1 className="text-8xl sm:text-9xl font-extrabold text-red-600 tracking-widest">
                        {text.errorCode}
                    </h1>
                </div>

                <div className="mt-8">
                    <h2 className="text-lg sm:text-3xl font-bold text-gray-800 tracking-tight mb-4">
                        {text.subtitle}
                    </h2>
                    <p className="text-xs text-gray-600 mt-2 mb-8">
                        {text.description}
                    </p>

                    <Link
                        to="/login"
                        className="inline-block px-6 py-3 border border-transparent text-xs sm:text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        {text.button}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Forbidden;