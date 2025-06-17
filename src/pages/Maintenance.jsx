import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';

const Maintenance = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: 'Site Maintenance',
            subtitle: 'We are currently undergoing scheduled maintenance.',
            description: 'Our team is working hard to improve your experience. Please check back soon.',
            button: 'Return to Home',
            secondaryButton: 'Contact Support',
            errorCode: '503'
        },
        id: {
            title: 'Pemeliharaan Situs',
            subtitle: 'Saat ini kami sedang melakukan pemeliharaan terjadwal.',
            description: 'Tim kami sedang bekerja keras untuk meningkatkan pengalaman Anda. Silakan periksa kembali nanti.',
            button: 'Kembali ke Beranda',
            errorCode: '503'
        }
    };

    const text = content[language] || content.en;

    return (
        <div className="min-h-screen flex items-center justify-center sm:bg-gradient-to-r from-blue-50 to-indigo-50"
            style={{
                margin: '-24px -24px'
            }}>
            <div className="max-w-md w-full space-y-4 text-center">
                <div>
                    <h1 className="text-8xl sm:text-9xl font-extrabold text-blue-600 tracking-widest">
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
                        to="https://wastetrack-its.com"
                        className="inline-block px-6 py-3 border border-transparent text-xs sm:text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        {text.button}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;