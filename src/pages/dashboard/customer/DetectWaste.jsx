// src/pages/dashboard/customer/DetectWaste.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  Info,
  AlertCircle,
  Image,
  Loader2,
  Check,
  X,
  Trash2,
  DollarSign,
  HelpCircle,
  MessageSquare,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import {
  wasteTypes,
  WASTE_PRICES,
  WASTE_CATEGORIES,
  getWasteDetails
} from '../../../lib/constants';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

const DetectWaste = () => {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [detectedWasteDetails, setDetectedWasteDetails] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Always use back camera by default
          width: { ideal: 990 }, // Aslinya 1280
          height: { ideal: 740 } // Aslinya 720
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
        setShowGuide(true);
        setDetectedWasteDetails(null);
        setCapturedImage(null);
      }
    } catch (err) {
      showFlashMessage('Gagal mengakses kamera', 'error');
      console.error('Error accessing camera:', err);
    }
  };

  useEffect(() => {
    // Automatically start camera when component mounts
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const showFlashMessage = (message, type = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  const captureImage = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.naturalWidth || videoRef.current.videoWidth;
    canvas.height = videoRef.current.naturalHeight || videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(imageUrl);
    setShowGuide(false);
    return imageUrl;
  };

  const detectWaste = async () => {
    if (!isCameraActive || !videoRef.current?.srcObject) {
      showFlashMessage('Silakan aktifkan kamera terlebih dahulu', 'error');
      return;
    }

    setDetecting(true);
    setDetectedWasteDetails(null);
    const imageUrl = captureImage();

    if (!imageUrl) {
      showFlashMessage('Gagal mengambil gambar', 'error');
      setDetecting(false);
      return;
    }

    // console.log(`Captured image data URL length: ${imageUrl.length}`);
    const base64Image = imageUrl.split(',')[1];
    // console.log(`Captured image base64 length: ${base64Image?.length || 0}`);

    try {
      const response = await fetch('/api/detect-waste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Deteksi gagal: ${response.statusText}`);
      }

      const result = await response.json();
      const detectedTypeId = result.wasteTypeId;
      const confidence = result.confidence || 0;
      const description = result.description || '';
      const price = result.price || 0;
      const recommendations = result.recommendations || '';
      const bagColor = result.bagColor || 'transparan';

      if (!detectedTypeId) {
        throw new Error('API tidak mengembalikan ID jenis sampah yang valid.');
      }

      // console.log(`Detected waste: ${detectedTypeId} with confidence: ${confidence}`);
      // console.log(`Price: Rp ${price}/kg | Bag color: ${bagColor}`);
      // console.log(`Description: ${description}`);
      // console.log(`Recommendations: ${recommendations}`);

      processDetectedWaste(detectedTypeId, confidence, description, price, recommendations, bagColor);

    } catch (error) {
      console.error("Detection Error:", error);
      showFlashMessage(error.message || 'Deteksi gagal. Silakan coba lagi.', 'error');
      setDetectedWasteDetails(null);
    } finally {
      setDetecting(false);
    }
  };

  const processDetectedWaste = (
    detectedTypeId,
    confidence = 0,
    description = '',
    price = 0,
    recommendations = '',
    bagColor = ''
  ) => {
    try {
      // console.log(`Processing detected waste ID: ${detectedTypeId}`);
      const details = getWasteDetails(detectedTypeId);
      const category = WASTE_CATEGORIES[detectedTypeId] || 'unknown';

      // Determine appropriate bag color based on waste category
      let recommendedBagColor = bagColor;
      if (!recommendedBagColor || recommendedBagColor === 'transparan') {
        recommendedBagColor = getCategoryBagColor(category);
      }

      if (!details && detectedTypeId !== 'unknown') {
        console.warn(`No details found for this type of waste`);
        showFlashMessage(`Terdeteksi sampah, tetapi informasi belum lengkap.`, 'warning');
        setDetectedWasteDetails({
          id: detectedTypeId,
          name: 'Jenis Sampah Baru',
          price: price || 0,
          category: 'unknown',
          confidence,
          description: description || 'Belum tersedia informasi lengkap tentang jenis sampah ini.',
          recommendations: recommendations || 'Coba ambil foto dari sudut berbeda untuk hasil yang lebih baik.',
          bagColor: recommendedBagColor
        });
      } else if (detectedTypeId === 'unknown') {
        showFlashMessage(`Tidak dapat mengenali jenis sampah. Silakan coba lagi.`, 'warning');
        setDetectedWasteDetails({
          id: 'unknown',
          name: 'Sampah Tidak Dikenali',
          price: 0,
          category: 'unknown',
          confidence,
          description: description || 'Foto yang diberikan tidak menunjukkan sampah dengan jelas. Mungkin bukan sampah atau gambar terlalu gelap/buram.',
          recommendations: recommendations || [
            'Coba ambil foto dari sudut yang berbeda',
            'Pastikan pencahayaan cukup terang',
            'Letakkan sampah di tempat yang kontras dengan latar belakang',
            'Bersihkan atau pisahkan bagian sampah dan coba lagi'
          ],
          bagColor: recommendedBagColor
        });
      } else {
        setDetectedWasteDetails({
          ...details,
          price: price || WASTE_PRICES[detectedTypeId] || 0,
          category,
          confidence,
          description: description || details.description,
          recommendations: recommendations || details.recommendations,
          bagColor: recommendedBagColor
        });
        showFlashMessage(`Terdeteksi: ${details.name}.`, 'success');
      }
    } catch (error) {
      console.error("Error processing waste details:", error);
      showFlashMessage('Gagal memproses detail sampah.', 'error');
      setDetectedWasteDetails(null);
    }
  };

  // Function to get appropriate bag color based on waste category
  const getCategoryBagColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'plastic': return 'biru';
      case 'paper': return 'kuning';
      case 'glass': return 'hijau';
      case 'metal': return 'abu-abu';
      case 'organic': return 'coklat';
      case 'electronics': return 'merah';
      case 'hazardous': return 'merah';
      default: return 'transparan';
    }
  };

  const resetDetection = () => {
    setDetectedWasteDetails(null);
    setCapturedImage(null);
    setShowGuide(true);
    startCamera(); // Restart camera when resetting
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'paper': return 'yellow';
      case 'plastic': return 'blue';
      case 'metal': return 'gray';
      case 'glass': return 'cyan';
      case 'organic': return 'emerald';
      case 'sack': return 'orange';
      case 'others': return 'purple';
      default: return 'gray';
    }
  };

  const testGeminiApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      console.log("Testing AI connection...");
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: "Sebutkan 3 jenis sampah yang dapat didaur ulang." }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error API: ${response.statusText}`);
      }

      // console.log("API test response:", data);
      setApiTestResult({
        success: true,
        text: "Koneksi AI berhasil."
      });
      showFlashMessage('Uji koneksi AI berhasil!', 'success');

    } catch (error) {
      console.error("API Test Error:", error);
      setApiTestResult({
        success: false,
        text: "Gagal terhubung ke AI."
      });
      showFlashMessage('Uji AI gagal. Lihat konsol untuk detail.', 'error');
    } finally {
      setIsTestingApi(false);
    }
  };

  const getBagColorClass = (bagColor) => {
    const colorMap = {
      'biru': 'bg-blue-500 text-white',
      'kuning': 'bg-yellow-400 text-black',
      'merah': 'bg-red-500 text-white',
      'hijau': 'bg-green-500 text-white',
      'coklat': 'bg-amber-700 text-white',
      'hitam': 'bg-gray-800 text-white',
      'abu-abu': 'bg-gray-400 text-black',
      'transparan': 'bg-gray-200 text-black'
    };
    return colorMap[bagColor?.toLowerCase()] || 'bg-gray-200 text-black';
  };

  // Fixed function to handle recommendations properly
  const getRecommendationItems = (recommendations) => {
    if (!recommendations) return [];

    // Check if recommendations is an array or a string
    if (Array.isArray(recommendations)) {
      return recommendations.filter(item => item && item.trim().length > 0);
    }

    if (typeof recommendations === 'string') {
      // Split by bullet points, commas, or periods followed by whitespace
      return recommendations
        .split(/[•,.]\s+/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }

    return []; // Return empty array if recommendations is neither string nor array
  };

  const categoryColor = detectedWasteDetails ? getCategoryColor(detectedWasteDetails.category) : 'gray';
  const bgColor = `bg-${categoryColor}-50`;
  const textColor = `text-${categoryColor}-600`;
  const iconBgColor = `bg-${categoryColor}-100`;
  const iconTextColor = `text-${categoryColor}-600`;
  const checkTextColor = `text-${categoryColor}-500`;

  const translateCategory = (category) => {
    const translations = {
      'paper': 'Kertas',
      'plastic': 'Plastik',
      'metal': 'Logam',
      'glass': 'Kaca',
      'organic': 'Organik',
      'sack': 'Karung',
      'others': 'Lainnya',
      'unknown': 'Tidak Dikenal'
    };
    return translations[category] || category;
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-semibold sm:font-bold text-gray-800">Deteksi Sampah</h1>
        <p className="mt-1 text-sm sm:text-lg text-gray-600">
          Arahkan kamera pada sampah untuk mengidentifikasi jenisnya menggunakan AI.
        </p>
      </div>

      {flashMessage && (
        <div className={`fixed top-20 right-4 left-4 z-50 p-3 text-left rounded-lg shadow-lg
          ${flashMessage.type === 'success' ? 'bg-emerald-500' : flashMessage.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'} 
          text-white flex items-center justify-between transition-opacity duration-300 ${flashMessage ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-xs sm:text-base">{flashMessage.message}</span>
          {/* <button onClick={() => setFlashMessage(null)}
            className="ml-3 flex-shrink-0">
            {flashMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button> */}
        </div>
      )}

      <div className="relative bg-black rounded-2xl overflow-hidden mb-6 aspect-[3/4] border-2 border-emerald-500">
        {capturedImage ? (
          <img src={capturedImage} alt="Sampah terdeteksi" className="object-contain w-full h-full" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="object-cover w-full h-full"
          />
        )}

        {!capturedImage && !isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <button
              onClick={startCamera}
              title="Mulai Kamera"
              className="p-4 transition-colors bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <Camera className="w-8 h-8 text-emerald-600" />
              <span className="block mt-2 text-sm text-white">Mulai Kamera</span>
            </button>
          </div>
        )}

        {showGuide && isCameraActive && !capturedImage && !detectedWasteDetails && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Transparent overlay with instruction */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
              {/* Center box */}
              <div className="flex items-center justify-center border-2 border-white border-dashed rounded-lg w-44 h-44 md:w-52 md:h-52 animate-pulse">
                <div className="p-3 bg-black bg-opacity-50 rounded-lg">
                  <p className="text-sm font-medium text-center text-white">
                    Posisikan sampah di tengah
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        {!detectedWasteDetails ? (
          <button
            onClick={detecting ? undefined : detectWaste}
            disabled={detecting || !isCameraActive || !stream}
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm sm:text-lg shadow-xs sm:shadow-md
              ${detecting || !isCameraActive || !stream
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700'
              }`}
          >
            {detecting ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                Mendeteksi...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                Deteksi Sampah
              </>
            )}
          </button>
        ) : (
          <button
            onClick={resetDetection}
            className="flex items-center justify-center w-full gap-2 py-3 font-medium transition-colors border-2 text-sm sm:text-lg shadow-xs sm:shadow-md text-emerald-700 border-emerald-300 sm:rounded-xl hover:bg-emerald-50"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            Deteksi Sampah Lain
          </button>
        )}
      </div>

      <div className="hidden mb-6">
        <button
          onClick={testGeminiApi}
          disabled={isTestingApi}
          className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors
            ${isTestingApi
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
            }`}
        >
          {isTestingApi ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menguji Koneksi AI...
            </>
          ) : (
            <>
              <Info className="w-4 h-4" />
              Uji Koneksi AI
            </>
          )}
        </button>

        {apiTestResult && (
          <div className={`p-4 mt-3 rounded-lg ${apiTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start justify-between">
              <h4 className={`font-medium ${apiTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {apiTestResult.success ? 'Uji API Berhasil' : 'Uji API Gagal'}
              </h4>
              <button
                onClick={() => setApiTestResult(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-sm">
              {apiTestResult.text}
            </div>
          </div>
        )}
      </div>

      {detectedWasteDetails && (
        <div className="space-y-4 animate-fade-in">
          <div className={`sm:${bgColor} sm:p-6 text-left rounded-xl sm:shadow-md`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${iconBgColor}`}>
                {detectedWasteDetails.category === 'paper' && <Image className={`${iconTextColor} h-6 w-6`} />}
                {detectedWasteDetails.category === 'plastic' && <Trash2 className={`${iconTextColor} h-6 w-6`} />}
                {detectedWasteDetails.category === 'metal' && <AlertCircle className={`${iconTextColor} h-6 w-6`} />}
                {detectedWasteDetails.category === 'glass' && <AlertCircle className={`${iconTextColor} h-6 w-6`} />}
                {detectedWasteDetails.category === 'organic' && <Trash2 className={`${iconTextColor} h-6 w-6`} />}
                {!['paper', 'plastic', 'metal', 'glass', 'organic', 'unknown'].includes(detectedWasteDetails.category) && <Info className={`${iconTextColor} h-6 w-6`} />}
                {detectedWasteDetails.category === 'unknown' && <HelpCircle className={`${iconTextColor} h-6 w-6`} />}
              </div>
              <div className="flex-1">
                <h3 className={`text-md sm:text-lg font-semibold ${textColor}`}>
                  {detectedWasteDetails.id === 'unknown' ? 'Sampah Tidak Dikenali' : `${detectedWasteDetails.name}`}
                </h3>
                <p className="text-xs text-gray-600 capitalize">
                  Kategori: {translateCategory(detectedWasteDetails.category)}
                </p>
                {detectedWasteDetails.confidence > 0 && detectedWasteDetails.id !== 'unknown' && (
                  <p className="text-xs text-gray-600">
                    Tingkat keyakinan: {Math.round(detectedWasteDetails.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 space-y-4 border-t">
              <div className="flex items-center gap-2">
                <DollarSign className={`w-4 h-4 sm:h-5 sm:w-5 flex-shrink-0 ${checkTextColor}`} />
                <span className="text-sm">Nilai estimasi: <strong>Rp {detectedWasteDetails.price?.toLocaleString('id-ID') || 0} / kg</strong></span>
              </div>

              {detectedWasteDetails.bagColor && (
                <div className="flex items-center gap-2">
                  <ShoppingBag className={`w-4 h-4sm:h-5 sm:w-5 flex-shrink-0 ${checkTextColor}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">Kantong sampah:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBagColorClass(detectedWasteDetails.bagColor)}`}>
                      {detectedWasteDetails.bagColor.charAt(0).toUpperCase() + detectedWasteDetails.bagColor.slice(1)}
                    </span>
                  </div>
                </div>
              )}

              {detectedWasteDetails.description && (
                <div className="p-2 sm:bg-white bg-opacity-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className={`h-5 w-5 mt-0.5 flex-shrink-0 ${checkTextColor}`} />
                    <div>
                      <h4 className="font-medium text-gray-800">Informasi</h4>
                      <p className="mt-1 text-sm text-gray-600">{detectedWasteDetails.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {detectedWasteDetails.recommendations && (
                <div className="p-2 sm:bg-white bg-opacity-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className={`h-5 w-5 mt-0.5 flex-shrink-0 ${checkTextColor}`} />
                    <div>
                      <h4 className="font-medium text-gray-800">Tips Penanganan</h4>
                      <ul className="pl-1 mt-1 space-y-3">
                        {getRecommendationItems(detectedWasteDetails.recommendations).map((item, index) => (
                          <li key={index} className="flex items-start gap-1.5 text-sm text-gray-600">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 ${iconBgColor}`}></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {detectedWasteDetails.id === 'unknown' && (
                <div className="hidden flex items-center justify-center pt-2 mt-4 border-t">
                  <button
                    onClick={resetDetection}
                    className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
                  >
                    Coba Foto Ulang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectWaste;