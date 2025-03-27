// src/pages/dashboard/customer/DetectWaste.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Info, 
  Award,
  AlertCircle,
  Image,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';

const WASTE_TYPES = {
  organic: {
    label: 'Organic',
    points: 5,
    color: 'emerald',
    bag: 'Green Trashbag',
    description: 'Food waste, garden waste, etc.',
    tips: 'Perfect for composting! Keep it separate from non-biodegradables.'
  },
  plastic: {
    label: 'Plastic',
    points: 8,
    color: 'blue',
    bag: 'Blue Trashbag',
    description: 'Bottles, containers, packaging',
    tips: 'Remember to clean and dry before disposal.'
  },
  paper: {
    label: 'Paper',
    points: 6,
    color: 'yellow',
    bag: 'Yellow Trashbag',
    description: 'Newspapers, cardboard, documents',
    tips: 'Flatten boxes to save space.'
  },
  metal: {
    label: 'Metal',
    points: 10,
    color: 'gray',
    bag: 'Blue Trashbag',
    description: 'Cans, aluminum items',
    tips: 'Clean and crush to optimize space.'
  }
};

const DetectWaste = () => {
  const { userData, currentUser } = useAuth();
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [wasteType, setWasteType] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
        setShowGuide(true);
      }
    } catch (err) {
      showFlashMessage('Error accessing camera', 'error');
      console.error('Error accessing camera:', err);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Switch camera
  const switchCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isCameraActive ? 'user' : 'environment'
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsCameraActive(!isCameraActive);
    } catch (err) {
      showFlashMessage('Error switching camera', 'error');
    }
  };

  const showFlashMessage = (message, type = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageUrl);
    return imageUrl;
  };

  const detectWaste = async () => {
    if (!isCameraActive) {
      showFlashMessage('Please start the camera first', 'error');
      return;
    }

    setDetecting(true);
    const imageUrl = captureImage();

    try {
      // Simulate API call to ML model
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate detection result
      const types = Object.keys(WASTE_TYPES);
      const detectedType = types[Math.floor(Math.random() * types.length)];
      setWasteType(detectedType);

      // Update user rewards
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const pointsEarned = WASTE_TYPES[detectedType].points;
        
        await updateDoc(userRef, {
          'rewards.points': increment(pointsEarned)
        });

        showFlashMessage(`Earned ${pointsEarned} points!`, 'success');
      }
    } catch (error) {
      showFlashMessage('Detection failed. Please try again.', 'error');
    } finally {
      setDetecting(false);
    }
  };

  const resetDetection = () => {
    setWasteType(null);
    setCapturedImage(null);
    setShowGuide(true);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Waste Detection</h1>
        <p className="text-gray-600 mt-1">
          Point your camera at waste to identify and get proper disposal recommendations
        </p>
      </div>

      {/* Flash Message */}
      {flashMessage && (
        <div className={`fixed top-4 right-4 left-4 z-50 p-4 rounded-lg shadow-lg
          ${flashMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} 
          text-white flex items-center justify-between`}
        >
          <span>{flashMessage.message}</span>
          {flashMessage.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </div>
      )}

      {/* Camera View */}
      <div className="relative bg-black rounded-2xl overflow-hidden mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full aspect-[4/3] object-cover"
        />
        
        {/* Camera Controls */}
        <div className="absolute bottom-4 right-4 flex gap-3">
          <button
            onClick={startCamera}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            <Camera className="h-6 w-6 text-gray-700" />
          </button>
          
          <button
            onClick={switchCamera}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        {/* Camera Guide */}
        {showGuide && isCameraActive && !wasteType && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white rounded-lg border-dashed animate-pulse">
              <div className="w-full h-full flex items-center justify-center text-white text-sm text-center p-4">
                Center the waste item in this area
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detection Button */}
      <button
        onClick={detecting ? undefined : detectWaste}
        disabled={detecting || !isCameraActive}
        className={`w-full py-4 rounded-xl font-medium mb-6 flex items-center justify-center gap-2
          ${detecting || !isCameraActive 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
      >
        {detecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Detecting...
          </>
        ) : (
          <>
            <Camera className="h-5 w-5" />
            Detect Waste
          </>
        )}
      </button>

      {/* Results */}
      {wasteType && WASTE_TYPES[wasteType] && (
        <div className="space-y-4">
          {/* Detection Result */}
          <div className={`p-6 bg-${WASTE_TYPES[wasteType].color}-50 rounded-xl`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg bg-${WASTE_TYPES[wasteType].color}-100`}>
                <Award className={`h-6 w-6 text-${WASTE_TYPES[wasteType].color}-600`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {WASTE_TYPES[wasteType].label} Waste Detected
                </h3>
                <p className="text-gray-600 mt-1">
                  {WASTE_TYPES[wasteType].description}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* Recommended Bag */}
              <div className="flex items-center gap-2 text-sm">
                <Check className={`h-5 w-5 text-${WASTE_TYPES[wasteType].color}-500`} />
                <span>Use <strong>{WASTE_TYPES[wasteType].bag}</strong> for disposal</span>
              </div>

              {/* Points Earned */}
              <div className="flex items-center gap-2 text-sm">
                <Award className={`h-5 w-5 text-${WASTE_TYPES[wasteType].color}-500`} />
                <span>Earned <strong>{WASTE_TYPES[wasteType].points} points</strong> for detection</span>
              </div>

              {/* Disposal Tip */}
              <div className="flex items-center gap-2 text-sm">
                <Info className={`h-5 w-5 text-${WASTE_TYPES[wasteType].color}-500`} />
                <span>{WASTE_TYPES[wasteType].tips}</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetDetection}
            className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Detect Another Item
          </button>
        </div>
      )}
    </div>
  );
};

export default DetectWaste;