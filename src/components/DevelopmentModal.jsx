import { Construction, Settings } from 'lucide-react';

const DevelopmentModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="p-2 fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
            {/* Modal container */}
            <div className="bg-white rounded-xl shadow-2xl sm:w-full sm:max-w-md mx-4 overflow-hidden transform transition-all">
                {/* Modal header */}
                <div className="bg-emerald-50 px-6 py-4 flex items-center border-b border-emerald-100">
                    <Construction className="text-emerald-600 mr-3" size={24} />
                    <h3 className="text-base sm:text-lg font-semibold text-emerald-800">Pemberitahuan</h3>
                </div>

                {/* Modal body */}
                <div className="p-4 sm:px-6 sm:py-6">
                    <div className="text-center mb-4">
                        <div className="flex justify-center">
                        </div>
                        <p className="text-xl font-bold text-gray-800 mb-3">Fitur Sedang Dikembangkan</p>
                        <p className="text-sm text-gray-600">
                            Mohon maaf, fitur ini masih dalam tahap pengembangan dan belum dapat diakses saat ini.
                        </p>
                    </div>
                </div>

                {/* Modal footer */}
                <div className="pb-4 px-4">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-emerald-600 text-sm text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        </div>
    );
};
export default DevelopmentModal;