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
    const checkAuthorization = () => {
      if (!currentUser) {
        setAuthStatus('unauthorized');
        return;
      }

      if (allowedRoles && userData) {
        const userRole = userData.role;
        if (!allowedRoles.includes(userRole)) {
          setAuthStatus('unauthorized');
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

  // Redirect jika tidak berhak
  if (authStatus === 'unauthorized') {
    return <Navigate to={currentUser ? '/403' : '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
