// src/pages/dashboard/customer/History.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  Search,
  Filter,
  SortAsc,
  Package,
  MapPin,
  Box,
  AlertCircle,
  ChevronsUpDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  SortDesc,
  X
} from 'lucide-react';
import { collection, query, where, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { calculatePoints, calculateTotalValue } from '../../../lib/constants';
import '../../../styles/animation.css'; 

const History = () => {
  const { currentUser, userData } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Temporary filter states that are only applied when "Simpan" is clicked
  const [tempFilterStatus, setTempFilterStatus] = useState('all');
  const [tempFilterType, setTempFilterType] = useState('all');
  const [tempSortOrder, setTempSortOrder] = useState('desc');

  const filterRef = useRef(null);

  // Initialize temporary filters when the filter modal opens
  useEffect(() => {
    if (isFilterOpen) {
      setTempFilterStatus(filterStatus);
      setTempFilterType(filterType);
      setTempSortOrder(sortOrder);
    }
  }, [isFilterOpen]);

  // Apply filters when "Simpan" is clicked
  const applyFilters = () => {
    setFilterStatus(tempFilterStatus);
    setFilterType(tempFilterType);
    setSortOrder(tempSortOrder);
    setIsFilterOpen(false);
  };

  // Reset temporary filters
  const resetFilters = () => {
    setTempFilterStatus('all');
    setTempFilterType('all');
    setTempSortOrder('desc');
  };

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

      setLoading(true);

      // Fetch pickups data with onSnapshot
      const pickupsRef = collection(db, 'pickups');
      const pickupsQuery = query(
        pickupsRef,
        where('userId', '==', currentUser.uid)
      );

      // Set up real-time listener for pickups
      const unsubscribePickups = onSnapshot(pickupsQuery, (pickupsSnapshot) => {
        const pickupData = pickupsSnapshot.docs.map(doc => {
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
        setPickups(pickupData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching pickups:", error);
        setLoading(false);
      });

      // Fetch transactions data - points conversion with onSnapshot
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('userId', '==', currentUser.uid),
        where('type', '==', 'points_conversion')
      );

      // Set up real-time listener for transactions
      const unsubscribeTransactions = onSnapshot(transactionsQuery, async (transactionsSnapshot) => {
        const wasteBankPromises = transactionsSnapshot.docs.map(async docSnapshot => {
          const data = docSnapshot.data();

          // Fetch waste bank name from users collection using wasteBankId
          let wasteBankName = '';
          if (data.wasteBankId) {
            try {
              const wasteBankDocRef = doc(db, 'users', data.wasteBankId);
              const wasteBankDocSnap = await getDoc(wasteBankDocRef);
              if (wasteBankDocSnap.exists()) {
                const wasteBankData = wasteBankDocSnap.data();
                wasteBankName =
                  wasteBankData.profile?.institutionName ||
                  wasteBankData.profile?.fullName ||
                  '';
              }
            } catch (err) {
              console.warn(`Failed to fetch waste bank with ID ${data.wasteBankId}:`, err);
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            wasteBankName,
            itemType: 'transaction' // Add type for filtering
          };
        });

        const transactionData = await Promise.all(wasteBankPromises);
        setTransactions(transactionData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      });

      // Return cleanup function to unsubscribe when component unmounts
      return () => {
        unsubscribePickups();
        unsubscribeTransactions();
      };
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
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prevent body scrolling when filter modal is open
  useEffect(() => {
    if (isFilterOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Add styles to body to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'hidden';
    } else {
      // Restore scrolling when modal closes
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    
    return () => {
      // Cleanup in case component unmounts while modal is open
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
    };
  }, [isFilterOpen]);

  return (
    <div className="sm:px-4 sm:py-4 mx-auto max-w-7xl sm:px-6 sm:py-6">
      {/* Hero Section - New Design */}
      <div className="mb-4 sm:mb-8">
        <div className="overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 rounded-xl sm:rounded-3xl">
          {/* Content */}
          <div className="p-6 relative text-white">
            <h1 className="mb-2 text-lg sm:text-2xl font-bold">Buku Tabungan</h1>
            <p className="text-sm sm:text-md text-emerald-50">
              Lacak kontribusi sampah Anda
            </p>
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-3 sm:gap-4 sm:flex sm:items-stretch">
        {/* Points Card */}
        <div className="p-4 border bg-white rounded-2xl border-emerald-200">
          <p className="mb-1 text-xs font-medium text-emerald-500">Total Points</p>
          <h2 className="text-xl font-bold text-emerald-600 sm:text-2xl">
            {userData?.rewards?.points || 0}
          </h2>
        </div>

        {/* Pickups Card */}
        <div className="flex flex-col justify-between p-4 border bg-white rounded-2xl border-emerald-200">
          <p className="mb-1 text-xs font-medium text-emerald-500">Total Setor</p>
          <h2 className="text-xl font-bold text-emerald-600 sm:text-2xl">
            {pickups.filter((p) => p.status === 'completed').length}
          </h2>
        </div>
      </div>

      {/* Balance Card */}
      <div className="mb-4 flex flex-col justify-between p-4 border bg-white rounded-2xl border-emerald-200">
        <p className="mb-1 text-xs font-medium text-emerald-500">Total Saldo</p>
        <h2 className="text-xl font-bold text-emerald-600 sm:text-2xl">
          Rp {userData?.balance?.toLocaleString() || 0}
        </h2>
      </div>

      {/* Search and Filters */}
      <div className="sm:p-3 mb-2 sm:bg-white sm:shadow-lg rounded-xl sm:p-4 sm:mb-8">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Cari.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-xs"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-200"
            aria-label="Open filters"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm">Filter</span>
          </button>
        </div>
      </div>

      {/* Bottom Filter Modal */}
        {isFilterOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center animate-fadeIn" style={{ animationDuration: '0.2s' }}>
            <div 
          className={`bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-3xl ${isFilterOpen ? 'animate-slideUp' : 'animate-slideDown'}`} 
          style={{ animationDuration: '0.3s' }}
          ref={filterRef}
            >
          <div className="p-6">
            {/* Modal Header with Title */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Filter</h2>
              <button 
            onClick={() => {
              setIsFilterOpen(false);
            }}
            className="p-2 text-gray-500"
              >
            <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Status */}
              <div className="mb-4">
                <h3 className="text-left mb-2 text-sm sm:text-lg font-medium">Status</h3>
                <select
                  value={tempFilterStatus}
                  onChange={(e) => setTempFilterStatus(e.target.value)}
                  className="text-sm w-full px-4 py-2 am:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Semua</option>
                  <option value="completed">Selesai</option>
                  <option value="pending">Menunggu</option>
                  <option value="assigned">Ditugaskan</option>
                  <option value="in_progress">Dalam Proses</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>

              {/* Filter Type */}
              <div className="mb-4">
                <h3 className="text-left mb-2 text-sm sm:text-lg font-medium">Jenis Transaksi</h3>
                <select
                  value={tempFilterType}
                  onChange={(e) => setTempFilterType(e.target.value)}
                  className="text-sm w-full px-4 py-2 am:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Semua Transaksi</option>
                  <option value="pickup">Penambahan Poin</option>
                  <option value="transaction">Penukaran Poin</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="mb-4">
                <h3 className="text-left mb-2 text-sm sm:text-lg font-medium">Urutan</h3>
                <select
                  value={tempSortOrder}
                  onChange={(e) => setTempSortOrder(e.target.value)}
                  className="text-sm w-full px-4 py-2 sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="desc">Terbaru</option>
                  <option value="asc">Terlama</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={applyFilters}
                  className="w-full py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined List with Collapsible Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-16">
          <div className="w-6 h-6 rounded-full animate-spin sm:h-12 sm:w-12 border-2 sm:border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : filteredData.length > 0 ? (
        <div>
          <div className="space-y-2">
            {currentItems.map((item) => (
              <div key={item.id} className="overflow-hidden transition-shadow bg-white border border-gray-100 shadow-xs sm:shadow-lg rounded-lg sm:rounded-xl hover:shadow-md">
                {/* Card Header - Always visible */}
                <div
                  className="p-3 sm:p-6 transition-colors cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCard(item.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    {/* Top row for mobile - Date and status */}
                    <div className="flex items-center justify-between mb-2 sm:mb-0">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {item.itemType === 'pickup' ? (
                          <ArrowUpCircle className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                        )}
                        <span className="text-xs font-medium sm:text-base">
                          {new Date((item.createdAt?.seconds || item.date?.seconds) * 1000).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 sm:py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium
                        ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          item.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            item.status === 'assigned' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              item.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                                item.status === 'in_progress' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                        {item.status === 'completed' ? 'Selesai' :
                          item.status === 'pending' ? 'Menunggu' :
                            item.status === 'assigned' ? 'Ditugaskan' :
                              item.status === 'cancelled' ? 'Dibatalkan' :
                                item.status === 'in_progress' ? 'Dalam Proses' :
                                  item.status}
                      </span>
                    </div>

                    {/* Bottom row for mobile - Points and expand icon */}
                    <div className="flex items-center justify-between sm:hidden">
                      <div className="text-left">
                        <p className="text-xs text-gray-500">{item.itemType === 'pickup' ? 'Total Nilai' : 'Total Konversi'}</p>
                        {item.itemType === 'pickup' ? (
                          <p className="text-sm font-bold text-emerald-700">+{item.pointsAmount || 0} poin</p>
                        ) : (
                          <p className="text-sm font-bold text-orange-700">-{item.pointsConverted || 0} poin</p>
                        )}
                      </div>
                      <ChevronsUpDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200
                        ${expandedCards[item.id] ? 'rotate-180' : ''}`}
                      />
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:flex sm:items-center sm:gap-4">
                      <div className="text-right">
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
                <div className={`transition-all duration-200 ease-in-out ${expandedCards[item.id] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  } overflow-hidden`}>
                  <div className="p-3 pt-1 sm:p-6 sm:pt-0 border-t border-gray-100">
                    {/* Different content for pickup vs transaction */}
                    {item.itemType === 'pickup' ? (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Pickup Transaction Details Grid */}
                        <div className="grid text-left grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                          {/* Added Completion Date for completed items */}
                          {item.status === 'completed' && item.completedAt && (
                            <div className="space-y-0.5 sm:space-y-1">
                              <p className="text-xs text-gray-500">Waktu Selesai</p>
                              <p className="text-xs font-medium sm:text-base">
                                {new Date(item.completedAt.seconds * 1000).toLocaleString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}

                          <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-xs text-gray-500">Waktu Penjemputan</p>
                            <p className="text-xs font-medium sm:text-base">{item.time}</p>
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-xs text-gray-500">Metode</p>
                            <p className="text-xs font-medium capitalize sm:text-base">
                              {item.deliveryType === 'pickup' ? 'Penjemputan' : 'Antar Sendiri'}
                            </p>
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-xs text-gray-500">Bank Sampah</p>
                            <p className="text-xs font-medium sm:text-base">{item.wasteBankName}</p>
                          </div>
                        </div>

                        {/* Location if exists */}
                        {item.location && (
                          <div className="text-left flex items-start gap-2 sm:p-3 rounded-lg">
                            <MapPin className="hidden sm:block w-3 h-3 sm:w-5 sm:h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Lokasi Penjemputan</p>
                              <p className="text-xs font-medium sm:text-base">{item.location}</p>
                            </div>
                          </div>
                        )}

                        {/* Waste Details */}
                        <div className="p-2 sm:p-4 text-left bg-gray-50 rounded-lg sm:rounded-xl">
                          <h3 className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 text-xs font-medium text-gray-900 sm:text-base">
                            <Box className="w-3 h-3 sm:w-5 sm:h-5 text-emerald-600" />
                            Detail Sampah
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            {Object.entries(item.wastes || {}).map(([type, data]) => (
                              <div key={type} className="flex items-center justify-between py-1 sm:py-2 border-b border-gray-200 last:border-0">
                                <div>
                                  <p className="text-xs text-gray-600 capitalize sm:text-base">{type}</p>
                                  <p className="text-xs text-gray-500">{data.weight} kg</p>
                                </div>
                                <p className="text-xs font-medium sm:text-base">
                                  Rp {data.value.toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes if exists */}
                        {item.notes && (
                          <div className="p-2 sm:p-4 text-left bg-gray-50 rounded-lg sm:rounded-xl">
                            <h3 className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 text-xs font-medium text-gray-900 sm:text-base">
                              <AlertCircle className="w-3 h-3 sm:w-5 sm:h-5 text-emerald-600" />
                              Catatan
                            </h3>
                            <div className="text-xs text-gray-600 sm:text-sm">{item.notes}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Transaction Details Grid */}
                        <div className="flex flex-col gap-3 text-left">
                          <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-xs text-gray-500">Waktu Transaksi</p>
                            <p className="text-xs font-medium sm:text-base">
                              {new Date(item.createdAt.seconds * 1000).toLocaleTimeString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-xs text-gray-500">Bank Sampah</p>
                            <p className="text-xs font-medium sm:text-base">{item.wasteBankName}</p>
                          </div>
                          
                          {/* Added Completion Date for completed items */}
                          {item.status === 'completed' && item.completedAt && (
                            <div className="space-y-0.5 sm:space-y-1">
                              <p className="text-xs text-gray-500">Waktu Selesai</p>
                              <p className="text-xs font-medium sm:text-base">
                                {new Date(item.completedAt.seconds * 1000).toLocaleString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Transaction Summary */}
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                          <h3 className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 text-xs font-medium text-gray-900 sm:text-base">
                            <Wallet className="w-3 h-3 sm:w-5 sm:h-5 text-orange-600" />
                            Detail Konversi
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between py-1 sm:py-2 border-b border-gray-200">
                              <p className="text-xs text-gray-600 sm:text-base">Points Dikonversi</p>
                              <p className="text-xs font-medium text-orange-700 sm:text-base">-{item.pointsConverted} Points</p>
                            </div>
                            <div className="flex items-center justify-between py-1 sm:py-2">
                              <p className="text-xs text-gray-600 sm:text-base">Total Didapat</p>
                              <p className="text-xs font-medium text-emerald-700 sm:text-base">+Rp {item.amount.toLocaleString()}</p>
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

          {/* Pagination - Fixed for Mobile */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 sm:py-6 mt-4 sm:mt-6 bg-transparent sm:bg-white sm:border sm:border-gray-100 sm:rounded-xl">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-2 py-1 sm:py-2 text-xs font-medium rounded-lg transition-colors
                  ${currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1 sm:gap-2">
                {/* Show limited page numbers on mobile */}
                {[...Array(totalPages)].map((_, index) => {
                  // On mobile, only show current page and adjacent pages
                  const pageNum = index + 1;
                  const isCurrent = currentPage === pageNum;
                  const isAdjacent = Math.abs(currentPage - pageNum) <= 1;
                  const shouldShow = totalPages <= 5 || isCurrent || isAdjacent;

                  if (!shouldShow && (index === 0 || index === totalPages - 1)) {
                    // Always show first and last page
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`hidden sm:block bg-transparent px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition-colors
                          ${isCurrent
                            ? 'bg-emerald-100 text-emerald-600 font-semibold'
                            : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (!shouldShow) {
                    // Show dots for skipped pages
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="hidden sm:block text-gray-400">...</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`bg-transparent w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-medium rounded-lg transition-colors
                        ${isCurrent
                          ? 'bg-emerald-100 text-emerald-600 font-semibold'
                          : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-2 py-1 sm:py-2 text-xs font-medium rounded-lg transition-colors
                  ${currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center bg-white sm:shadow-lg sm:py-16 rounded-xl">
          <Package className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-4 text-gray-400 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-sm sm:text-lg font-medium text-gray-900 sm:text-xl">Tidak ada riwayat transaksi</h3>
          <p className="max-w-md px-4 mx-auto text-xs sm:text-sm text-gray-600 sm:text-base">
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