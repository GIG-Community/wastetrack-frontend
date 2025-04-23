import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, AlertCircle, UserCheck, User, Users, Filter, Wallet, Calculator, Loader2, DollarSign, Clock, ArrowDown } from 'lucide-react';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

export default function SalaryManagement() {
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

  const fetchTransactionHistory = async (userId) => {
    if (!userId) return;
    
    try {
      setLoadingTransactions(true);
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      const sortedTransactions = transactionsData.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      ).slice(0, 10);
      
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchIncomingTransfers = async () => {
    if (!userData?.id) return;
    
    try {
      setLoadingIncomingTransfers(true);
      
      const transfersQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userData.id)
      );
      
      const transfersSnapshot = await getDocs(transfersQuery);
      const transfersData = transfersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      const sortedTransfers = transfersData.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      ).slice(0, 10);
      
      setIncomingTransfers(sortedTransfers);
    } catch (error) {
      console.error('Error fetching incoming transfers:', error);
    } finally {
      setLoadingIncomingTransfers(false);
    }
  };

  const fetchWasteBankBalance = async () => {
    if (!userData?.id) return;
    
    try {
      const wasteBankDoc = await getDoc(doc(db, 'users', userData.id));
      if (wasteBankDoc.exists()) {
        setWasteBankBalance(wasteBankDoc.data().balance || 0);
      }
    } catch (error) {
      console.error('Error fetching waste bank balance:', error);
    }
  };

  useEffect(() => {
    fetchWasteBankBalance();
    fetchIncomingTransfers();
  }, [userData]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData?.id) return;
      
      try {
        setLoadingUsers(true);
        
        const pickupsQuery = query(
          collection(db, 'pickups'),
          where('wasteBankId', '==', userData.id)
        );
        const pickupsSnapshot = await getDocs(pickupsQuery);
        
        const customerIds = [...new Set(
          pickupsSnapshot.docs.map(doc => doc.data().userId)
        )].filter(Boolean);
        
        const collectorQuery = query(
          collection(db, 'users'),
          where('role', '==', 'collector'),
          where('profile.institution', '==', userData.id)
        );
        
        const customerQuery = query(
          collection(db, 'users'),
          where('role', '==', 'customer'),
          where('__name__', 'in', customerIds.length ? customerIds : ['dummy'])
        );
        
        const [collectorSnapshot, customerSnapshot] = await Promise.all([
          getDocs(collectorQuery),
          getDocs(customerQuery)
        ]);
        
        const usersData = [
          ...collectorSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          ...customerSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        ];
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal memuat data pengguna',
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [userData]);

  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      
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

      const pickupsSnapshot = await getDocs(pickupsQuery);
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

      await fetchTransactionHistory(userId);

    } catch (error) {
      console.error('Error fetching user details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat detail pengguna',
      });
    } finally {
      setLoading(false);
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
      console.error('Error saving config:', error);
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

      await Promise.all([fetchUserDetails(selectedUserId), fetchWasteBankBalance(), fetchTransactionHistory(selectedUserId)]);

      setPointsToConvert(0);

      Swal.fire({
        icon: 'success',
        title: 'Sukses',
        text: `Pembayaran sebesar Rp ${paymentAmount.toLocaleString()} berhasil diproses`,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
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
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Wallet className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Manajemen Gaji</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola gaji dan pembayaran untuk petugas pengumpul
                </p>
              </div>
            </div>
            {/* {selectedUserId && !showIncomingTransfers && (
              <button
                onClick={handlePayment}
                className="inline-flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                disabled={loading || !selectedUserId}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                Proses Pembayaran
              </button>
            )} */}
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
              <h3 className="text-sm font-medium text-gray-500">Saldo Bank Sampah</h3>
              <p className="text-2xl font-semibold text-gray-800">Rp {wasteBankBalance.toLocaleString()}</p>
            </div>
            {selectedUserId && !showIncomingTransfers && (
              <>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <h3 className="text-sm font-medium text-gray-500">Saldo Pengguna</h3>
                  {loading ? (
                    <div className="w-24 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">Rp {userStats.balance.toLocaleString()}</p>
                  )}
                </div>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Pengumpulan</h3>
                  {loading ? (
                    <div className="w-16 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">{userStats.totalCollections}</p>
                  )}
                </div>
                <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Nilai</h3>
                  {loading ? (
                    <div className="w-24 h-8 mt-1 rounded-md bg-zinc-200 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">Rp {userStats.totalValue.toLocaleString()}</p>
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
                    <option value="collector">Petugas</option>
                    <option value="customer">Pelanggan</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setShowIncomingTransfers(true);
                    fetchIncomingTransfers();
                  }}
                  className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  <ArrowDown className="w-4 h-4" />
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
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedUserId === user.id && !showIncomingTransfers
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
                            user.role === 'collector' 
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
                        onClick={fetchIncomingTransfers}
                        className="px-3 py-1 text-xs rounded-md text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                        disabled={loadingIncomingTransfers}
                      >
                        {loadingIncomingTransfers ? 'Memuat...' : 'Segarkan'}
                      </button>
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
                              Rp {transfer.amount?.toLocaleString() || 0}
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
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Memproses...' : 'Proses Pembayaran'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {users.find(u => u.id === selectedUserId)?.role === 'customer' ? (
                            <div>
                              <label className="block mb-2 text-sm font-medium text-zinc-700">
                                Poin yang Akan Dikonversi
                              </label>
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
                              <p className="mt-2 text-sm text-zinc-500">
                                Jumlah yang akan diterima: Rp {(pointsToConvert * 100).toLocaleString()}
                              </p>
                              <p className="mt-1 text-xs text-zinc-400">
                                Rate: 1 poin = Rp 100
                              </p>
                            </div>
                          ) : (
                            <div>
                              <label className="block mb-2 text-sm font-medium text-zinc-700">
                                Jumlah Gaji
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