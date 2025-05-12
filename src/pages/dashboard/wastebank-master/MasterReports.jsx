import React, { useState, useEffect } from 'react';
import { 
  BarChart2,
  TreesIcon,
  DropletIcon,
  Recycle,
  Package,
  Download,
  Calendar,
  Filter,
  Users,
  TrendingUp,
  MapPin,
  Loader2,
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  DollarSign,
  Scale,
  Wallet,
  Info
} from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  LineChart, 
  Bar,
  BarChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import moment from 'moment';
import 'moment/locale/id'; // Import Indonesian locale
import generateAIReport from '../../../lib/api/generateReport';

// Set moment to use Indonesian locale
moment.locale('id');

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444'];

// Fix the IMPACT_FACTORS object structure and the Select component
const IMPACT_FACTORS = {
  'kardus-bagus': {
    carbon: 2.93 // kg CO2 per kg waste paper/cardboard
  },
  'organic': {
    carbon: 0.5 // kg CO2 per kg organic waste
  },
  'kabel': {
    carbon: 3.41 // kg CO2 per kg metal/cable waste
  },
  // Add other waste types as needed with their specific emission factors
  'default': {
    carbon: 2.0 // Default value for unspecified waste types
  }
};

// Translations for waste types
const wasteTypeTranslations = {
  'kardus-bagus': 'Kardus',
  'organic': 'Organik',
  'kabel': 'Kabel',
  'plastik': 'Plastik',
  'kertas': 'Kertas',
  'besi': 'Besi',
  'elektronik': 'Elektronik',
  // Add other translations as needed
};

// Date range translations
const dateRangeTranslations = {
  'month': 'Bulan Terakhir',
  'quarter': 'Kuartal Terakhir',
  'year': 'Tahun Terakhir'
};

// Base Components
const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg 
      text-zinc-700 text-sm transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      hover:border-emerald-500/50
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none bg-no-repeat bg-[right_1rem_center]
      ${className}`}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`
    }}
    {...props}
  />
);

