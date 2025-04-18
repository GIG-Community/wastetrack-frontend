import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, AlertCircle, UserCheck, User, Users, Filter, Wallet, Calculator } from 'lucide-react';
import Swal from 'sweetalert2';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';

export default function MasterSalaryManagement() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
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

  // Fetch waste bank balance
  useEffect(() => {
    fetchWasteBankBalance();
  }, [userData]);

  // Fetch all users (collectors and customers)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData?.id) return;
      
      try {
        setLoading(true);
        
        // First get all pickups associated with this waste bank
        const pickupsQuery = query(
          collection(db, 'masterBankRequests'),
          where('masterBankId', '==', userData.id)
        );
        const pickupsSnapshot = await getDocs(pickupsQuery);
        
        // Get unique customer IDs from pickups
        const customerIds = [...new Set(
          pickupsSnapshot.docs.map(doc => doc.data().userId)
        )].filter(Boolean); // Remove any undefined/null values
        
        // Separate queries for collectors and customers
        const collectorQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_master_collector'),
          where('profile.institution', '==', userData.id)
        );
        const wasteBankQuery = query(
          collection(db, 'users'),
          where('role', '==', 'wastebank_admin'),
        );
        
        const customerQuery = query(
          collection(db, 'users'),
          where('role', '==', 'customer'),
          where('__name__', 'in', customerIds.length ? customerIds : ['dummy']) // Prevent empty 'in' query
        );
        
        const [collectorSnapshot, customerSnapshot] = await Promise.all([
          getDocs(collectorQuery),
          getDocs(wasteBankQuery),
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
          text: 'Failed to load users data',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userData]);

  // Fetch user details with points/balance
  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Reset points to convert
      setPointsToConvert(0);
      
      // Set salary config for collectors only
      if (userData.role === 'collector') {
        const salaryDoc = await getDoc(doc(db, 'salaries', userId));
        setSalaryConfig({
          baseSalary: salaryDoc.exists() ? salaryDoc.data().config.baseSalary : 0,
        });
      }

      // Simplified query to avoid composite index requirement
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
        // Only count completed pickups
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

    } catch (error) {
      console.error('Error fetching user details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load user details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);
    await fetchUserDetails(userId);
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
        title: 'Success',
        text: 'Configuration saved successfully',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save configuration',
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
      
      // Calculate payment amount
      let paymentAmount = 0;
      
      if (isCustomer) {
        const pointsRequested = Number(pointsToConvert);
        if (pointsRequested <= 0 || pointsRequested > userStats.points) {
          throw new Error('Invalid points amount');
        }
        paymentAmount = pointsRequested * 100;
      } else {
        paymentAmount = salaryConfig.baseSalary;
      }
      
      if (paymentAmount <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (wasteBankBalance < paymentAmount) {
        throw new Error('Insufficient waste bank balance');
      }

      // Perform transaction
      await runTransaction(db, async (transaction) => {
        const wasteBankRef = doc(db, 'users', userData.id);
        const userRef = doc(db, 'users', selectedUserId);
        
        const wasteBankDoc = await transaction.get(wasteBankRef);
        const currentBalance = wasteBankDoc.data().balance || 0;
        
        if (currentBalance < paymentAmount) {
          throw new Error('Insufficient waste bank balance');
        }
        
        // Update waste bank balance
        transaction.update(wasteBankRef, {
          balance: currentBalance - paymentAmount,
          updatedAt: new Date()
        });
        
        // Update user data
        if (isCustomer) {
          // For customers, only deduct the converted points
          transaction.update(userRef, {
            balance: (selectedUser.balance || 0) + paymentAmount,
            'rewards.points': userStats.points - pointsToConvert,
            updatedAt: new Date()
          });
        } else {
          transaction.update(userRef, {
            balance: (selectedUser.balance || 0) + paymentAmount,
            // earnings: (selectedUser.earnings || 0) + paymentAmount,
            updatedAt: new Date()
          });
        }
        
        // Record transaction
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

      // Refresh data
      await Promise.all([
        fetchUserDetails(selectedUserId),
        fetchWasteBankBalance()
      ]);

      setPointsToConvert(0); // Reset points input

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Payment of Rp ${paymentAmount.toLocaleString()} has been processed successfully`,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process payment',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch = 
      user.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile?.phone?.includes(searchTerm);
    
    return matchesRole && matchesSearch;
  });

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
          {/* Header with Waste Bank Balance */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Payment Management</h1>
                <p className="text-sm text-zinc-500">Manage payments for waste banks and collectors</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg border-zinc-200">
              <Wallet className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-zinc-500">Available Balance</p>
                <p className="font-semibold text-zinc-800">Rp {wasteBankBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Stats for selected user */}
          {selectedUserId && (
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
              <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                <h3 className="text-sm font-medium text-zinc-500">Current Balance</h3>
                <p className="text-2xl font-semibold text-zinc-800">Rp {userStats.balance.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                <h3 className="text-sm font-medium text-zinc-500">Total Collections</h3>
                <p className="text-2xl font-semibold text-zinc-800">{userStats.totalCollections}</p>
              </div>
              <div className="p-4 bg-white border shadow-sm rounded-xl border-zinc-200">
                <h3 className="text-sm font-medium text-zinc-500">Total Value</h3>
                <p className="text-2xl font-semibold text-zinc-800">Rp {userStats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Users List */}
            <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
              <div className="mb-4 space-y-4">
                <div className="relative">
                  <Search className="absolute w-5 h-5 left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
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
                    <option value="all">All Users</option>
                    <option value="wastebank_master_collector">Collectors</option>
                    <option value="wastebank_admin">Waste Banks</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                            {user.profile?.fullName || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.role === 'wastebank_master_collector' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'wastebank_master_collector' ? 'Collector' : 'Waste Bank'}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="py-4 text-center">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 text-zinc-400" />
                    <p className="text-zinc-500">No users found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Section */}
            <div className="md:col-span-2">
              {selectedUserId ? (
                <div className="p-6 bg-white border shadow-sm rounded-xl border-zinc-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-zinc-800">
                      {users.find(u => u.id === selectedUserId)?.role === 'wastebank_admin'
                        ? 'Waste Bank Payment' 
                        : 'Collector Salary'}
                    </h2>
                    <button
                      onClick={handlePayment}
                      disabled={loading || !salaryConfig.baseSalary || wasteBankBalance < salaryConfig.baseSalary}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-zinc-700">
                        {users.find(u => u.id === selectedUserId)?.role === 'wastebank_admin'
                          ? 'Payment Amount'
                          : 'Salary Amount'}
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
                      {wasteBankBalance < salaryConfig.baseSalary && (
                        <p className="mt-2 text-sm text-red-500">
                          Insufficient balance to process this payment
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed bg-zinc-50 rounded-xl border-zinc-200 text-zinc-500">
                  <UserCheck className="w-12 h-12 mb-3" />
                  <p>Select a user to view and configure their payment details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}