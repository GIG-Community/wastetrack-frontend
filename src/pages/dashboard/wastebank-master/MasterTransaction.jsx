import { useState, useEffect } from 'react';
import { collection, query, where, doc, setDoc, getDoc, runTransaction, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, AlertCircle, UserCheck, User, Users, Filter, Wallet, Calculator, Clock, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

export default function MasterSalaryManagement() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [pointsToConvert, setPointsToConvert] = useState(0);
  const [salaryConfig, setSalaryConfig] = useState({
    baseSalary: 0,
  });
  const [userStats, setUserStats] = useState({
    totalCollections: 0,
    totalWasteCollected: 0,
    totalValue: 0,
    points: 0,
    balance: 0
  });
  const [wasteBankBalance, setWasteBankBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [unsubscribes, setUnsubscribes] = useState([]);

  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [unsubscribes]);

  const fetchTransactionHistory = async (userId) => {
    if (!userId) return;
    
    try {
      setLoadingTransactions(true);
      
      const currentUnsubscribes = [...unsubscribes];
      const transactionsUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'transactions');
      if (transactionsUnsubscribeIndex !== -1 && typeof currentUnsubscribes[transactionsUnsubscribeIndex].fn === 'function') {
        currentUnsubscribes[transactionsUnsubscribeIndex].fn();
        currentUnsubscribes.splice(transactionsUnsubscribeIndex, 1);
      }
      
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      
      const unsubscribe = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const transactionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));
          
          const sortedTransactions = transactionsData.sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          ).slice(0, 10);
          
          setTransactions(sortedTransactions);
          setLoadingTransactions(false);
        },
        (error) => {
          console.error('Error memantau riwayat transaksi:', error);
          setLoadingTransactions(false);
        }
      );
      
      setUnsubscribes([...currentUnsubscribes, { name: 'transactions', fn: unsubscribe }]);
      
    } catch (error) {
      console.error('Error memantau riwayat transaksi:', error);
      setLoadingTransactions(false);
    }
  };

  const fetchWasteBankBalance = async () => {
    if (!userData?.id) return;
    
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'users', userData.id),
        (snapshot) => {
          if (snapshot.exists()) {
            setWasteBankBalance(snapshot.data().balance || 0);
          }
        },
        (error) => {
          console.error('Error memantau saldo bank sampah:', error);
        }
      );
      
      setUnsubscribes(prev => {
        const filtered = prev.filter(u => u.name !== 'wastebank');
        return [...filtered, { name: 'wastebank', fn: unsubscribe }];
      });
      
    } catch (error) {
      console.error('Error memantau saldo bank sampah:', error);
    }
  };

  useEffect(() => {
    fetchWasteBankBalance();
  }, [userData]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData?.id) return;
      
      try {
        setLoadingUsers(true);
        
        const currentUnsubscribes = [...unsubscribes];
        const pickupsUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'pickups');
        const collectorsUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'collectors');
        const wastebanksUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'wastebanks');
        const customersUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'customers');
        
        if (pickupsUnsubscribeIndex !== -1 && typeof currentUnsubscribes[pickupsUnsubscribeIndex].fn === 'function') {
          currentUnsubscribes[pickupsUnsubscribeIndex].fn();
          currentUnsubscribes.splice(pickupsUnsubscribeIndex, 1);
        }
        
        if (collectorsUnsubscribeIndex !== -1 && typeof currentUnsubscribes[collectorsUnsubscribeIndex].fn === 'function') {
          currentUnsubscribes[collectorsUnsubscribeIndex].fn();
          currentUnsubscribes.splice(collectorsUnsubscribeIndex, 1);
        }
        
        if (wastebanksUnsubscribeIndex !== -1 && typeof currentUnsubscribes[wastebanksUnsubscribeIndex].fn === 'function') {
          currentUnsubscribes[wastebanksUnsubscribeIndex].fn();
          currentUnsubscribes.splice(wastebanksUnsubscribeIndex, 1);
        }
        
        if (customersUnsubscribeIndex !== -1 && typeof currentUnsubscribes[customersUnsubscribeIndex].fn === 'function') {
          currentUnsubscribes[customersUnsubscribeIndex].fn();
          currentUnsubscribes.splice(customersUnsubscribeIndex, 1);
        }
        
        const newUnsubscribes = [...currentUnsubscribes];
        
        const pickupsQuery = query(
          collection(db, 'masterBankRequests'),
          where('masterBankId', '==', userData.id)
        );
        
        const pickupsUnsubscribe = onSnapshot(
          pickupsQuery,
          (snapshot) => {
            const customerIds = [...new Set(
              snapshot.docs.map(doc => doc.data().userId)
            )].filter(Boolean);
            
            fetchRelatedUsers(customerIds, newUnsubscribes);
          },
          (error) => {
            console.error('Error memantau permintaan:', error);
            fetchRelatedUsers([], newUnsubscribes);
          }
        );
        
        newUnsubscribes.push({ name: 'pickups', fn: pickupsUnsubscribe });
        setUnsubscribes(newUnsubscribes);
        
      } catch (error) {
        console.error('Error menyiapkan pantauan pengguna:', error);
        setLoadingUsers(false);
        Swal.fire({
          icon: 'error',
          title: 'Kesalahan',
          text: 'Gagal memuat data pengguna',
        });
      }
    };
    
    const fetchRelatedUsers = (customerIds, currentUnsubscribes) => {
      try {
        const collectorQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_master_collector'),
          where('profile.institution', '==', userData.id)
        );
        
        const wasteBankQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin')
        );
        
        const collectorUnsubscribe = onSnapshot(
          collectorQuery,
          (collectorSnapshot) => {
            const wasteBankUnsubscribe = onSnapshot(
              wasteBankQuery,
              async (wasteBankSnapshot) => {
                let customerSnapshot = { docs: [] };
                
                if (customerIds.length > 0) {
                  try {
                    const customerQuery = query(
                      collection(db, 'users'),
                      where('role', '==', 'customer'),
                      where('__name__', 'in', customerIds)
                    );
                    
                    const customerUnsubscribe = onSnapshot(
                      customerQuery,
                      (snapshot) => {
                        processAllUserData(collectorSnapshot, wasteBankSnapshot, snapshot);
                      },
                      (error) => {
                        console.error('Error memantau pelanggan:', error);
                        processAllUserData(collectorSnapshot, wasteBankSnapshot, { docs: [] });
                      }
                    );
                    
                    currentUnsubscribes.push({ name: 'customers', fn: customerUnsubscribe });
                  } catch (error) {
                    console.error('Error menyiapkan pantauan pelanggan:', error);
                    processAllUserData(collectorSnapshot, wasteBankSnapshot, { docs: [] });
                  }
                } else {
                  processAllUserData(collectorSnapshot, wasteBankSnapshot, { docs: [] });
                }
              },
              (error) => {
                console.error('Error memantau bank sampah:', error);
                processAllUserData(collectorSnapshot, { docs: [] }, { docs: [] });
              }
            );
            
            currentUnsubscribes.push({ name: 'wastebanks', fn: wasteBankUnsubscribe });
          },
          (error) => {
            console.error('Error memantau kolektor:', error);
            setLoadingUsers(false);
          }
        );
        
        currentUnsubscribes.push({ name: 'collectors', fn: collectorUnsubscribe });
        setUnsubscribes(currentUnsubscribes);
        
      } catch (error) {
        console.error('Error menyiapkan pantauan pengguna terkait:', error);
        setLoadingUsers(false);
      }
    };
    
    const processAllUserData = (collectorSnapshot, wasteBankSnapshot, customerSnapshot) => {
      try {
        const usersData = [
          ...collectorSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          ...wasteBankSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          ...(customerSnapshot?.docs || []).map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        ];
        
        setUsers(usersData);
        setLoadingUsers(false);
      } catch (error) {
        console.error('Error memproses data pengguna:', error);
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [userData]);

  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      
      // Create a safe copy of unsubscribe functions
      const currentUnsubscribes = [...unsubscribes];
      
      // Clean up previous listeners more safely
      currentUnsubscribes.forEach((unsubscribe, index) => {
        if (unsubscribe && 
           (unsubscribe.name === 'userDetails' || unsubscribe.name === 'userPickups') && 
           typeof unsubscribe.fn === 'function') {
          unsubscribe.fn();
          currentUnsubscribes.splice(index, 1);
        }
      });
      
      // Set up new listener for user details
      const userUnsubscribe = onSnapshot(
        doc(db, 'users', userId),
        async (userDoc) => {
          if (!userDoc.exists()) {
            throw new Error('Pengguna tidak ditemukan');
          }

          const userData = userDoc.data();
          
          setPointsToConvert(0);
          
          if (userData.role === 'collector') {
            try {
              const salaryDoc = await getDoc(doc(db, 'salaries', userId));
              setSalaryConfig({
                baseSalary: salaryDoc.exists() ? salaryDoc.data().config.baseSalary : 0,
              });
            } catch (error) {
              console.error('Error fetching salary config:', error);
              setSalaryConfig({ baseSalary: 0 });
            }
          } else {
            // Set default salary for non-collectors
            setSalaryConfig({ baseSalary: 0 });
          }

          // Determine correct collection and field name based on user role
          const collectionName = userData.role === 'wastebank_admin' ? 'masterBankRequests' : 'pickups';
          const fieldName = userData.role === 'collector' ? 'collectorId' : 'userId';

          // Set up listener for user's pickups or requests
          const pickupsQuery = query(
            collection(db, collectionName), 
            where(fieldName, '==', userId)
          );

          const pickupsUnsubscribe = onSnapshot(
            pickupsQuery,
            (pickupsSnapshot) => {
              let totalCollections = 0;
              let totalWasteCollected = 0;
              let totalValue = 0;

              pickupsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'completed') {
                  totalCollections++;
                  totalValue += data.totalValue || 0;
                  
                  // Support different waste data formats
                  if (data.wastes) {
                    Object.values(data.wastes).forEach(waste => {
                      totalWasteCollected += Number(waste.weight) || 0;
                    });
                  } else if (data.wasteWeights) {
                    Object.values(data.wasteWeights).forEach(weight => {
                      totalWasteCollected += Number(weight) || 0;
                    });
                  } else if (data.wasteQuantities) {
                    Object.values(data.wasteQuantities).forEach(quantity => {
                      totalWasteCollected += Number(quantity) || 0;
                    });
                  }
                }
              });

              setUserStats({
                totalCollections,
                totalWasteCollected,
                totalValue,
                balance: userData.balance || 0,
                points: userData.role === 'customer' ? userData.rewards?.points || 0 : 0,
              });

              setLoading(false);
            },
            (error) => {
              console.error('Error memantau pengambilan sampah:', error);
              setLoading(false);
            }
          );
          
          // Update unsubscribes array with new functions using a safer approach
          const newUnsubscribes = [
            ...currentUnsubscribes,
            { name: 'userDetails', fn: userUnsubscribe },
            { name: 'userPickups', fn: pickupsUnsubscribe }
          ];
          setUnsubscribes(newUnsubscribes);
        },
        (error) => {
          console.error('Error memantau data pengguna:', error);
          setLoading(false);
        }
      );

      await fetchTransactionHistory(userId);

    } catch (error) {
      console.error('Error memuat detail pengguna:', error);
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan',
        text: 'Gagal memuat detail pengguna',
      });
      setLoading(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    fetchUserDetails(userId);
  };

  const handlePayment = async () => {
    if (!selectedUserId || !userData?.id) return;

    try {
      setLoading(true);
      
      const selectedUser = users.find(u => u.id === selectedUserId);
      const isCustomer = selectedUser?.role === 'customer';
      
      let paymentAmount = 0;
      
      if (isCustomer) {
        const pointsRequested = Number(pointsToConvert);
        if (pointsRequested <= 0 || pointsRequested > userStats.points) {
          throw new Error('Jumlah poin tidak valid');
        }
        paymentAmount = pointsRequested * 100;
      } else {
        paymentAmount = salaryConfig.baseSalary;
      }
      
      if (paymentAmount <= 0) {
        throw new Error('Jumlah pembayaran tidak valid');
      }

      if (wasteBankBalance < paymentAmount) {
        throw new Error('Saldo bank sampah tidak mencukupi');
      }

      await runTransaction(db, async (transaction) => {
        const wasteBankRef = doc(db, 'users', userData.id);
        const userRef = doc(db, 'users', selectedUserId);
        
        const wasteBankDoc = await transaction.get(wasteBankRef);
        const currentBalance = wasteBankDoc.data().balance || 0;
        
        if (currentBalance < paymentAmount) {
          throw new Error('Saldo bank sampah tidak mencukupi');
        }
        
        transaction.update(wasteBankRef, {
          balance: currentBalance - paymentAmount,
          updatedAt: new Date()
        });
        
        if (isCustomer) {
          transaction.update(userRef, {
            balance: (selectedUser.balance || 0) + paymentAmount,
            'rewards.points': userStats.points - pointsToConvert,
            updatedAt: new Date()
          });
        } else {
          transaction.update(userRef, {
            balance: (selectedUser.balance || 0) + paymentAmount,
            updatedAt: new Date()
          });
        }
        
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: selectedUserId,
          wasteBankId: userData.id,
          amount: paymentAmount,
          type: isCustomer ? 'points_conversion' : 'salary_payment',
          pointsConverted: isCustomer ? pointsToConvert : 0,
          createdAt: new Date(),
          status: 'completed'
        });
      });

      setPointsToConvert(0);

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Pembayaran sebesar Rp ${paymentAmount.toLocaleString()} telah diproses dengan sukses`,
      });
    } catch (error) {
      console.error('Error memproses pembayaran:', error);
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan',
        text: error.message || 'Gagal memproses pembayaran',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch = 
      user.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.phone?.includes(searchTerm);
    
    return matchesRole && matchesSearch;
  });

  const UserListSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="w-full p-3 border rounded-lg border-zinc-200 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 rounded-full bg-zinc-200"></div>
              <div>
                <div className="w-32 h-4 rounded-md bg-zinc-200"></div>
                <div className="w-24 h-3 mt-1.5 bg-zinc-200 rounded-md"></div>
              </div>
            </div>
            <div className="w-16 h-5 rounded-full bg-zinc-200"></div>
          </div>
        </div>
      ))}
    </>
  );

  const UserDetailsSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="w-full h-10 mb-6 rounded-md bg-zinc-200"></div>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="w-32 h-5 mb-2 rounded-md bg-zinc-200"></div>
          <div className="w-full h-10 rounded-md bg-zinc-200"></div>
        </div>
      </div>
      <div className="w-full rounded-md h-60 bg-zinc-200"></div>
    </div>
  );

  const TransactionSkeleton = () => (
    <>
      {[1, 2, 3].map((item) => (
        <div key={item} className="p-4 border-b border-zinc-100 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-40 h-5 rounded-md bg-zinc-200"></div>
            <div className="w-24 h-5 rounded-md bg-zinc-200"></div>
          </div>
          <div className="w-20 h-4 rounded-md bg-zinc-200"></div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out overflow-auto
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Manajemen Pembayaran</h1>
                <p className="text-sm text-zinc-500">Kelola pembayaran untuk bank sampah dan kolektor</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg border-zinc-200">
              <Wallet className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-zinc-500">Saldo Tersedia</p>
                <p className="font-semibold text-zinc-800">Rp {wasteBankBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex gap-3">
              <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
              <div>
                <h3 className="font-medium text-blue-800">Data Realtime</h3>
                <p className="text-sm text-blue-600">
                  Halaman ini menampilkan data secara realtime. Perubahan pada pengguna, transaksi atau saldo
                  akan segera terlihat tanpa perlu memuat ulang halaman.
                </p>
              </div>
            </div>
          </div>

          {selectedUserId && (
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
              {loading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200 animate-pulse">
                      <div className="w-32 h-4 mb-2 rounded-md bg-zinc-200"></div>
                      <div className="w-24 h-8 rounded-md bg-zinc-200"></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                    <h3 className="text-sm font-medium text-zinc-500">Saldo Saat Ini</h3>
                    <p className="text-2xl font-semibold text-zinc-800">Rp {userStats.balance.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-zinc-500">Jumlah dana yang tersedia di akun pengguna</p>
                  </div>
                  <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                    <h3 className="text-sm font-medium text-zinc-500">Total Pengumpulan</h3>
                    <p className="text-2xl font-semibold text-zinc-800">{userStats.totalCollections}</p>
                    <p className="mt-1 text-xs text-zinc-500">Jumlah pengumpulan sampah yang telah diselesaikan</p>
                  </div>
                  <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                    <h3 className="text-sm font-medium text-zinc-500">Total Nilai</h3>
                    <p className="text-2xl font-semibold text-zinc-800">Rp {userStats.totalValue.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-zinc-500">Nilai total dari semua sampah yang dikumpulkan</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
              <div className="mb-4 space-y-4">
                <div className="relative">
                  <Search className="absolute w-5 h-5 left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-zinc-400" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="all">Semua Pengguna</option>
                    <option value="wastebank_master_collector">Kolektor</option>
                    <option value="wastebank_admin">Bank Sampah</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {loadingUsers ? (
                  <UserListSkeleton />
                ) : (
                  <>
                    {filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user.id)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedUserId === user.id
                            ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-zinc-50 border border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="w-5 h-5 mr-2 text-zinc-500" />
                            <div>
                              <div className="font-medium text-zinc-800">
                                {user.profile?.fullName || 'Pengguna Tanpa Nama'}
                              </div>
                              <div className="text-sm text-zinc-500">{user.email}</div>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            user.role === 'wastebank_master_collector' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role === 'wastebank_master_collector' ? 'Kolektor' : 'Bank Sampah'}
                          </span>
                        </div>
                      </button>
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="py-4 text-center">
                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                        <p className="text-zinc-500">Tidak ada pengguna ditemukan</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6 md:col-span-2">
              {selectedUserId ? (
                <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                  {loading ? (
                    <UserDetailsSkeleton />
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-zinc-800">
                          {users.find(u => u.id === selectedUserId)?.role === 'wastebank_admin'
                            ? 'Pembayaran Bank Sampah' 
                            : 'Gaji Kolektor'}
                        </h2>
                        <button
                          onClick={handlePayment}
                          disabled={loading || !salaryConfig.baseSalary || wasteBankBalance < salaryConfig.baseSalary}
                          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Memproses...' : 'Proses Pembayaran'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-zinc-700">
                            {users.find(u => u.id === selectedUserId)?.role === 'wastebank_admin'
                              ? 'Jumlah Pembayaran'
                              : 'Jumlah Gaji'}
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={salaryConfig.baseSalary}
                              onChange={(e) => setSalaryConfig(prev => ({
                                ...prev,
                                baseSalary: Number(e.target.value)
                              }))}
                              min={0}
                              step={100}
                              className="pl-10 w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            Masukkan jumlah pembayaran yang akan diberikan kepada pengguna ini
                          </p>
                          {wasteBankBalance < salaryConfig.baseSalary && (
                            <p className="mt-2 text-sm text-red-500">
                              Saldo tidak mencukupi untuk memproses pembayaran ini
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed bg-zinc-50 rounded-xl border-zinc-200 text-zinc-500">
                  <UserCheck className="w-12 h-12 mb-3" />
                  <p>Pilih pengguna untuk melihat dan mengonfigurasi detail pembayaran mereka</p>
                </div>
              )}
              
              {selectedUserId && (
                <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-zinc-800">Riwayat Transaksi</h2>
                    <Clock className="w-5 h-5 text-zinc-500" />
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100 max-h-[300px] overflow-y-auto">
                    {loadingTransactions ? (
                      <TransactionSkeleton />
                    ) : transactions.length > 0 ? (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="p-4 border-b border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-zinc-800">
                              {transaction.type === 'salary_payment' 
                                ? 'Pembayaran Gaji' 
                                : transaction.type === 'points_conversion' 
                                  ? 'Konversi Poin' 
                                  : 'Transaksi'}
                            </span>
                            <span className="font-semibold text-emerald-600">
                              Rp {transaction.amount?.toLocaleString() || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500">
                              {transaction.createdAt.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              transaction.status === 'completed' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {transaction.status === 'completed' ? 'Selesai' : 'Tertunda'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center">
                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                        <p className="text-zinc-500">Tidak ada riwayat transaksi ditemukan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}