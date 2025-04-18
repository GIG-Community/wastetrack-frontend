// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

  // Fungsi login: masuk dengan email dan password, kemudian ambil data tambahan dari Firestore
  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        const data = {
          id: result.user.uid,  // Menambahkan id ke data user
          ...userDoc.data()
        };
        setUserData(data);
      }
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
  async function getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return {
          id: uid,  // Menambahkan id ke data user
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed - user:', user?.uid);
      if (user) {
        const data = await getUserData(user.uid);
        console.log('User data fetched:', data);
        const updatedUserData = {
          id: user.uid,
          ...data
        };
        console.log('Setting userData to:', updatedUserData);
        setUserData(updatedUserData);
      } else {
        setUserData(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userData, // Data lengkap pengguna (termasuk role, profile, dll.)
    signup,
    login,
    logout,
    getUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children hanya jika loading sudah selesai */}
      {!loading && children}
    </AuthContext.Provider>
  );
}
