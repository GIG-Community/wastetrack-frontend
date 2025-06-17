import { useState, useEffect } from 'react';
import { collection, query, where, doc, setDoc, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, AlertCircle, UserCheck, User, Users, Filter, Wallet, Calculator, Loader2, DollarSign, Clock, ArrowDown, Info, HelpCircle, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { useSmoothScroll } from '../../../hooks/useSmoothScroll';

// Helper component for tooltips
const Tooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute z-50 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

// Information panel component - modified with collapsible behavior
const InfoPanel = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="text-left p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <h3 className="mb-1 font-medium text-blue-800">{title}</h3>
            <ChevronRight className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
          {isExpanded && (
            <div className="text-sm text-blue-700">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SalaryManagement() {
  // Scroll ke atas saat halaman dimuat
  useSmoothScroll({
    enabled: true,
    top: 0,
    scrollOnMount: true
  });
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingIncomingTransfers, setLoadingIncomingTransfers] = useState(false);
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
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [showIncomingTransfers, setShowIncomingTransfers] = useState(false);

  const fetchTransactionHistory = (userId) => {
    if (!userId) return;

    setLoadingTransactions(true);

    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );

      // Using onSnapshot instead of getDocs
      const unsubscribe = onSnapshot(transactionsQuery,
        (transactionsSnapshot) => {
          const transactionsData = transactionsSnapshot.docs.map(doc => ({
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

      return unsubscribe;
    } catch (error) {
      console.error('Error saat menyiapkan listener riwayat transaksi:', error);
      setLoadingTransactions(false);
      return () => { };
    }
  };

  const fetchIncomingTransfers = () => {
    if (!userData?.id) return;

    setLoadingIncomingTransfers(true);

    try {
      const transfersQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userData.id)
      );

      // Using onSnapshot instead of getDocs
      const unsubscribe = onSnapshot(transfersQuery,
        (transfersSnapshot) => {
          const transfersData = transfersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));

          const sortedTransfers = transfersData.sort((a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime()
          ).slice(0, 10);

          setIncomingTransfers(sortedTransfers);
          setLoadingIncomingTransfers(false);
        },
        (error) => {
          console.error('Error memantau transfer masuk:', error);
          setLoadingIncomingTransfers(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error saat menyiapkan listener transfer masuk:', error);
      setLoadingIncomingTransfers(false);
      return () => { };
    }
  };

  const fetchWasteBankBalance = () => {
    if (!userData?.id) return () => { };

    try {
      // Using onSnapshot for real-time balance updates
      const unsubscribe = onSnapshot(doc(db, 'users', userData.id),
        (wasteBankDoc) => {
          if (wasteBankDoc.exists()) {
            setWasteBankBalance(wasteBankDoc.data().balance || 0);
          }
        },
        (error) => {
          console.error('Error memantau saldo bank sampah:', error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error saat menyiapkan listener saldo bank sampah:', error);
      return () => { };
    }
  };

  useEffect(() => {
    let balanceUnsubscribe = () => { };
    let transfersUnsubscribe = () => { };

    if (userData?.id) {
      balanceUnsubscribe = fetchWasteBankBalance();
      transfersUnsubscribe = fetchIncomingTransfers();
    }

    // Cleanup function
    return () => {
      if (typeof balanceUnsubscribe === 'function') balanceUnsubscribe();
      if (typeof transfersUnsubscribe === 'function') transfersUnsubscribe();
    };
  }, [userData]);

  useEffect(() => {
    let usersUnsubscribe;

    const fetchUsers = () => {
      if (!userData?.id) return;

      try {
        setLoadingUsers(true);

        // First, get all pickups for this waste bank
        const pickupsQuery = query(
          collection(db, 'pickups'),
          where('wasteBankId', '==', userData.id)
        );

        // Using onSnapshot for pickups
        const pickupsUnsubscribe = onSnapshot(pickupsQuery, async (pickupsSnapshot) => {
          const customerIds = [...new Set(
            pickupsSnapshot.docs
              .map(doc => doc.data().userId)
              .filter(Boolean)
          )];

          // Only proceed if we have customer IDs or to get collectors
          const collectorQuery = query(
            collection(db, 'users'),
            where('role', '==', 'collector'),
            where('profile.institution', '==', userData.id)
          );

          // Using onSnapshot for collectors
          const collectorUnsubscribe = onSnapshot(collectorQuery, (collectorSnapshot) => {
            const collectorData = collectorSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // If we have customer IDs, fetch those users too
            if (customerIds.length > 0) {
              const customerQuery = query(
                collection(db, 'users'),
                where('role', '==', 'customer'),
                where('__name__', 'in', customerIds)
              );

              // Using onSnapshot for customers
              const customerUnsubscribe = onSnapshot(customerQuery, (customerSnapshot) => {
                const customerData = customerSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));

                // Combine both datasets
                setUsers([...collectorData, ...customerData]);
                setLoadingUsers(false);
              }, (error) => {
                console.error('Error memantau data pelanggan:', error);
                // Still show collectors even if there's an error with customers
                setUsers(collectorData);
                setLoadingUsers(false);
              });

              return () => customerUnsubscribe();
            } else {
              // Just use collectors if no customers
              setUsers(collectorData);
              setLoadingUsers(false);
            }
          }, (error) => {
            console.error('Error memantau data petugas:', error);
            setLoadingUsers(false);
          });

          return () => collectorUnsubscribe();
        }, (error) => {
          console.error('Error memantau data pengambilan:', error);
          setLoadingUsers(false);
        });

        return () => pickupsUnsubscribe();
      } catch (error) {
        console.error('Error saat menyiapkan listener pengguna:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal memuat data pengguna',
        });
        setLoadingUsers(false);
        return () => { };
      }
    };

    usersUnsubscribe = fetchUsers();

    return () => {
      if (usersUnsubscribe) usersUnsubscribe();
    };
  }, [userData]);

  const fetchUserDetails = async (userId) => {
    if (!userId) return;

    try {
      setLoading(true);

      let userUnsubscribe;
      let transactionUnsubscribe;

      // Using onSnapshot for user details
      userUnsubscribe = onSnapshot(doc(db, 'users', userId), async (userDoc) => {
        if (!userDoc.exists()) {
          throw new Error('Pengguna tidak ditemukan');
        }

        const userData = userDoc.data();

        setPointsToConvert(0);

        if (userData.role === 'collector') {
          const salaryDoc = await getDoc(doc(db, 'salaries', userId));
          setSalaryConfig({
            baseSalary: salaryDoc.exists() ? salaryDoc.data().config.baseSalary : 0,
          });
        }

        const pickupsQuery = query(
          collection(db, 'pickups'),
          where(userData.role === 'collector' ? 'collectorId' : 'userId', '==', userId)
        );

        // Using onSnapshot for user's pickups
        const pickupsUnsubscribe = onSnapshot(pickupsQuery, (pickupsSnapshot) => {
          let totalCollections = 0;
          let totalWasteCollected = 0;
          let totalValue = 0;

          pickupsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'completed') {
              totalCollections++;
              totalValue += data.totalValue || 0;

              if (data.wasteQuantities) {
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
        }, (error) => {
          console.error('Error memantau data pengambilan pengguna:', error);
          setLoading(false);
        });

        // Fetch transaction history
        transactionUnsubscribe = fetchTransactionHistory(userId);

        return () => {
          pickupsUnsubscribe();
          if (transactionUnsubscribe) transactionUnsubscribe();
        };
      }, (error) => {
        console.error('Error memantau detail pengguna:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal memuat detail pengguna',
        });
        setLoading(false);
      });

      // Return the cleanup function
      return () => {
        if (userUnsubscribe) userUnsubscribe();
        if (transactionUnsubscribe) transactionUnsubscribe();
      };
    } catch (error) {
      console.error('Error saat menyiapkan listener detail pengguna:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat detail pengguna',
      });
      setLoading(false);
      return () => { };
    }
  };

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);
    await fetchUserDetails(userId);
    setShowIncomingTransfers(false);  // Reset to show user transactions when selecting a user
  };

  const handleSaveSalaryConfig = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      await setDoc(doc(db, 'salaries', selectedUserId), {
        config: salaryConfig,
        wasteBankId: userData.id,
        userId: selectedUserId,
        lastUpdated: new Date(),
      });

      Swal.fire({
        icon: 'success',
        title: 'Sukses',
        text: 'Konfigurasi berhasil disimpan',
      });
    } catch (error) {
      console.error('Error menyimpan konfigurasi:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal menyimpan konfigurasi',
      });
    } finally {
      setLoading(false);
    }
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
            earnings: (selectedUser.earnings || 0) + paymentAmount,
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

      // Thanks to onSnapshot, we don't need to manually refresh data
      setPointsToConvert(0);

      Swal.fire({
        icon: 'success',
        title: 'Sukses',
        text: `Pembayaran sebesar Rp ${paymentAmount.toLocaleString('id-ID')} berhasil diproses`,
      });
    } catch (error) {
      console.error('Error memproses pembayaran:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
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
      user.profile?.phone?.includes(searchTerm);

    return matchesRole && matchesSearch;
  });

  const UserListSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="w-full p-3 mb-2 border rounded-lg border-zinc-200 animate-pulse">
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

  const TransactionSkeleton = () => (
    <>
      {[1, 2, 3].map((item) => (
        <div key={item} className="p-4 border-b border-zinc-100 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-40 h-5 rounded-md bg-zinc-200"></div>
            <div className="w-24 h-5 rounded-md bg-zinc-200"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="w-32 h-4 rounded-md bg-zinc-200"></div>
            <div className="w-16 h-4 rounded-md bg-zinc-200"></div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-6">
          <div className="flex text-left items-center gap-4 mb-8">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Manajemen Gaji</h1>
              <p className="mt-1 text-sm text-gray-500">
                Kelola gaji dan pembayaran untuk petugas pengumpul
              </p>
            </div>
          </div>

          {/* Information Card */}
          <InfoPanel title="Informasi" icon={Info}>
            <p>
              Halaman ini digunakan untuk mengelola gaji petugas dan poin pelanggan, dengan data real-time. Pilih pengguna untuk melihat detail dan memproses pembayaran.
            </p>
          </InfoPanel>

          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Saldo Bank Sampah</h3>
                <Tooltip content="Saldo yang tersedia di rekening bank sampah Anda untuk membayar gaji petugas dan konversi poin">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </Tooltip>
              </div>
              <p className="text-2xl font-semibold text-gray-800">Rp {wasteBankBalance.toLocaleString('id-ID')}</p>
            </div>
            {selectedUserId && !showIncomingTransfers && (
              <>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Saldo Pengguna</h3>
                    <Tooltip content="Jumlah uang yang dimiliki pengguna saat ini">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Tooltip>
                  </div>
                  {loading ? (
                    <div className="w-24 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">Rp {userStats.balance.toLocaleString('id-ID')}</p>
                  )}
                </div>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Total Pengumpulan</h3>
                    <Tooltip content="Jumlah pengumpulan sampah yang telah diselesaikan oleh pengguna ini">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Tooltip>
                  </div>
                  {loading ? (
                    <div className="w-16 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">{userStats.totalCollections}</p>
                  )}
                </div>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Total Nilai</h3>
                    <Tooltip content="Nilai total dari semua sampah yang telah dikumpulkan oleh pengguna ini">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Tooltip>
                  </div>
                  {loading ? (
                    <div className="w-24 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">Rp {userStats.totalValue.toLocaleString('id-ID')}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Users List */}
            <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
              <div className="mb-4 space-y-4">
                <div className="relative">
                  <Search className="absolute w-5 h-5 left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm">Pengguna:</p>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 text-sm px-3 py-3 border rounded-lg bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="all">Semua</option>
                    <option value="collector">Petugas</option>
                    <option value="customer">Pelanggan</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setShowIncomingTransfers(true);
                    fetchIncomingTransfers();
                  }}
                  className="flex items-center font-medium justify-center w-full gap-2 px-4 py-3 text-sm text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  <ArrowDown className="w-5 h-5" />
                  <span>Lihat Transfer Masuk</span>
                </button>
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
                        className={`w-full p-4 rounded-lg text-left transition-all ${selectedUserId === user.id && !showIncomingTransfers
                          ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                          : 'bg-white hover:bg-zinc-50 border border-zinc-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="w-5 h-5 mr-2 text-zinc-500" />
                            <div>
                              <div className="text-sm font-medium text-zinc-800">
                                {user.profile?.fullName || 'Pengguna Tanpa Nama'}
                              </div>
                              <div className="text-xs text-zinc-500">{user.email}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-medium px-2 rounded-full ${user.role === 'collector'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                            }`}>
                            {user.role === 'collector' ? 'Petugas' : 'Pelanggan'}
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

            {/* User Details and Transactions / Incoming Transfers */}
            <div className="space-y-6 md:col-span-2">
              {showIncomingTransfers ? (
                /* Incoming Transfers Section */
                <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-5 h-5 text-emerald-500" />
                      <h2 className="text-xl font-semibold text-zinc-800">Transfer Masuk</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowIncomingTransfers(false)}
                        className="px-3 py-1 text-xs rounded-md text-zinc-600 bg-zinc-50 hover:bg-zinc-100"
                      >
                        Kembali
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100 max-h-[450px] overflow-y-auto">
                    {loadingIncomingTransfers ? (
                      <TransactionSkeleton />
                    ) : incomingTransfers.length > 0 ? (
                      incomingTransfers.map((transfer) => (
                        <div key={transfer.id} className="p-4 border-b border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <span className="font-medium text-zinc-800">
                                Transfer dari Bank Sampah Induk
                              </span>
                            </div>
                            <span className="font-semibold text-emerald-600">
                              Rp {transfer.amount?.toLocaleString('id-ID') || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500">
                              {transfer.createdAt.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              {transfer.status || 'Selesai'}
                            </span>
                          </div>
                          {transfer.wasteBankId && (
                            <div className="mt-1 text-xs text-zinc-500">
                              ID Pengirim: {transfer.wasteBankId.substring(0, 8)}
                            </div>
                          )}
                          {transfer.notes && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Catatan: {transfer.notes}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center">
                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                        <p className="text-zinc-500">Tidak ada riwayat transfer masuk</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedUserId ? (
                /* User Details Section */
                <>
                  {/* Payment Configuration */}
                  <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                    {loading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="flex justify-between">
                          <div className="w-40 h-8 rounded-md bg-zinc-200"></div>
                          <div className="w-32 h-10 rounded-md bg-zinc-200"></div>
                        </div>
                        <div className="w-full h-0.5 bg-zinc-100 my-6"></div>
                        <div className="space-y-4">
                          <div className="w-32 h-5 rounded-md bg-zinc-200"></div>
                          <div className="w-full h-12 rounded-md bg-zinc-200"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-semibold text-zinc-800">
                            {users.find(u => u.id === selectedUserId)?.role === 'customer'
                              ? 'Konversi Poin'
                              : 'Pembayaran Gaji'}
                          </h2>
                          <button
                            onClick={handlePayment}
                            disabled={loading ||
                              (users.find(u => u.id === selectedUserId)?.role === 'customer' &&
                                (pointsToConvert <= 0 || pointsToConvert > userStats.points)) ||
                              (users.find(u => u.id === selectedUserId)?.role === 'collector' &&
                                !salaryConfig.baseSalary)
                            }
                            className="px-6 py-3 bg-emerald-600 text-sm text-white rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Memproses...' : 'Proses Pembayaran'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {users.find(u => u.id === selectedUserId)?.role === 'customer' ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-medium text-zinc-700">
                                  Poin yang Akan Dikonversi
                                </label>
                                <Tooltip content="Jumlah poin yang akan dikonversi menjadi saldo. Rate konversi: 1 poin = Rp 100">
                                  <HelpCircle className="w-4 h-4 text-gray-400" />
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                  <Calculator className="w-5 h-5 text-zinc-400" />
                                </div>
                                <input
                                  type="number"
                                  value={pointsToConvert}
                                  onChange={(e) => setPointsToConvert(Number(e.target.value))}
                                  max={userStats.points}
                                  min={0}
                                  className="pl-10 w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                              </div>
                              <div className="p-3 mt-3 border border-blue-100 rounded-lg bg-blue-50">
                                <div className="flex justify-between">
                                  <p className="text-sm text-blue-700">
                                    Poin tersedia:
                                  </p>
                                  <p className="font-medium text-blue-700">
                                    {userStats.points} poin
                                  </p>
                                </div>
                                <div className="flex justify-between mt-2">
                                  <p className="text-sm text-blue-700">
                                    Jumlah yang akan diterima:
                                  </p>
                                  <p className="font-medium text-blue-700">
                                    Rp {(pointsToConvert * 100).toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="flex justify-between mt-2">
                                  <p className="text-xs text-blue-600">
                                    Rate konversi:
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    1 poin = Rp 100
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-medium text-zinc-700">
                                  Jumlah Gaji
                                </label>
                                <Tooltip content="Masukkan jumlah gaji yang akan dibayarkan kepada petugas">
                                  <HelpCircle className="w-4 h-4 text-gray-400" />
                                </Tooltip>
                              </div>
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
                                  step={1000}
                                  className="text-sm pl-10 w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                              </div>
                              <button
                                onClick={handleSaveSalaryConfig}
                                className="w-full px-4 py-3 mt-3 text-sm transition-colors border rounded-lg text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200"
                              >
                                Simpan Konfigurasi Gaji
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Transaction History */}
                  <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-zinc-500" />
                        <h2 className="text-xl font-semibold text-zinc-800">Riwayat Transaksi Pengguna</h2>
                      </div>
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
                                Rp {transaction.amount?.toLocaleString('id-ID') || 0}
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
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${transaction.status === 'completed'
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
                          <p className="text-zinc-500">Tidak ada riwayat transaksi</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed bg-zinc-50 rounded-xl border-zinc-200 text-zinc-500">
                  <UserCheck className="w-12 h-12 mb-3" />
                  <p>Pilih pengguna untuk melihat dan mengatur detail pembayaran mereka</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}