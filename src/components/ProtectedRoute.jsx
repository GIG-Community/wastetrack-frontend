import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData } = useAuth();
  const [authStatus, setAuthStatus] = useState('checking');
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayPassed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Cek otorisasi user
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!currentUser) {
        setAuthStatus('unauthorized');
        return;
      }

      // CEK EMAIL VERIFIKASI - PERBAIKAN: tidak lagi logout otomatis
      if (!currentUser.emailVerified) {
        setAuthStatus('unverified');
        return;
      }

      // Cek role
      if (allowedRoles && userData) {
        const userRole = userData.role;
        if (!allowedRoles.includes(userRole)) {
          setAuthStatus('forbidden');
          return;
        }
      }

      setAuthStatus('authorized');
    };

    checkAuthorization();
  }, [currentUser, userData, allowedRoles]);

  if (authStatus === 'checking' || !delayPassed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-emerald-500" />
      </div>
    );
  }

  // Handle berbagai status otentikasi
  if (authStatus === 'unauthorized') {
    return <Navigate to="/login" replace />;
  }

  if (authStatus === 'unverified') {
    // Redirect ke halaman verifikasi email jika status unverified
    return <Navigate to="/email-verification" state={{ email: currentUser?.email }} replace />;
  }

  if (authStatus === 'forbidden') {
    return <Navigate to="/403" replace />;
  }

  // Jika semua cek lulus, tampilkan children
  if (authStatus === 'authorized') {
    return children; // Show the protected content when authorized
  }

  // Default fallback: redirect to login for any other status
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;