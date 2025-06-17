import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';

const NotFound = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            subtitle: 'Oops! The page you are looking for does not exist.',
            description: 'The page might have been moved, deleted, or never existed.',
            button: 'Return to Home',
            errorCode: '404'
        },
        id: {
            subtitle: 'Oops! Halaman yang Anda cari tidak ada.',
            description: 'Halaman mungkin telah dipindahkan, dihapus, atau tidak pernah ada.',
            button: 'Kembali ke Beranda',
            errorCode: '404'
        }
    };

    const text = content[language] || content.en;

    return (
        <div className="min-h-screen flex items-center justify-center sm:bg-gradient-to-r from-green-50 to-teal-50"
            style={{
                margin: '-24px -24px'
            }}>
            <div className="max-w-md w-full space-y-4 text-center">
                <div>
                    <h1 className="text-8xl sm:text-9xl font-extrabold text-teal-600 tracking-widest">
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
                        className="inline-block px-6 py-3 border border-transparent text-xs sm:text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        {text.button}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;