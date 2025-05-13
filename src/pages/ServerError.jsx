import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';

const ServerError = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: 'Server Error',
            subtitle: 'Oops! Something went wrong on our server.',
            description: 'We\'re working to fix the issue. Please try again later or contact our support team if the problem persists.',
            button: 'Return to Home',
            reload: 'Reload Page',
            errorCode: '500'
        },
        id: {
            title: 'Kesalahan Server',
            subtitle: 'Oops! Terjadi kesalahan pada server kami.',
            description: 'Kami sedang memperbaiki masalah ini. Silakan coba lagi nanti atau hubungi tim dukungan kami jika masalah berlanjut.',
            button: 'Kembali ke Beranda',
            reload: 'Muat Ulang',
            errorCode: '500'
        }
    };

    const text = content[language] || content.en;

    return (
        <div className="min-h-screen flex items-center justify-center sm:bg-gradient-to-r from-purple-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-4 text-center">
                <div>
                    <h1 className="text-8xl sm:text-9xl font-extrabold text-purple-600 tracking-widest">
                        {text.errorCode}
                    </h1>
                </div>

                <div className="mt-8">
                    <h2 className="sm:text-3xl font-bold text-gray-800 tracking-tight mb-4">
                        {text.subtitle}
                    </h2>
                    <p className="text-xs text-gray-600 mt-4 mb-8">
                        {text.description}
                    </p>

                    <Link
                        to="/login"
                        className="w-full sm:w-auto px-6 py-3 border border-transparent text-xs sm:text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        {text.button}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ServerError;