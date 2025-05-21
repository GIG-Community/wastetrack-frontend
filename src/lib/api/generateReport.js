async function generateAiReport(visualData, role = 'government') {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    // Buat prompt berdasarkan peran pengguna
    let prompt = "";
    
    if (role === 'government') {
      prompt = `
        Anda adalah konsultan ahli pengelolaan sampah dan kebijakan lingkungan yang memberi saran kepada lembaga pemerintah.
        
        Analisis data dashboard pengelolaan sampah berikut dan buat laporan dampak lingkungan yang komprehensif:
        
        METRIK LINGKUNGAN UTAMA:
        ${JSON.stringify(visualData.displayedMetrics, null, 2)}
        
        DATA DISTRIBUSI SAMPAH:
        ${JSON.stringify(visualData.wasteDistribution, null, 2)}
        
        INFORMASI FASILITAS:
        ${JSON.stringify(visualData.mapData, null, 2)}
        
        TREN KINERJA:
        ${JSON.stringify(visualData.performanceTrends, null, 2)}
        
        Berdasarkan data ini, buat laporan dampak lingkungan pemerintah dengan bagian-bagian berikut:
        1. Ringkasan Eksekutif (3-5 kalimat menyoroti pencapaian utama dan dampak lingkungan)
        2. Analisis Data (analisis pola pengelolaan sampah dan metrik utama)
        3. Penilaian Dampak Lingkungan (kuantifikasi manfaat lingkungan yang ditunjukkan dalam metrik)
        4. Rekomendasi Kebijakan (3-5 rekomendasi kebijakan spesifik yang dapat ditindaklanjuti untuk pemerintah)
        5. Proyeksi Masa Depan (berdasarkan tren saat ini, apa hasil masa depan yang dapat diharapkan)
      `;
    } else if (role === 'industry') {
      prompt = `
        Anda adalah konsultan ahli ESG (Lingkungan, Sosial, dan Tata Kelola) untuk sektor industri daur ulang.
        
        Analisis data dashboard pengelolaan sampah industri berikut dan buat laporan ESG yang komprehensif:
        
        METRIK LINGKUNGAN UTAMA:
        ${JSON.stringify(visualData.displayedMetrics, null, 2)}
        
        DATA DISTRIBUSI SAMPAH:
        ${JSON.stringify(visualData.wasteDistribution, null, 2)}
        
        INFORMASI FASILITAS:
        ${JSON.stringify(visualData.mapData, null, 2)}
        
        TREN KINERJA:
        ${JSON.stringify(visualData.performanceTrends, null, 2)}
        
        Berdasarkan data ini, buat laporan ESG industri dengan bagian-bagian berikut:
        1. Ringkasan Eksekutif (3-5 kalimat menyoroti pencapaian utama dan dampak lingkungan industri)
        2. Analisis Data (analisis pola pengelolaan sampah dan kinerja pengolahan daur ulang)
        3. Penilaian Dampak Lingkungan (kuantifikasi manfaat lingkungan dari operasi daur ulang)
        4. Rekomendasi Tindakan (3-5 rekomendasi praktis untuk meningkatkan kinerja ESG)
        5. Proyeksi Masa Depan (berdasarkan tren saat ini, bagaimana operasi dapat ditingkatkan)
      `;
    } else if (role === 'wastebank_master') {
      prompt = `
        Anda adalah konsultan ahli bisnis dan keberlanjutan yang memberikan wawasan kepada bank sampah induk.
        
        Analisis data dashboard bank sampah induk berikut dan buat laporan kinerja yang komprehensif:
        
        METRIK LINGKUNGAN UTAMA:
        ${JSON.stringify(visualData.displayedMetrics, null, 2)}
        
        DATA DISTRIBUSI SAMPAH:
        ${JSON.stringify(visualData.wasteDistribution, null, 2)}
        
        INFORMASI FASILITAS:
        ${JSON.stringify(visualData.mapData, null, 2)}
        
        TREN KINERJA:
        ${JSON.stringify(visualData.performanceTrends, null, 2)}
        
        Berdasarkan data ini, buat laporan kinerja bank sampah induk dengan bagian-bagian berikut:
        1. Ringkasan Eksekutif (3-5 kalimat menyoroti pencapaian utama bank sampah induk)
        2. Analisis Data (analisis pola pengumpulan sampah, distribusi jenis sampah, dan tren nilai ekonomi)
        3. Penilaian Dampak Lingkungan (dampak positif bank sampah induk terhadap lingkungan)
        4. Rekomendasi Tindakan (3-5 rekomendasi untuk meningkatkan operasional dan pendapatan)
        5. Proyeksi Masa Depan (potensi pertumbuhan dan perkembangan)
      `;
    } else if (role === 'wastebank_admin') {
      prompt = `
        Anda adalah konsultan untuk bank sampah unit lokal yang memberikan wawasan operasional.
        
        Analisis data dashboard bank sampah unit berikut dan buat laporan kinerja yang komprehensif:
        
        METRIK LINGKUNGAN UTAMA:
        ${JSON.stringify(visualData.displayedMetrics, null, 2)}
        
        DATA DISTRIBUSI SAMPAH:
        ${JSON.stringify(visualData.wasteDistribution, null, 2)}
        
        INFORMASI FASILITAS:
        ${JSON.stringify(visualData.mapData, null, 2)}
        
        TREN KINERJA:
        ${JSON.stringify(visualData.performanceTrends, null, 2)}
        
        Berdasarkan data ini, buat laporan kinerja bank sampah unit dengan bagian-bagian berikut:
        1. Ringkasan Eksekutif (3-5 kalimat menyoroti pencapaian unit dan dampak komunitas)
        2. Analisis Data (analisis pola pengumpulan sampah dan efisiensi operasional)
        3. Penilaian Dampak Lingkungan (dampak bank sampah unit pada lingkungan sekitar)
        4. Rekomendasi Tindakan (3-5 rekomendasi praktis untuk meningkatkan operasi dan layanan)
        5. Proyeksi Masa Depan (potensi pertumbuhan dan pengembangan layanan)
      `;
    }
    
    // Tambahkan format respons untuk semua peran
    prompt += `
      
      Format respons Anda sebagai JSON teks biasa seperti ini:
      {
        "executiveSummary": "Ringkasan eksekutif Anda di sini...",
        "dataAnalysis": "Analisis data Anda di sini...",
        "environmentalImpact": "Penilaian dampak lingkungan Anda di sini...", 
        "policyRecommendations": "Rekomendasi Anda di sini...",
        "futureProjections": "Proyeksi masa depan Anda di sini..."
      }
      
      JANGAN gunakan format markdown, blok kode, atau format khusus lainnya. Kembalikan HANYA objek JSON.
    `;
    
    // Perbarui endpoint untuk menggunakan model gemini-2.0-flash
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 4000,
      }
    };

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)

    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }
    
    // Improved JSON extraction and parsing
    try {
      // First, try direct parsing in case the API returns clean JSON
      return JSON.parse(textResponse);
    } catch (error) {
      console.log("Initial JSON parsing failed, trying to extract JSON from text");
      
      // Clean up the response to extract just the JSON part
      let cleanedResponse = textResponse;
      
      // Remove markdown code blocks if present
      if (cleanedResponse.includes("```json")) {
        cleanedResponse = cleanedResponse.replace(/```json\n|\n```/g, "");
      } else if (cleanedResponse.includes("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n|\n```/g, "");
      }
      
      // Try to find JSON object boundaries
      const jsonStartIndex = cleanedResponse.indexOf('{');
      const jsonEndIndex = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonString = cleanedResponse.substring(jsonStartIndex, jsonEndIndex);
        try {
          return JSON.parse(jsonString);
        } catch (innerError) {
          console.error("Failed to parse extracted JSON:", innerError);
        }
      }
      
      // Jika semua upaya parsing gagal, kembalikan fallback terstruktur berdasarkan peran
      const fallbacks = {
        government: {
          executiveSummary: "Berdasarkan data yang ditampilkan, sistem pengelolaan sampah telah mencapai pengurangan emisi karbon yang signifikan dan menghemat sumber daya alam penting.",
          dataAnalysis: "Analisis data menunjukkan pola pengelolaan sampah yang efektif dengan berbagai jenis sampah terkelola dengan baik.",
          environmentalImpact: "Dampak lingkungan positif terlihat dari pengurangan emisi karbon, penghematan air, dan perlindungan terhadap pohon.",
          policyRecommendations: "Pemerintah disarankan untuk memperluas jaringan bank sampah, memberikan insentif untuk daur ulang, dan melakukan kampanye edukasi masyarakat.",
          futureProjections: "Dengan tren saat ini, diproyeksikan akan ada peningkatan berkelanjutan dalam pengurangan emisi karbon dan nilai ekonomi dari sampah yang dikelola."
        },
        industry: {
          executiveSummary: "Operasi daur ulang industri telah berkontribusi positif terhadap pengurangan emisi karbon dan pemanfaatan sumber daya.",
          dataAnalysis: "Data menunjukkan efisiensi operasional yang baik dengan berbagai jenis sampah dikelola secara efektif untuk daur ulang.",
          environmentalImpact: "Aktivitas daur ulang industri telah menghasilkan pengurangan emisi karbon dan penghematan sumber daya alam yang signifikan.",
          policyRecommendations: "Industri disarankan untuk mengoptimalkan proses daur ulang, meningkatkan efisiensi energi, dan memperluas jangkauan pengumpulan.",
          futureProjections: "Tren positif menunjukkan potensi untuk ekspansi dan peningkatan efisiensi operasional di masa depan."
        },
        wastebank_master: {
          executiveSummary: "Bank sampah induk telah menunjukkan kinerja yang solid dalam pengelolaan dan distribusi sampah ke berbagai outlet daur ulang.",
          dataAnalysis: "Data menunjukkan volume pengumpulan sampah yang konsisten dengan distribusi yang baik antara berbagai jenis material.",
          environmentalImpact: "Operasi bank sampah induk berkontribusi pada pengurangan emisi karbon dan pengurangan sampah di TPA.",
          policyRecommendations: "Bank sampah induk disarankan untuk meningkatkan efisiensi logistik, memperluas jaringan bank sampah unit, dan meningkatkan kolaborasi dengan industri.",
          futureProjections: "Potensi pertumbuhan terlihat menjanjikan dengan peningkatan kesadaran masyarakat dan permintaan untuk layanan pengelolaan sampah berkelanjutan."
        },
        wastebank_admin: {
          executiveSummary: "Bank sampah unit telah berhasil memobilisasi komunitas lokal dalam pengumpulan dan pemilahan sampah untuk daur ulang.",
          dataAnalysis: "Data menunjukkan partisipasi masyarakat yang baik dengan volume pengumpulan yang konsisten pada berbagai jenis sampah.",
          environmentalImpact: "Kegiatan bank sampah unit telah mengurangi sampah di TPA lokal dan berkontribusi pada pengurangan emisi karbon.",
          policyRecommendations: "Bank sampah unit disarankan untuk meningkatkan kesadaran masyarakat, memperluas jangkauan layanan, dan meningkatkan efisiensi pemilahan.",
          futureProjections: "Potensi untuk pertumbuhan dan dampak komunitas yang lebih besar terlihat dari tren positif dalam partisipasi dan volume pengumpulan."
        }
      };
      
      return fallbacks[role] || fallbacks.government;
    }
  } catch (error) {
    console.error("Error generating AI report:", error);
    throw error;
  }
}

export default generateAiReport;