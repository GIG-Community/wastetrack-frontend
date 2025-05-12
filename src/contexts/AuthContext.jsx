// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Membuat context untuk autentikasi
export const AuthContext = createContext();

// Custom hook untuk mengakses AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provider untuk AuthContext
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  // Simpan data lengkap pengguna, termasuk role dan profil
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fungsi signup: membuat user baru dan menyimpan data tambahan ke Firestore
  async function signup(email, password, extraData) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const data = {
        ...extraData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'users', user.uid), data);
      return user;
    } catch (error) {
      console.error("Error in signup:", error);
      throw error;
    }
  }

  // Fungsi login: masuk dengan email dan password
  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error("Error in login:", error);
      throw error;
    }
  }

  // Fungsi logout: keluar dari akun dan reset data pengguna
  async function logout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error in logout:", error);
      throw error;
    }
  }

  // Fungsi untuk mengambil data pengguna dari Firestore berdasarkan UID
  // Mengembalikan fungsi unsubscribe untuk membersihkan listener
  function getUserDataRealtime(uid, callback) {
    try {
      const userDocRef = doc(db, 'users', uid);
      // Set up real-time listener
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = {
            id: uid,
            ...docSnapshot.data()
          };
          callback(data);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error("Error getting real-time user data:", error);
        callback(null);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up real-time user data:", error);
      callback(null);
      return () => {}; // Return empty function as fallback
    }
  }

  // Keep the old getUserData for compatibility with existing code
  async function getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return {
          id: uid,
          ...userDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  }

  // Listener otentikasi: perbarui currentUser dan userData saat status otentikasi berubah
  useEffect(() => {
    let userDataUnsubscribe = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed - user:', user?.uid);
      
      // Clean up previous listener if exists
      if (userDataUnsubscribe) {
        userDataUnsubscribe();
        userDataUnsubscribe = null;
      }
      
      if (user) {
        // Set up real-time listener for user data
        userDataUnsubscribe = getUserDataRealtime(user.uid, (data) => {
          console.log('User data updated:', data);
          if (data) {
            setUserData(data);
          } else {
            setUserData(null);
          }
        });
      } else {
        setUserData(null);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });
    
    return () => {
      authUnsubscribe();
      if (userDataUnsubscribe) {
        userDataUnsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    userData, // Data lengkap pengguna (termasuk role, profile, dll.)
    signup,
    login,
    logout,
    getUserData // Keep original method for backward compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children hanya jika loading sudah selesai */}
      {!loading && children}
    </AuthContext.Provider>
  );
}