const StatCard = ({ icon: Icon, label, value, subValue, trend, trendValue, trendSuffix = '%', tooltip }) => (
  <div className="p-6 transition-all bg-white border shadow-sm rounded-xl border-zinc-200 hover:shadow-md group hover:border-emerald-200">
    <div className="flex items-start justify-between">
      <div>
        <div className="p-2.5 bg-emerald-50 rounded-lg w-fit group-hover:bg-emerald-100 transition-colors">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-600">{label}</p>
            {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
          </div>
          <p className="mt-1 text-2xl font-semibold transition-colors text-zinc-800 group-hover:text-emerald-600">
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-sm text-zinc-500">{subValue}</p>
          )}
        </div>
      </div>
      {trend && trendValue !== undefined && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium
          ${Number(trendValue) >= 0 
            ? 'bg-emerald-50 text-emerald-600' 
            : 'bg-red-50 text-red-600'}`}
        >
          {Number(trendValue) >= 0 ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(Number(trendValue)).toFixed(1)}{trendSuffix}
        </div>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, description, children, className = "", tooltip }) => (
  <div className={`bg-white p-6 rounded-xl border border-zinc-200 shadow-sm ${className}`}>
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-800">{title}</h2>
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InfoTooltip = ({ children }) => (
  <div className="relative inline-block group">
    <HelpCircle className="w-4 h-4 transition-colors text-zinc-400 hover:text-zinc-600" />
    <div className="absolute z-10 invisible w-48 px-3 py-2 mb-2 text-xs text-white transition-all -translate-x-1/2 rounded-lg opacity-0 bottom-full left-1/2 bg-zinc-800 group-hover:opacity-100 group-hover:visible">
      {children}
      <div className="absolute -mt-1 -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-zinc-800" />
    </div>
  </div>
);

// Information panel component
const InfoPanel = ({ title, children }) => (
  <div className="p-4 mb-6 border border-blue-100 rounded-lg bg-blue-50">
    <div className="flex gap-3">
      <Info className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500" />
      <div>
        <h3 className="mb-1 text-sm font-medium text-blue-800">{title}</h3>
        <div className="text-sm text-blue-700">{children}</div>
      </div>
    </div>
  </div>
);

const MasterReports = () => {
  const { userData, currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [reports, setReports] = useState({
    collectionStats: {
      totalPickups: 0,
      totalWeight: 0,
      totalEarnings: 0,
      completedPickups: 0
    },
    financialStats: {
      totalRevenue: 0,
      lastMonthRevenue: 0,
      thisMonthRevenue: 0,
      revenueGrowth: 0,
      averagePerKg: 0
    },
    impactStats: {
      carbonReduced: 0
    },
    wasteTypeDistribution: [],
    monthlyTrends: [],
    revenueByWasteType: []
  });
  const [isGeneratingAIReport, setIsGeneratingAIReport] = useState(false);

  useEffect(() => {
    let unsubscribe;
    
    if (currentUser?.uid) {
      unsubscribe = setupReportDataListener();
    }
    
    // Cleanup function to unsubscribe when component unmounts or deps change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dateRange, currentUser?.uid]);

  const calculateImpact = (wastes) => {
    let impact = {
      carbonReduced: 0
    };

    Object.entries(wastes).forEach(([type, data]) => {
      const factors = IMPACT_FACTORS[type] || IMPACT_FACTORS['default'];
      if (factors && data.weight && factors.carbon) {
        impact.carbonReduced += factors.carbon * data.weight;
      }
    });

    return impact;
  };

  const setupReportDataListener = () => {
    if (!currentUser?.uid) {
      setError("ID Pengguna tidak ditemukan");
      return () => {};
    }

    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const pickupsQuery = query(
        collection(db, 'masterBankRequests'),
        where('wasteBankId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );

      // Replace getDocs with onSnapshot for real-time updates
      const unsubscribe = onSnapshot(
        pickupsQuery,
        (pickupsSnapshot) => {
          const pickupsData = pickupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })).filter(p => {
            if (!p.completedAt) return false;
            const completedDate = new Date(p.completedAt.seconds * 1000);
            return completedDate >= startDate && completedDate <= now;
          });

          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const currentMonthStart = new Date(thisYear, thisMonth, 1);
          const currentMonthPickups = pickupsData.filter(p => {
            if (!p.completedAt) return false;
            const date = new Date(p.completedAt.seconds * 1000);
            return date >= currentMonthStart && date <= now;
          });

          const lastMonthDate = new Date(now);
          lastMonthDate.setMonth(now.getMonth() - 1);
          const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
          const lastMonthEnd = new Date(thisYear, thisMonth, 0);

          const lastMonthPickups = pickupsData.filter(p => {
            if (!p.completedAt) return false;
            const date = new Date(p.completedAt.seconds * 1000);
            return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
          });

          const thisMonthRevenue = currentMonthPickups.reduce((sum, p) => sum + (p.totalValue || 0), 0);
          const lastMonthRevenueForGrowthCalc = lastMonthPickups.reduce((sum, p) => sum + (p.totalValue || 0), 0);
          const totalRevenue = pickupsData.reduce((sum, p) => sum + (p.totalValue || 0), 0);
          const totalWeight = pickupsData.reduce((sum, p) => {
            return sum + Object.values(p.wastes || {}).reduce((w, waste) => w + (waste.weight || 0), 0);
          }, 0);

          const wasteTypeStats = {};
          pickupsData.forEach(pickup => {
            Object.entries(pickup.wastes || {}).forEach(([type, data]) => {
              if (!wasteTypeStats[type]) {
                wasteTypeStats[type] = { weight: 0, value: 0 };
              }
              wasteTypeStats[type].weight += data.weight || 0;
              wasteTypeStats[type].value += data.value || 0;
            });
          });

          const reportData = {
            collectionStats: {
              totalPickups: pickupsData.length,
              totalWeight,
              totalEarnings: totalRevenue,
              completedPickups: pickupsData.filter(p => p.status === 'completed').length
            },
            financialStats: {
              totalRevenue,
              lastMonthRevenue: lastMonthRevenueForGrowthCalc,
              thisMonthRevenue: thisMonthRevenue,
              revenueGrowth: lastMonthRevenueForGrowthCalc ? ((thisMonthRevenue - lastMonthRevenueForGrowthCalc) / lastMonthRevenueForGrowthCalc * 100) : (thisMonthRevenue > 0 ? 100 : 0),
              averagePerKg: totalWeight ? (totalRevenue / totalWeight) : 0
            },
            impactStats: calculateImpact(wasteTypeStats),
            wasteTypeDistribution: Object.entries(wasteTypeStats).map(([type, data]) => ({
              name: wasteTypeTranslations[type] || type.charAt(0).toUpperCase() + type.slice(1),
              weight: data.weight,
              value: data.value
            })),
            monthlyTrends: [],
            revenueByWasteType: Object.entries(wasteTypeStats).map(([type, data]) => ({
              name: wasteTypeTranslations[type] || type.charAt(0).toUpperCase() + type.slice(1),
              revenue: data.value,
              weight: data.weight,
              averagePrice: data.weight ? (data.value / data.weight) : 0
            }))
          };

          const monthlyData = {};
          pickupsData.forEach(pickup => {
            if (!pickup.completedAt || !pickup.completedAt.seconds) return;
            const date = new Date(pickup.completedAt.seconds * 1000);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: date.toLocaleString('id', { month: 'short', year: '2-digit' }),
                year: date.getFullYear(),
                monthIndex: date.getMonth(),
                weight: 0,
                revenue: 0,
                pickups: 0,
                wasteDetails: {}
              };
            }
            monthlyData[monthKey].pickups++;
            monthlyData[monthKey].revenue += pickup.totalValue || 0;
            Object.entries(pickup.wastes || {}).forEach(([type, wasteData]) => {
              const weight = wasteData.weight || 0;
              monthlyData[monthKey].weight += weight;
              if (!monthlyData[monthKey].wasteDetails[type]) {
                monthlyData[monthKey].wasteDetails[type] = 0;
              }
              monthlyData[monthKey].wasteDetails[type] += weight;
            });
          });

          const sortedMonthlyDataValues = Object.values(monthlyData).sort((a, b) => {
            if (a.year !== b.year) {
              return a.year - b.year;
            }
            return a.monthIndex - b.monthIndex;
          });
          
          reportData.monthlyTrends = sortedMonthlyDataValues.map(monthItem => {
            let monthlyCarbon = 0;
            Object.entries(monthItem.wasteDetails).forEach(([type, weight]) => {
              const factors = IMPACT_FACTORS[type] || IMPACT_FACTORS['default'];
              if (factors && factors.carbon) {
                 monthlyCarbon += (weight || 0) * factors.carbon;
              }
            });
            return {
              month: monthItem.month,
              weight: monthItem.weight,
              revenue: monthItem.revenue,
              pickups: monthItem.pickups,
              carbon: monthlyCarbon
            };
          });

          setReports(reportData);
          setError(null);
          setLoading(false);
        },
        (error) => {
          console.error('Error mengambil data laporan:', error);
          setError('Gagal memuat data laporan');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error menyiapkan listener data laporan:', error);
      setError('Gagal memuat data laporan');
      setLoading(false);
      return () => {};
    }
  };

  const downloadReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      ...reports
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-bank-sampah-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdfReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;
    
    // Add header
    doc.setFillColor(16, 185, 129); // Emerald-500 color
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Bank Sampah', margin, 25);
    
    doc.setFontSize(10);
    doc.text(`Dibuat pada: ${moment().format('D MMMM YYYY')}`, margin, 35);
    doc.text(`Rentang Waktu: ${dateRangeTranslations[dateRange]}`, pageWidth - margin - 50, 35, { align: 'right' });
    
    y = 50;
    
    // Add summary section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan', margin, y);
    
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Add stats in a nice layout
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 3, 3, 'FD');
    
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Pendapatan:', margin + 10, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rp ${reports.financialStats.totalRevenue.toLocaleString('id-ID')}`, margin + 60, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Berat:', margin + pageWidth/2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reports.collectionStats.totalWeight.toFixed(1)} kg`, margin + pageWidth/2 + 50, y);
    
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Pengambilan Selesai:', margin + 10, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reports.collectionStats.completedPickups}`, margin + 60, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Harga Rata-rata:', margin + pageWidth/2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rp ${reports.financialStats.averagePerKg.toLocaleString('id-ID')}/kg`, margin + pageWidth/2 + 50, y);
    
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Pengurangan Karbon:', margin + 10, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reports.impactStats.carbonReduced.toFixed(1)} kg CO₂`, margin + 60, y);
    
    y += 20;
    
    // Add waste distribution table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribusi Sampah', margin, y);
    y += 10;
    
    const wasteColumns = [
      { header: 'Jenis Sampah', dataKey: 'name' },
      { header: 'Berat (kg)', dataKey: 'weight' },
      { header: 'Pendapatan (Rp)', dataKey: 'revenue' },
      { header: 'Harga Rata-rata (Rp/kg)', dataKey: 'averagePrice' }
    ];
    
    const wasteRows = reports.revenueByWasteType.map(waste => ({
      ...waste,
      weight: waste.weight.toFixed(1),
      revenue: waste.revenue.toLocaleString('id-ID'),
      averagePrice: waste.averagePrice.toLocaleString('id-ID')
    }));
    
    doc.autoTable({
      startY: y,
      columns: wasteColumns,
      body: wasteRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 253, 250]
      },
      margin: { left: margin, right: margin }
    });
    
    y = doc.lastAutoTable.finalY + 15;
    
    // Add monthly trends table
    if (y + 60 > pageHeight) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tren Bulanan', margin, y);
    y += 10;
    
    const trendColumns = [
      { header: 'Bulan', dataKey: 'month' },
      { header: 'Berat (kg)', dataKey: 'weight' },
      { header: 'Pendapatan (Rp)', dataKey: 'revenue' },
      { header: 'Pengambilan', dataKey: 'pickups' },
      { header: 'Pengurangan CO₂ (kg)', dataKey: 'carbon' }
    ];
    
    const trendRows = reports.monthlyTrends.map(trend => ({
      ...trend,
      weight: trend.weight.toFixed(1),
      revenue: trend.revenue.toLocaleString('id-ID'),
      carbon: trend.carbon.toFixed(1)
    }));
    
    doc.autoTable({
      startY: y,
      columns: trendColumns,
      body: trendRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 253, 250]
      },
      margin: { left: margin, right: margin }
    });
    
    y = doc.lastAutoTable.finalY + 15;
    
    // Add footer
    if (y + 40 > pageHeight) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFillColor(16, 185, 129, 0.1);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 40, 3, 3, 'FD');
    
    y += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 85, 66);
    doc.text('Dampak Lingkungan', margin + 10, y);
    
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aktivitas daur ulang Anda mencegah sekitar ${reports.impactStats.carbonReduced.toFixed(1)} kg emisi CO₂`, 
      margin + 10, y);
    doc.text(`Ini setara dengan ${(reports.impactStats.carbonReduced / 20).toFixed(1)} pohon yang ditanam selama setahun`, 
      margin + 10, y + 10);
    
    // Save the PDF
    doc.save(`laporan-bank-sampah-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadAIReport = async () => {
    try {
      setIsGeneratingAIReport(true);
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange,
        ...reports
      };

      const pdfBlob = await generateAIReport(reportData, dateRange, userData);
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-ai-bank-sampah-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error menghasilkan laporan AI:", error);
    } finally {
      setIsGeneratingAIReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50/50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
          <p className="text-zinc-600">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50/50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">{error}</h3>
          <button
            onClick={setupReportDataListener}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white border shadow-sm rounded-xl border-zinc-200">
                <BarChart2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Laporan & Analitik</h1>
                <p className="text-sm text-zinc-500">Pantau kinerja pengelolaan sampah Anda</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center w-full gap-4 sm:w-auto">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full sm:w-44"
              >
                <option value="month">{dateRangeTranslations.month}</option>
                <option value="quarter">{dateRangeTranslations.quarter}</option>
                <option value="year">{dateRangeTranslations.year}</option>
              </Select>
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  onClick={downloadReport}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg
                    hover:border-zinc-300 hover:bg-zinc-50 transition-colors flex-1 sm:flex-initial"
                  title="Unduh data mentah dalam format JSON"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
                <button
                  onClick={downloadPdfReport}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg
                    hover:border-zinc-300 hover:bg-zinc-50 transition-colors flex-1 sm:flex-initial"
                  title="Unduh laporan dalam format PDF"
                >
                  <Download className="w-4 h-4" />
                  Laporan PDF
                </button>
                <button
                  onClick={downloadAIReport}
                  disabled={isGeneratingAIReport}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg
                    hover:bg-emerald-600 transition-colors flex-1 sm:flex-initial disabled:opacity-70 disabled:cursor-not-allowed"
                  title="Hasilkan laporan dengan AI yang lebih komprehensif"
                >
                  {isGeneratingAIReport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart2 className="w-4 h-4" />
                  )}
                  Laporan AI
                </button>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <InfoPanel title="Tentang Laporan & Analitik">
            <p>
              Halaman ini menampilkan ringkasan dan analisis data bank sampah Anda secara real-time. 
              Data akan otomatis diperbarui saat ada transaksi baru yang masuk ke sistem. 
              Gunakan filter rentang waktu untuk melihat data dalam periode yang berbeda. 
              Anda juga dapat mengunduh laporan dalam berbagai format.
            </p>
          </InfoPanel>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Financial Stats */}
            <StatCard
              icon={Wallet}
              label="Total Pendapatan"
              value={`Rp ${reports.financialStats.totalRevenue.toLocaleString('id-ID')}`}
              subValue="Total pemasukan"
              trend="vs. bulan lalu"
              trendValue={reports.financialStats.revenueGrowth}
              tooltip="Total pendapatan dari seluruh transaksi pada periode waktu yang dipilih"
            />
            <StatCard
              icon={Scale}
              label="Total Berat"
              value={`${reports.collectionStats.totalWeight.toFixed(1)} kg`}
              subValue={`${reports.collectionStats.totalPickups} pengambilan selesai`}
              trend="Harga rata-rata"
              trendValue={`Rp ${reports.financialStats.averagePerKg.toLocaleString('id-ID')}`}
              trendSuffix="/kg"
              tooltip="Total berat sampah yang terkumpul dan harga rata-rata per kilogram"
            />
            {/* Environmental Impact */}
            <StatCard
              icon={Recycle}
              label="Pengurangan Karbon"
              value={`${reports.impactStats.carbonReduced.toFixed(1)} kg CO₂`}
              subValue="Emisi CO₂ yang dicegah"
              tooltip="Jumlah emisi karbon yang berhasil dicegah dengan mendaur ulang sampah"
            />
            <StatCard
              icon={TrendingUp}
              label="Dampak Daur Ulang"
              value={`${(reports.impactStats.carbonReduced / 20).toFixed(1)} pohon`}
              subValue="Setara dengan pohon yang ditanam selama setahun"
              tooltip="Dampak lingkungan yang dihasilkan, dikonversi ke jumlah pohon yang ditanam"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Monthly Trends Chart */}
            <ChartCard
              title="Kinerja Bulanan"
              description="Tren berat yang terkumpul dan pendapatan"
              tooltip="Grafik ini menunjukkan perbandingan berat sampah yang terkumpul dan pendapatan setiap bulannya"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reports.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#71717A"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value} kg`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `Rp ${(value/1000).toFixed(0)}rb`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'weight') return [`${value.toFixed(1)} kg`, 'Berat'];
                        if (name === 'revenue') return [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan'];
                        if (name === 'pickups') return [`${value} pengambilan`, 'Pengambilan'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#10B981" name="weight" dot={{ r: 4 }} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#6366F1" name="revenue" dot={{ r: 4 }} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-zinc-600">Berat (kg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-xs text-zinc-600">Pendapatan (Rp)</span>
                </div>
              </div>
            </ChartCard>

            {/* Carbon Impact Chart */}
            <ChartCard
              title="Tren Dampak Karbon" 
              description="Emisi CO₂ yang dicegah bulanan"
              tooltip="Grafik ini menunjukkan jumlah emisi karbon (CO₂) yang berhasil dicegah setiap bulan"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reports.monthlyTrends}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#71717A"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#71717A"
                      fontSize={12}
                      tickFormatter={(value) => `${value.toFixed(0)} kg`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'carbon') return [`${Number(value).toFixed(1)} kg CO₂`, 'Pengurangan Karbon'];
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="carbon" fill="#10B981" name="carbon" radius={[4, 4, 0, 0]}>
                      {reports.monthlyTrends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`#10B981`} fillOpacity={(index + 5) / (reports.monthlyTrends.length + 5)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 p-4 mt-4 rounded-lg bg-emerald-50">
                <p className="text-sm font-medium text-emerald-700">
                  Total Dampak Karbon
                </p>
                <p className="text-xl font-semibold text-emerald-800">
                  {reports.impactStats.carbonReduced.toFixed(1)} kg CO₂
                </p>
                <p className="text-xs text-center text-emerald-600">
                  Setara dengan {(reports.impactStats.carbonReduced / 20).toFixed(1)} pohon yang ditanam selama setahun
                </p>
              </div>
            </ChartCard>

            {/* Waste Types Distribution */}
            <ChartCard
              title="Distribusi Sampah" 
              description="Pendapatan berdasarkan jenis sampah"
              tooltip="Grafik ini menunjukkan persentase pendapatan dari setiap jenis sampah yang dikumpulkan"
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.revenueByWasteType.filter(item => item.revenue > 0)}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      nameKey="name"
                    >
                      {reports.revenueByWasteType.filter(item => item.revenue > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, entry) => [
                        `Rp ${Number(value).toLocaleString('id-ID')}`,
                        `${entry.payload.name} (${Number(entry.payload.weight).toFixed(1)} kg)`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-zinc-700">Detail Jenis Sampah</h4>
                <div className="max-h-[120px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-zinc-100">
                  {reports.revenueByWasteType.map((type, index) => (
                    <div key={type.name} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-zinc-700">{type.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-800">
                          Rp {Number(type.revenue).toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Rp {Number(type.averagePrice).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/kg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Impact Summary */}
          <div className="p-6 border bg-emerald-50 rounded-xl border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Recycle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Ringkasan Dampak Lingkungan</h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Aktivitas pengelolaan sampah Anda telah berkontribusi untuk:
                </p>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Dampak Karbon</span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-900">
                      {reports.impactStats.carbonReduced.toFixed(1)} kg CO₂
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">emisi yang dicegah</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-emerald-700">
                  <strong>Catatan:</strong> Data ini diperbarui secara real-time dan menunjukkan dampak positif dari kegiatan daur ulang sampah Anda terhadap lingkungan. Teruskan kerja baik Anda!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MasterReports;