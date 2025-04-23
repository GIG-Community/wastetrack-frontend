// src/pages/dashboard/customer/History.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  Filter,
  SortAsc,
  Package,
  CalendarDays,
  MapPin,
  Box,
  AlertCircle,
  ChevronDown,
  ChevronsUpDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { calculatePoints, calculateTotalValue } from '../../../lib/constants';

const History = () => {
  const { currentUser, userData } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const toggleCard = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Fetch both pickups and transactions data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Fetch pickups data
        const pickupsRef = collection(db, 'pickups');
        const pickupsQuery = query(
          pickupsRef,
          where('userId', '==', currentUser.uid)
        );

        const pickupsSnapshot = await getDocs(pickupsQuery);
        let pickupData = pickupsSnapshot.docs.map(doc => {
          const data = doc.data();
          const totalValue = data.wastes ? calculateTotalValue(data.wastes) : 0;
          return {
            id: doc.id,
            ...data,
            totalValue,
            pointsAmount: calculatePoints(totalValue),
            itemType: 'pickup' // Add type for filtering
          };
        });

        // Fetch transactions data - points conversion
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(
          transactionsRef,
          where('userId', '==', currentUser.uid),
          where('type', '==', 'points_conversion')
        );

        const transactionsSnapshot = await getDocs(transactionsQuery);
        let transactionData = transactionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            itemType: 'transaction' // Add type for filtering
          };
        });

        // Set both states
        setPickups(pickupData);
        setTransactions(transactionData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Combine and sort both pickups and transactions
  const combinedData = [...pickups, ...transactions].sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.date?.seconds || 0;
    const bTime = b.createdAt?.seconds || b.date?.seconds || 0;
    if (sortOrder === 'desc') {
      return bTime - aTime;
    }
    return aTime - bTime;
  });

  const filteredData = combinedData.filter(item => {
    // Filter by item type if needed
    const matchesType = filterType === 'all' || item.itemType === filterType;
    
    // Filter by status
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    // Filter by search term
    let matchesSearch = true;
    if (searchTerm && item.itemType === 'pickup') {
      matchesSearch = 
        (item.location?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (item.wasteTypes?.some(type => type.toLowerCase().includes(searchTerm.toLowerCase())) || false);
    } else if (searchTerm && item.itemType === 'transaction') {
      matchesSearch = 
        (item.wasteBankId?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    }
    
    return matchesType && matchesStatus && matchesSearch;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of the list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 sm:py-6">
      {/* Hero Section - New Design */}
      <div className="mb-6 sm:mb-8">
        <div className="overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 rounded-3xl">
          <div className="relative px-6 py-8 sm:px-8 sm:py-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute w-40 h-40 rounded-full -right-10 -top-10 bg-white/20"></div>
              <div className="absolute w-64 h-64 rounded-full -left-16 -bottom-16 bg-white/20"></div>
            </div>

            {/* Content */}
            <div className="relative">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                {/* Left Side - Title and Subtitle */}
                <div className="flex-1">
                  <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Buku Tabungan Sampah</h1>
                  <p className="max-w-xl text-sm text-emerald-100 sm:text-base">
                    Lacak perjalanan kontribusi Anda dalam mengurangi sampah dan mengumpulkan poin reward
                  </p>
                </div>

                {/* Right Side - Stats */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:flex sm:items-stretch">
                  {/* Points Card */}
                  <div className="flex flex-col justify-between p-4 border bg-white/10 backdrop-blur-sm rounded-2xl border-white/20">
                    <p className="mb-1 text-xs font-medium text-emerald-100">Total Points</p>
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">{userData?.rewards?.points || 0}</h2>
                      <p className="text-emerald-200 text-xs mt-0.5">{userData?.rewards?.tier || 'Rookie'}</p>
                    </div>
                  </div>

                  {/* Balance Card */}
                  <div className="flex flex-col justify-between p-4 border bg-white/10 backdrop-blur-sm rounded-2xl border-white/20">
                    <p className="mb-1 text-xs font-medium text-emerald-100">Saldo</p>
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Rp {userData?.balance?.toLocaleString() || 0}
                      </h2>
                      <p className="text-emerald-200 text-xs mt-0.5">Total Saldo</p>
                    </div>
                  </div>

                  {/* Pickups Card */}
                  <div className="flex flex-col justify-between p-4 border bg-white/10 backdrop-blur-sm rounded-2xl border-white/20">
                    <p className="mb-1 text-xs font-medium text-emerald-100">Total Setor</p>
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">
                        {pickups.filter(p => p.status === 'completed').length}
                      </h2>
                      <p className="text-emerald-200 text-xs mt-0.5">Pengumpulan</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-3 mb-6 bg-white shadow-lg rounded-xl sm:p-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-4 sm:gap-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Cari berdasarkan lokasi atau jenis sampah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2 sm:col-span-2 sm:gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="all">Semua Transaksi</option>
              <option value="pickup">Penambahan Poin</option>
              <option value="transaction">Penukaran Poin</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 sm:px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-200"
            >
              <SortAsc className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden text-sm sm:inline sm:text-base">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Combined List with Collapsible Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <div className="w-8 h-8 rounded-full animate-spin sm:h-12 sm:w-12 border-3 sm:border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : filteredData.length > 0 ? (
        <>
          <div className="space-y-4">
            {currentItems.map((item) => (
              <div key={item.id} className="overflow-hidden transition-shadow bg-white border border-gray-100 shadow-lg rounded-xl hover:shadow-xl">
                {/* Card Header - Always visible */}
                <div 
                  className="p-4 transition-colors cursor-pointer sm:p-6 hover:bg-gray-50"
                  onClick={() => toggleCard(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 gap-3">
                      {/* Date and Transaction Type Icon */}
                      <div className="flex items-center gap-2">
                        {item.itemType === 'pickup' ? (
                          <ArrowUpCircle className="flex-shrink-0 w-5 h-5 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="flex-shrink-0 w-5 h-5 text-orange-500" />
                        )}
                        <span className="text-sm font-medium sm:text-base">
                          {new Date((item.createdAt?.seconds || item.date?.seconds) * 1000).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium capitalize
                        ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                          item.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          item.status === 'assigned' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                        {item.status === 'completed' ? 'Selesai' :
                         item.status === 'pending' ? 'Menunggu' :
                         item.status === 'assigned' ? 'Diproses' :
                         item.status}
                      </span>
                      <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium
                        ${item.itemType === 'pickup' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                          'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                        {item.itemType === 'pickup' ? 'Penambahan Poin' : 'Penukaran Poin'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden text-right sm:block">
                        <p className="text-sm text-gray-500">{item.itemType === 'pickup' ? 'Total Nilai' : 'Total Konversi'}</p>
                        {item.itemType === 'pickup' ? (
                          <p className="font-bold text-emerald-700">+{item.pointsAmount || 0} poin</p>
                        ) : (
                          <p className="font-bold text-orange-700">-{item.pointsConverted || 0} poin</p>
                        )}
                      </div>
                      <ChevronsUpDown className={`w-5 h-5 text-gray-400 transition-transform duration-200
                        ${expandedCards[item.id] ? 'rotate-180' : ''}`} 
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                <div className={`transition-all duration-200 ease-in-out ${
                  expandedCards[item.id] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}>
                  <div className="p-4 pt-0 border-t border-gray-100 sm:p-6">
                    {/* Different content for pickup vs transaction */}
                    {item.itemType === 'pickup' ? (
                      <div className="flex flex-col gap-4">
                        {/* Pickup Transaction Details Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Waktu Penjemputan</p>
                            <p className="text-sm font-medium sm:text-base">{item.time}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Metode Pengambilan</p>
                            <p className="text-sm font-medium capitalize sm:text-base">
                              {item.deliveryType === 'pickup' ? 'Dijemput' : 'Antar Sendiri'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Bank Sampah</p>
                            <p className="text-sm font-medium sm:text-base">{item.wasteBankName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Points Didapat</p>
                            <p className="font-bold text-emerald-600">+{item.pointsAmount || 0}</p>
                          </div>
                        </div>

                        {/* Location if exists */}
                        {item.location && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500 sm:text-sm">Lokasi Penjemputan</p>
                              <p className="text-sm font-medium sm:text-base">{item.location}</p>
                            </div>
                          </div>
                        )}

                        {/* Waste Details */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-900 sm:text-base">
                            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                            Detail Sampah
                          </h3>
                          <div className="space-y-2">
                            {Object.entries(item.wastes || {}).map(([type, data]) => (
                              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                                <div>
                                  <p className="text-sm text-gray-600 capitalize sm:text-base">{type}</p>
                                  <p className="text-xs text-gray-500 sm:text-sm">{data.weight} kg</p>
                                </div>
                                <p className="text-sm font-medium sm:text-base">
                                  Rp {data.value.toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes if exists */}
                        {item.notes && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-gray-600 sm:text-sm">{item.notes}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Transaction Details Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Waktu Transaksi</p>
                            <p className="text-sm font-medium sm:text-base">
                              {new Date(item.createdAt.seconds * 1000).toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Bank Sampah</p>
                            <p className="text-sm font-medium sm:text-base">{item.wasteBankId}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 sm:text-sm">Nominal Konversi</p>
                            <p className="text-sm font-medium sm:text-base">Rp {item.amount.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Transaction Summary */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-900 sm:text-base">
                            <Wallet className="w-4 h-4 text-orange-600 sm:w-5 sm:h-5" />
                            Detail Konversi
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-200">
                              <p className="text-sm text-gray-600 sm:text-base">Points Dikonversi</p>
                              <p className="text-sm font-medium text-orange-700 sm:text-base">-{item.pointsConverted} Points</p>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <p className="text-sm text-gray-600 sm:text-base">Total Didapat</p>
                              <p className="text-sm font-medium text-emerald-700 sm:text-base">+Rp {item.amount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-6 mt-6 bg-white border border-gray-100 rounded-xl">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors
                      ${currentPage === index + 1
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center bg-white shadow-lg sm:py-16 rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-4 text-gray-400 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 sm:text-xl">Tidak ada riwayat transaksi</h3>
          <p className="max-w-md px-4 mx-auto text-sm text-gray-600 sm:text-base">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Coba sesuaikan filter pencarian Anda'
              : 'Mulai dengan menjadwalkan permintaan pickup sampah pertama Anda'}
          </p>
        </div>
      )}
    </div>
  );
};

export default History;