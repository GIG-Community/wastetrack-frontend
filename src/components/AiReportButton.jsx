import React, { useState, useRef } from 'react';
import { Download, Eye, Loader2, Printer } from 'lucide-react';
import generateAiReport from '../lib/api/generateReport';
import { useAuth } from '../hooks/useAuth';

const AiReportButton = ({ reportData, role }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef(null);
  const { userData } = useAuth();
  const userRole = role || userData?.role || 'wastebank_admin';

  // Fungsi untuk menghasilkan HTML report
  const generateHtmlReport = (data, aiAnalysis, role) => {
    // Definisi warna berdasarkan peran
    const colors = {
      government: { 
        primary: 'rgb(16, 185, 129)', 
        secondary: 'rgb(5, 150, 105)',
        accent: 'rgb(4, 120, 87)',
        light: 'rgb(232, 245, 240)'
      },
      industry: { 
        primary: 'rgb(79, 70, 229)', 
        secondary: 'rgb(67, 56, 202)',
        accent: 'rgb(55, 48, 163)',
        light: 'rgb(237, 237, 252)' 
      },
      wastebank_master: { 
        primary: 'rgb(59, 130, 246)', 
        secondary: 'rgb(37, 99, 235)',
        accent: 'rgb(29, 78, 216)',
        light: 'rgb(232, 240, 253)'
      },
      wastebank_admin: { 
        primary: 'rgb(245, 158, 11)', 
        secondary: 'rgb(217, 119, 6)',
        accent: 'rgb(180, 83, 9)',
        light: 'rgb(253, 246, 232)'
      }
    };
    
    const roleColor = colors[role] || colors.wastebank_admin;
    
    // Menentukan judul laporan berdasarkan peran
    const reportTitles = {
      government: "Laporan Dampak Lingkungan Pemerintah",
      industry: "Laporan ESG & Dampak Lingkungan Industri",
      wastebank_master: "Laporan Kinerja Bank Sampah Induk",
      wastebank_admin: "Laporan Kinerja Bank Sampah Unit"
    };
    
    const title = reportTitles[role] || "Laporan Dampak Lingkungan";
    
    // Fungsi untuk mengkonversi recommendations text menjadi list HTML jika dalam format nomor
    const formatRecommendations = (recommendations) => {
      if (!recommendations) return '<p>Rekomendasi tidak tersedia</p>';
      
      // Jika rekomendasi berisi format angka yang diikuti titik
      if (/\d+\.\s/.test(recommendations)) {
        // Pisahkan teks berdasarkan pola nomor
        const recItems = recommendations.split(/(?=\d+\.\s)/).filter(item => item.trim() !== '');
        
        let recHtml = '<ol class="recommendations">';
        recItems.forEach(item => {
          // Extract the text content after the number
          const numberMatch = item.match(/^\d+\.\s(.*)/);
          if (numberMatch && numberMatch[1]) {
            // Format the content, keeping only what comes after the number
            const content = numberMatch[1];
            
            // Look for **text** patterns and convert to <strong>text</strong>
            const formattedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            recHtml += `<li>${formattedContent}</li>`;
          } else {
            // Jika tidak cocok dengan pola angka, gunakan seluruh teks
            const formattedItem = item.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            recHtml += `<li>${formattedItem}</li>`;
          }
        });
        recHtml += '</ol>';
        return recHtml;
      } else {
        // Jika bukan format daftar bernomor, tetap proses format bold text
        const formattedText = recommendations.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<p>${formattedText}</p>`;
      }
    };
    
    // Generate HTML untuk tabel metrik
    const generateMetricsTable = (metrics) => {
      let tableHtml = `
        <table class="metrics-table">
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Nilai</th>
              <th>Deskripsi</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      metrics.forEach((metric, index) => {
        const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
        tableHtml += `
          <tr class="${rowClass}">
            <td class="metric-name">${metric.name}</td>
            <td class="metric-value">${metric.value}</td>
            <td class="metric-desc">${metric.description}</td>
          </tr>
        `;
      });
      
      tableHtml += `
          </tbody>
        </table>
      `;
      
      return tableHtml;
    };
    
    // Membuat HTML lengkap
    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: "Helvetica", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: white;
          }
          
          /* Halaman */
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 0;
            margin: 0;
            overflow: hidden;
            position: relative;
            page-break-after: always;
          }
          
          /* Cover Page */
          .cover {
            position: relative;
            height: 297mm;
            background-color: ${roleColor.light};
            overflow: hidden;
          }
          
          .cover-decoration {
            position: absolute;
          }
          
          .circle-big {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background-color: ${roleColor.primary};
            opacity: 0.2;
            position: absolute;
            top: -70px;
            left: -70px;
          }
          
          .rect-corner {
            width: 100px;
            height: 100px;
            background-color: ${roleColor.secondary};
            opacity: 0.15;
            position: absolute;
            bottom: 0;
            right: 0;
          }
          
          .circle-small-1 {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: ${roleColor.accent};
            opacity: 0.3;
            position: absolute;
            top: 50px;
            right: 50px;
          }
          
          .circle-small-2 {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: ${roleColor.accent};
            opacity: 0.3;
            position: absolute;
            bottom: 70px;
            left: 30px;
          }
          
          .cover-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 0 40px;
            position: relative;
            z-index: 2;
          }
          
          .logo-circle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${roleColor.primary};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 60px;
            text-align: center;
            line-height: 60px;
          }
          
          .cover-line {
            width: 80%;
            height: 2px;
            background-color: ${roleColor.primary};
            margin: 20px 0 40px;
          }
          
          .cover-title {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            color: #333;
            margin-bottom: 15px;
          }
          
          .cover-subtitle {
            font-size: 16px;
            font-style: italic;
            text-align: center;
            color: #666;
            margin-bottom: 40px;
          }
          
          .cover-footer {
            position: absolute;
            bottom: 30px;
            left: 0;
            right: 0;
            text-align: center;
            color: #777;
          }
          
          /* Header */
          .header {
            background-color: ${roleColor.primary};
            color: white;
            padding: 15px 20px 25px;
            position: relative;
          }
          
          .header-title {
            font-size: 18px;
            font-weight: bold;
          }
          
          .header-date {
            font-size: 12px;
            margin-top: 3px;
          }
          
          /* Content */
          .content {
            padding: 20px;
          }
          
          .section {
            margin-bottom: 20px;
          }
          
          .section-title {
            display: flex;
            align-items: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            position: relative;
            background-color: ${roleColor.light};
            padding: 8px 15px;
            border-radius: 4px;
          }
          
          .section-title::before {
            content: "";
            display: block;
            width: 5px;
            height: 16px;
            background-color: ${roleColor.primary};
            margin-right: 10px;
            border-radius: 2px;
          }
          
          p {
            margin-bottom: 15px;
            text-align: justify;
            padding: 0 10px;
          }
          
          /* Tables */
          .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .metrics-table th, .metrics-table td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          .metrics-table th {
            background-color: ${roleColor.primary};
            color: white;
            text-align: left;
          }
          
          .metrics-table .metric-name {
            font-weight: bold;
            width: 25%;
          }
          
          .metrics-table .metric-value {
            text-align: center;
            width: 15%;
          }
          
          .metrics-table .metric-desc {
            width: 60%;
          }
          
          .metrics-table .even-row {
            background-color: white;
          }
          
          .metrics-table .odd-row {
            background-color: #f9f9f9;
          }
          
          /* Recommendations - ENHANCED WITH BACKGROUND GRAPHICS */
          .section-title.recommendations-title {
            background-color: ${roleColor.light};
            position: relative;
            overflow: hidden;
          }

          .section-title.recommendations-title::after {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%);
            border-radius: 0 0 0 50px;
          }

          .recommendations-container {
            background-color: ${roleColor.light};
            border-radius: 4px;
            padding: 15px;
            position: relative;
            overflow: hidden;
          }

          .recommendations-container::before {
            content: "";
            position: absolute;
            bottom: -20px;
            right: -20px;
            width: 80px;
            height: 80px;
            background-color: ${roleColor.primary};
            opacity: 0.1;
            border-radius: 50%;
          }

          .recommendations-container::after {
            content: "";
            position: absolute;
            top: -15px;
            left: -15px;
            width: 40px;
            height: 40px;
            background-color: ${roleColor.secondary};
            opacity: 0.1;
            border-radius: 50%;
          }

          .recommendations {
            margin-left: 20px;
            margin-right: 10px;
            position: relative;
            z-index: 2;
            list-style-position: outside;
          }

          .recommendations li {
            margin-bottom: 15px;
            position: relative;
            padding-left: 5px;
          }

          .recommendations li::marker {
            color: ${roleColor.primary};
            font-weight: bold;
          }

          .recommendations strong {
            color: ${roleColor.accent};
            font-weight: bold;
          }
          
          /* Footer */
          .footer {
            position: absolute;
            bottom: 15px;
            left: 20px;
            right: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: #aaa;
          }
          
          .footer-divider {
            position: absolute;
            bottom: 25px;
            left: 20px;
            right: 20px;
            height: 1px;
            background-color: #eee;
          }
          
          /* Print styles */
          @media print {
            body {
              background: white;
            }
            .page {
              page-break-after: always;
              margin: 0;
              border: initial;
              border-radius: initial;
              width: initial;
              min-height: initial;
              box-shadow: initial;
              background: initial;
            }
          }
        </style>
      </head>
      <body>
        <!-- Cover Page -->
        <div class="page cover">
          <div class="cover-decoration circle-big"></div>
          <div class="cover-decoration rect-corner"></div>
          <div class="cover-decoration circle-small-1"></div>
          <div class="cover-decoration circle-small-2"></div>
          
          <div class="cover-content">
            <div class="logo-circle">WT</div>
            <div class="cover-line"></div>
            <h1 class="cover-title">${title}</h1>
            <p class="cover-subtitle">Periode: ${new Date().toLocaleDateString('id-ID', { 
              year: 'numeric', 
              month: 'long' 
            })}</p>
          </div>
          
          <div class="cover-footer">
            <p>WasteTrack</p>
            <p style="font-size: 10px; margin-top: 5px;">Dibuat pada: ${new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        
        <!-- Content Page -->
        <div class="page">
          <div class="header">
            <div class="header-title">${title}</div>
            <div class="header-date">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
          </div>
          
          <div class="content">
            <!-- Ringkasan Eksekutif -->
            <div class="section">
              <div class="section-title">Ringkasan Eksekutif</div>
              <p>${aiAnalysis.executiveSummary || 'Ringkasan eksekutif tidak tersedia'}</p>
            </div>
            
            <!-- Metrik Utama -->
            <div class="section">
              <div class="section-title">Metrik Utama</div>
              ${generateMetricsTable(data.displayedMetrics)}
            </div>
            
            <!-- Analisis Data -->
            <div class="section">
              <div class="section-title">Analisis Data</div>
              <p>${aiAnalysis.dataAnalysis || 'Analisis data tidak tersedia'}</p>
            </div>
            
            <!-- Dampak Lingkungan -->
            <div class="section">
              <div class="section-title">Dampak Lingkungan</div>
              <p>${aiAnalysis.environmentalImpact || 'Analisis dampak lingkungan tidak tersedia'}</p>
            </div>
            
            <!-- Rekomendasi - ENHANCED SECTION -->
            <div class="section">
              <div class="section-title recommendations-title">${role === 'government' ? 'Rekomendasi Kebijakan' : 'Rekomendasi Tindakan'}</div>
              <div class="recommendations-container">
                ${formatRecommendations(aiAnalysis.policyRecommendations)}
              </div>
            </div>
            
            <!-- Proyeksi ke Depan -->
            <div class="section">
              <div class="section-title">Proyeksi ke Depan</div>
              <p>${aiAnalysis.futureProjections || 'Proyeksi ke depan tidak tersedia'}</p>
            </div>
          </div>
          
          <div class="footer-divider"></div>
          <div class="footer">
            <span>WasteTrack</span>
            <span>1 / 1</span>
            <span>${new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };
  
  // Komponen Preview HTML
  const HTMLPreview = () => {
    if (!showPreview || !previewHtml) return null;
    
    const roleColors = {
      government: { primary: 'rgb(16, 185, 129)' },
      industry: { primary: 'rgb(79, 70, 229)' },
      wastebank_master: { primary: 'rgb(59, 130, 246)' },
      wastebank_admin: { primary: 'rgb(245, 158, 11)' }
    };
    
    const primaryColor = roleColors[userRole]?.primary || roleColors.wastebank_admin.primary;
    
    const handleDownloadPdf = () => {
      try {
        const iframe = document.getElementById('preview-iframe');
        if (!iframe) return;
        
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Error printing:", err);
        setError("Gagal mencetak: " + err.message);
      }
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto bg-black bg-opacity-70">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full flex flex-col max-h-[95vh]">
          {/* Header */}
          <div 
            className="sticky top-0 z-10 flex items-center justify-between p-4 border-b" 
            style={{ backgroundColor: primaryColor, color: 'white' }}
          >
            <h2 className="text-xl font-bold">Preview Laporan</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white hover:bg-opacity-80"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                title="Cetak Laporan"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-700 text-white hover:bg-gray-600"
              >
                <span>Tutup</span>
              </button>
            </div>
          </div>
          
          {/* Preview Content */}
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div className="mx-auto bg-white shadow-md" style={{ width: '210mm', minHeight: '100%' }}>
              <iframe 
                id="preview-iframe"
                srcDoc={previewHtml}
                className="w-full h-full min-h-[297mm]"
                style={{ border: 'none' }}
                title="Laporan Preview"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Mengirim data untuk dianalisis oleh AI
      const aiAnalysis = await generateAiReport(reportData, userRole);
      
      // Membuat HTML report
      const htmlReport = generateHtmlReport(reportData, aiAnalysis, userRole);
      
      // Simpan HTML dan tampilkan preview
      setPreviewHtml(htmlReport);
      setShowPreview(true);
      
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Kode return button
  const buttonLabels = {
    government: "Laporan Resmi",
    industry: "Laporan ESG",
    wastebank_master: "Laporan Performa", 
    wastebank_admin: "Laporan Dampak"
  };

  const buttonLabel = buttonLabels[userRole] || "Laporan AI";

  return (
    <>
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 text-white transition-all rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        <span>{isGenerating ? "Membuat Laporan..." : `Preview ${buttonLabel}`}</span>
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
      
      <HTMLPreview />
    </>
  );
};

export default AiReportButton;