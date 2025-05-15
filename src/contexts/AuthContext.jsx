// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
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

  // Fungsi untuk mengirim email verifikasi
  async function verifyEmail(user) {
    try {
      await sendEmailVerification(user);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  }

  // Fungsi untuk menyimpan data pengguna ke Firestore setelah email diverifikasi
  async function saveUserData(uid, extraData) {
    try {
      const data = {
        ...extraData,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'users', uid), data);
      return true;
    } catch (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  }

  async function signup(email, password, extraData) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Simpan extraData di localStorage untuk digunakan setelah verifikasi
      localStorage.setItem(`pendingUserData_${user.uid}`, JSON.stringify({
        ...extraData,
        email: email
      }));

      // Kirim email verifikasi
      await sendEmailVerification(user);

      // Keep the user logged in - REMOVED signOut
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
      const user = result.user;

      // Periksa apakah email sudah diverifikasi
      if (!user.emailVerified) {
        // Logout user dan beri pesan error
        await signOut(auth);
        throw new Error("Email belum diverifikasi. Silakan cek email Anda untuk verifikasi.");
      }

      // Periksa apakah data pengguna sudah disimpan di Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      // Jika data belum ada di Firestore tapi email sudah diverifikasi, 
      // simpan data dari localStorage (jika ada)
      if (!userDoc.exists()) {
        const pendingDataKey = `pendingUserData_${user.uid}`;
        const pendingUserData = localStorage.getItem(pendingDataKey);

        if (pendingUserData) {
          const extraData = JSON.parse(pendingUserData);
          await saveUserData(user.uid, extraData);
          // Hapus data sementara dari localStorage
          localStorage.removeItem(pendingDataKey);
        } else {
          // Jika tidak ada data pending, simpan minimal data
          await saveUserData(user.uid, { email: user.email });
        }
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
      return () => { }; // Return empty function as fallback
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
        // Jika email sudah diverifikasi, setup realtime listener
        if (user.emailVerified) {
          // Periksa apakah data pengguna sudah disimpan di Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          // Jika data belum ada di Firestore tapi email sudah diverifikasi, 
          // simpan data dari localStorage (jika ada)
          if (!userDoc.exists()) {
            const pendingDataKey = `pendingUserData_${user.uid}`;
            const pendingUserData = localStorage.getItem(pendingDataKey);

            if (pendingUserData) {
              const extraData = JSON.parse(pendingUserData);
              await saveUserData(user.uid, extraData);
              // Hapus data sementara dari localStorage
              localStorage.removeItem(pendingDataKey);
            } else {
              // Jika tidak ada data pending, simpan minimal data
              await saveUserData(user.uid, { email: user.email });
            }
          }

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
          // Jika email belum diverifikasi, tidak perlu mengambil data user
          setUserData(null);
        }
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

  // Function to handle email verification completion
  async function handleEmailVerified(user) {
    try {
      // Reload the user to get the latest emailVerified status
      await user.reload();

      if (user.emailVerified) {
        // Check if user data exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        // If not, create it from localStorage data
        if (!userDoc.exists()) {
          const pendingDataKey = `pendingUserData_${user.uid}`;
          const pendingUserData = localStorage.getItem(pendingDataKey);

          if (pendingUserData) {
            const extraData = JSON.parse(pendingUserData);
            await saveUserData(user.uid, extraData);
            localStorage.removeItem(pendingDataKey);
          } else {
            await saveUserData(user.uid, { email: user.email });
          }
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error handling email verification:", error);
      throw error;
    }
  }

  const value = {
    currentUser,
    userData, // Data lengkap pengguna (termasuk role, profile, dll.)
    signup,
    login,
    logout,
    getUserData, // Keep original method for backward compatibility
    verifyEmail,
    saveUserData, // Menambahkan fungsi untuk menyimpan data pengguna
    handleEmailVerified // Add new function to handle verification completion
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children hanya jika loading sudah selesai */}
      {!loading && children}
    </AuthContext.Provider>
  );
}