import { useState, useEffect } from 'react';
import { collection, query, where, doc, setDoc, getDoc, runTransaction, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, AlertCircle, UserCheck, User, Users, Filter, Wallet, Calculator, Clock, Info, HelpCircle, ArrowUpRight } from 'lucide-react';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

// Helper component for tooltips
const Tooltip = ({ children, content }) => (
  <div className="relativleke group">
    {children}
    <div className="absolute z-50 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all duration-200 transform -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {content}
      <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800"></div>
    </div>
  </div>
);

// Information card component
const InfoCard = ({ title, children, icon: Icon }) => (
  <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-blue-500 flex-shrink-0">
        {Icon ? <Icon size={20} /> : <Info size={20} />}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium text-blue-800">{title}</h3>
        <div className="text-sm text-blue-700">
          {children}
        </div>
      </div>
    </div>
  </div>
);

export default function IndustrySalary() {
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
  const [wasteBankMasters, setWasteBankMasters] = useState([]);
  const [loadingWasteBankMasters, setLoadingWasteBankMasters] = useState(false);
  const [selectedWasteBankMaster, setSelectedWasteBankMaster] = useState(null);
  const [transferAmount, setTransferAmount] = useState(0);

  useEffect(() => {
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [unsubscribes]);

  const fetchTransactionHistory = async (wasteBankId) => {
    if (!wasteBankId || !userData?.id) return;
    
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
        where('wasteBankId', '==', wasteBankId),
        where('userId', '==', userData.id)
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
    
    if (userData?.role === 'industry') {
      fetchAllWasteBankMasters();
    }
  }, [userData]);

  const fetchAllWasteBankMasters = async () => {
    if (!userData?.id) return;
    
    try {
      setLoadingWasteBankMasters(true);
      
      const currentUnsubscribes = [...unsubscribes];
      const wasteBankMastersUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'wasteBankMasters');
      
      if (wasteBankMastersUnsubscribeIndex !== -1 && typeof currentUnsubscribes[wasteBankMastersUnsubscribeIndex].fn === 'function') {
        currentUnsubscribes[wasteBankMastersUnsubscribeIndex].fn();
        currentUnsubscribes.splice(wasteBankMastersUnsubscribeIndex, 1);
      }
      
      const wasteBankMastersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'wastebank_master')
      );
      
      const unsubscribe = onSnapshot(
        wasteBankMastersQuery,
        (snapshot) => {
          const mastersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            balance: doc.data().balance || 0
          }));
          
          setWasteBankMasters(mastersData);
          setLoadingWasteBankMasters(false);
        },
        (error) => {
          console.error('Error memantau pengguna bank sampah:', error);
          setLoadingWasteBankMasters(false);
        }
      );
      
      setUnsubscribes([...currentUnsubscribes, { name: 'wasteBankMasters', fn: unsubscribe }]);
      
    } catch (error) {
      console.error('Error memuat data bank sampah:', error);
      setLoadingWasteBankMasters(false);
    }
  };

  const handleSelectWasteBankMaster = (wasteBankMaster) => {
    const currentUnsubscribes = [...unsubscribes];
    const selectedWasteBankUnsubscribeIndex = currentUnsubscribes.findIndex(u => u.name === 'selectedWasteBank');
    if (selectedWasteBankUnsubscribeIndex !== -1 && typeof currentUnsubscribes[selectedWasteBankUnsubscribeIndex].fn === 'function') {
      currentUnsubscribes[selectedWasteBankUnsubscribeIndex].fn();
      currentUnsubscribes.splice(selectedWasteBankUnsubscribeIndex, 1);
    }
    
    setSelectedWasteBankMaster(wasteBankMaster);
    setTransferAmount(0);
    setupWasteBankBalanceListener(wasteBankMaster.id);
    fetchTransactionHistory(wasteBankMaster.id);
  };
  
  const setupWasteBankBalanceListener = (wasteBankId) => {
    if (!wasteBankId) return;
    
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'users', wasteBankId),
        (snapshot) => {
          if (snapshot.exists()) {
            setSelectedWasteBankMaster(prevState => ({
              ...prevState,
              balance: snapshot.data().balance || 0,
              ...snapshot.data()
            }));
          }
        },
        (error) => {
          console.error('Error memantau saldo bank sampah terpilih:', error);
        }
      );
      
      setUnsubscribes(prev => {
        const filtered = prev.filter(u => u.name !== 'selectedWasteBank');
        return [...filtered, { name: 'selectedWasteBank', fn: unsubscribe }];
      });
      
    } catch (error) {
      console.error('Error menyiapkan pemantauan saldo bank sampah:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedWasteBankMaster || !userData?.id) return;

    try {
      setLoading(true);
      
      if (transferAmount <= 0) {
        throw new Error('Jumlah transfer tidak valid');
      }

      if (userData.balance < transferAmount) {
        throw new Error('Saldo industri tidak mencukupi untuk transfer ini');
      }

      await runTransaction(db, async (transaction) => {
        const industryRef = doc(db, 'users', userData.id);
        const wasteBankRef = doc(db, 'users', selectedWasteBankMaster.id);
        
        const industryDoc = await transaction.get(industryRef);
        const wasteBankDoc = await transaction.get(wasteBankRef);
        
        const currentIndustryBalance = industryDoc.data().balance || 0;
        const currentWasteBankBalance = wasteBankDoc.data().balance || 0;
        
        if (currentIndustryBalance < transferAmount) {
          throw new Error('Saldo industri tidak mencukupi');
        }
        
        transaction.update(industryRef, {
          balance: currentIndustryBalance - transferAmount,
          updatedAt: new Date()
        });
        
        transaction.update(wasteBankRef, {
          balance: currentWasteBankBalance + transferAmount,
          updatedAt: new Date()
        });
        
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: userData.id,
          wasteBankId: selectedWasteBankMaster.id,
          amount: transferAmount,
          type: 'industry_transfer',
          notes: 'Transfer dari industri',
          createdAt: new Date(),
          status: 'completed'
        });
      });

      setTransferAmount(0);

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Transfer sebesar Rp ${transferAmount.toLocaleString()} telah berhasil diproses`,
      });
    } catch (error) {
      console.error('Error memproses transfer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan',
        text: error.message || 'Gagal memproses transfer',
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
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">
                  {userData?.role === 'industry' ? 'Manajemen Transfer' : 'Manajemen Pembayaran'}
                </h1>
                <p className="text-sm text-zinc-500">
                  {userData?.role === 'industry' 
                    ? 'Kelola transfer dana ke bank sampah'
                    : 'Kelola pembayaran untuk bank sampah dan kolektor'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg border-zinc-200">
              <Wallet className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-zinc-500">Saldo Tersedia</p>
                <p className="font-semibold text-zinc-800">
                  Rp {userData?.role === 'industry' ? (userData.balance || 0).toLocaleString() : wasteBankBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <InfoCard title="Tentang Manajemen Transfer" icon={Info}>
            <p>
              Halaman ini memungkinkan Anda melakukan transfer dana ke bank sampah. 
              Data ditampilkan secara real-time dan akan diperbarui otomatis saat ada perubahan.
              Pilih bank sampah dari daftar untuk melihat informasi rinci dan melakukan transfer.
            </p>
          </InfoCard>

          {userData?.role === 'industry' ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                <h2 className="mb-4 text-xl font-semibold text-zinc-800">Semua Bank Sampah</h2>
                
                <div className="relative mb-4">
                  <Search className="absolute w-5 h-5 left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari bank sampah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loadingWasteBankMasters ? (
                    <UserListSkeleton />
                  ) : (
                    <>
                      {wasteBankMasters
                        .filter(master => 
                          master.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          master.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          master.profile?.address?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(wasteBankMaster => (
                        <button
                          key={wasteBankMaster.id}
                          onClick={() => handleSelectWasteBankMaster(wasteBankMaster)}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            selectedWasteBankMaster?.id === wasteBankMaster.id
                              ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                              : 'bg-white hover:bg-zinc-50 border border-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <div className="font-medium text-zinc-800">
                                {wasteBankMaster.profile?.fullName || 'Bank Sampah'}
                              </div>
                              <div className="text-sm text-zinc-500">
                                {wasteBankMaster.email}
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                              Bank Sampah
                            </span>
                          </div>
                        </button>
                      ))}

                      {wasteBankMasters.length === 0 && (
                        <div className="py-4 text-center">
                          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                          <p className="text-zinc-500">Tidak ada bank sampah ditemukan</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6 md:col-span-2">
                {selectedWasteBankMaster ? (
                  <>
                    <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-zinc-800">
                          Transfer Dana
                        </h2>
                        <button
                          onClick={handleTransfer}
                          disabled={loading || transferAmount <= 0 || userData.balance < transferAmount}
                          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Memproses...' : 'Transfer Sekarang'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="p-4 border rounded-lg border-zinc-200">
                          <h3 className="mb-3 text-lg font-medium text-zinc-800">Informasi Bank Sampah</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-zinc-500">Nama</p>
                              <p className="font-medium text-zinc-800">{selectedWasteBankMaster.profile?.fullName || 'Bank Sampah'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-500">Email</p>
                              <p className="font-medium text-zinc-800">{selectedWasteBankMaster.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-500">Telepon</p>
                              <p className="font-medium text-zinc-800">{selectedWasteBankMaster.profile?.phone || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-500">Alamat</p>
                              <p className="font-medium text-zinc-800">{selectedWasteBankMaster.profile?.address || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-500">Saldo Bank Sampah</p>
                              <p className="font-medium text-zinc-800">
                                Rp {(selectedWasteBankMaster?.balance || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium text-zinc-700">
                              Jumlah Transfer
                            </label>
                            <Tooltip content="Masukkan jumlah dana yang akan ditransfer ke bank sampah">
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </Tooltip>
                          </div>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(Number(e.target.value))}
                              min={0}
                              step={1000}
                              className="pl-10 w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                          {userData.balance < transferAmount && (
                            <p className="mt-2 text-sm text-red-500">
                              Saldo tidak mencukupi untuk memproses transfer ini
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

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
                                  {transaction.type === 'industry_payment' 
                                    ? 'Pembayaran Layanan' 
                                    : transaction.type === 'industry_transfer' 
                                      ? 'Transfer Dana' 
                                      : transaction.type === 'salary_payment' 
                                        ? 'Pembayaran Gaji' 
                                        : transaction.type === 'points_conversion' 
                                          ? 'Konversi Poin' 
                                          : 'Transaksi'}
                                </span>
                                <span className="font-semibold text-emerald-600">
                                  Rp {(transaction.amount || 0).toLocaleString()}
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
                              {transaction.notes && (
                                <div className="mt-1 text-xs text-zinc-500">
                                  Catatan: {transaction.notes}
                                </div>
                              )}
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
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed bg-zinc-50 rounded-xl border-zinc-200 text-zinc-500">
                    <UserCheck className="w-12 h-12 mb-3" />
                    <p>Pilih bank sampah untuk melihat detail dan melakukan transfer</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {selectedUserId && (
                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
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
                              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700`}>
                                Bank Sampah
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
                              Pembayaran Bank Sampah
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
                                Jumlah Pembayaran
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
                                  Rp {(transaction.amount || 0).toLocaleString()}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}