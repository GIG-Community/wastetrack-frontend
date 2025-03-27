// src/hooks/useAuth.jsx
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Custom hook untuk mengakses AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
