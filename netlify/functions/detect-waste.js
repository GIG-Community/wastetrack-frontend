// netlify/functions/detect-waste.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    
    if (!requestBody.image) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'No image data provided' }),
      };
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Gemini API key not configured' }),
      };
    }

    console.log("🔑 Using Gemini API key:", apiKey.substring(0, 5) + '...');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using the newer gemini-1.5-flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Define waste types with their details including prices
    const wasteTypes = [
      { id: 'kardus-bagus', name: 'Kardus Bagus', category: 'paper', price: 1300 },
      { id: 'kardus-jelek', name: 'Kardus Jelek', category: 'paper', price: 1200 },
      { id: 'koran', name: 'Koran', category: 'paper', price: 3500 },
      { id: 'hvs', name: 'HVS', category: 'paper', price: 2000 },
      { id: 'buram', name: 'Buram', category: 'paper', price: 1000 },
      { id: 'majalah', name: 'Majalah', category: 'paper', price: 1000 },
      { id: 'sak-semen', name: 'Sak Semen', category: 'paper', price: 700 },
      { id: 'duplek', name: 'Duplek', category: 'paper', price: 400 },
      
      { id: 'pet-bening', name: 'PET Bening Bersih', category: 'plastic', price: 4200, related: ['tutup-amdk'] },
      { id: 'pet-biru', name: 'PET Biru Muda Bersih', category: 'plastic', price: 3500, related: ['tutup-amdk'] },
      { id: 'pet-warna', name: 'PET Warna Bersih', category: 'plastic', price: 1200, related: ['tutup-amdk'] },
      { id: 'pet-kotor', name: 'PET Kotor', category: 'plastic', price: 500, related: ['tutup-amdk'] },
      { id: 'pet-jelek', name: 'PET Jelek/Minyak', category: 'plastic', price: 100, related: ['tutup-amdk'] },
      { id: 'pet-galon', name: 'PET Galon Le Minerale', category: 'plastic', price: 1500, related: ['tutup-galon'] },
      
      { id: 'tutup-amdk', name: 'Tutup Botol AMDK', category: 'plastic', price: 2500 },
      { id: 'tutup-galon', name: 'Tutup Galon', category: 'plastic', price: 2000 },
      { id: 'tutup-campur', name: 'Tutup Campur', category: 'plastic', price: 1000 },
      
      { id: 'ps-kaca', name: 'PS Kaca/Yakult/Akrilik', category: 'plastic', price: 1000 },
      { id: 'keping-cd', name: 'Keping CD', category: 'plastic', price: 3500 },
      { id: 'galon-utuh', name: 'Galon Utuh (Aqua/Club)', category: 'plastic', price: 5000, related: ['tutup-galon'] },
      { id: 'bak-hitam', name: 'Bak Hitam', category: 'plastic', price: 3000 },
      { id: 'bak-campur', name: 'Bak Campur (Tanpa Keras)', category: 'plastic', price: 1500 },
      { id: 'plastik-keras', name: 'Plastik Keras', category: 'plastic', price: 200 },
      
      { id: 'plastik-bening', name: 'Plastik Bening', category: 'plastic', price: 800 },
      { id: 'kresek', name: 'Kresek/Bubble Wrap', category: 'plastic', price: 300 },
      { id: 'sablon-tipis', name: 'Sablon Tipis', category: 'plastic', price: 200 },
      { id: 'sablon-tebal', name: 'Sablon Tebal', category: 'plastic', price: 300 },
      { id: 'karung-kecil', name: 'Karung Kecil/Rusak', category: 'plastic', price: 200 },
      { id: 'sachet', name: 'Sachet Metalize', category: 'plastic', price: 50 },
      { id: 'lembaran-campur', name: 'Lembaran Campur', category: 'plastic', price: 50 },
      
      // Metal
      { id: 'besi-tebal', name: 'Besi Tebal', category: 'metal', price: 2500 },
      { id: 'sepeda', name: 'Sepeda/Paku', category: 'metal', price: 1500 },
      { id: 'besi-tipis', name: 'Besi Tipis/Gerabang', category: 'metal', price: 500 },
      { id: 'kaleng', name: 'Kaleng', category: 'metal', price: 1000 },
      { id: 'seng', name: 'Seng', category: 'metal', price: 1000 },
      { id: 'tembaga', name: 'Tembaga', category: 'metal', price: 55000 },
      { id: 'kuningan', name: 'Kuningan', category: 'metal', price: 15000 },
      { id: 'perunggu', name: 'Perunggu', category: 'metal', price: 8000 },
      { id: 'aluminium', name: 'Aluminium', category: 'metal', price: 9000 },
      
      // Glass
      { id: 'botol-bensin', name: 'Botol Bensin Besar', category: 'glass', price: 800 },
      { id: 'botol-bir', name: 'Botol Bir Bintang Besar', category: 'glass', price: 500 },
      { id: 'botol-kecap', name: 'Botol Kecap/Saos Besar', category: 'glass', price: 300 },
      { id: 'botol-bening', name: 'Botol/Beling Bening', category: 'glass', price: 100 },
      { id: 'botol-warna', name: 'Botol/Beling Warna', category: 'glass', price: 50 },
      
      // Sack
      { id: 'karung-100', name: 'Karung Ukuran 100 Kg', category: 'sack', price: 1300 },
      { id: 'karung-200', name: 'Karung Ukuran 200 Kg', category: 'sack', price: 1800 },
      
      // Others
      { id: 'karak', name: 'Karak', category: 'organic', price: 1800 },
      { id: 'gembos', name: 'Gembos', category: 'organic', price: 300 },
      { id: 'jelantah', name: 'Jelantah', category: 'organic', price: 4000 },
      { id: 'kabel', name: 'Kabel Listrik', category: 'others', price: 3000 }
    ];

    // Define bag colors by category for storage recommendations
    const bagColors = {
      'paper': 'biru',
      'plastic': 'kuning',
      'metal': 'merah',
      'glass': 'hijau',
      'organic': 'coklat',
      'others': 'hitam',
      'sack': 'abu-abu',
      'unknown': 'transparan'
    };

    // Create enhanced prompt with detailed instructions
    const prompt = `
      Kamu adalah ahli pengelolaan sampah di Indonesia yang berfokus pada identifikasi dan klasifikasi sampah daur ulang.
      
      Analisis gambar ini dengan teliti dan identifikasi jenis sampah berdasarkan daftar jenis sampah yang diberikan.
      
      Berikan respons dalam format JSON dengan informasi berikut:
      - wasteTypeId: ID jenis sampah dari daftar yang paling cocok dengan sampah dalam gambar
      - confidence: Angka antara 0 dan 1 yang menunjukkan tingkat kepercayaan deteksi
      - price: Harga per kg dalam Rupiah untuk jenis sampah tersebut
      - bagColor: Warna kantong yang direkomendasikan untuk menyimpan sampah ini
      - description: Penjelasan singkat mengapa Anda mengklasifikasikan sampah ini demikian
      - recommendations: Saran praktis (dalam bahasa Indonesia) tentang:
         * Bagaimana cara mempersiapkan/membersihkan sampah ini sebelum didaur ulang
         * Apakah ada bagian yang bisa dipisahkan untuk nilai jual lebih tinggi (misal: tutup botol)
         * Cara penyimpanan yang tepat
      
      Jika tidak dapat mengidentifikasi sampah dengan kepercayaan yang cukup (di bawah 0,5), kembalikan "unknown" sebagai wasteTypeId.
      
      Catatan penting:
      - Untuk sampah botol plastik/PET, selalu berikan saran untuk memisahkan tutupnya karena tutup botol (tutup-amdk/tutup-galon) memiliki nilai jual tersendiri yang lebih tinggi.
      - Untuk sampah kertas, sarankan untuk memastikan tetap kering dan tidak tercampur minyak.
      - Berikan rekomendasi spesifik untuk memaksimalkan nilai jual dan kebersihan sampah.
      - Jika ada jenis sampah yang tidak terdaftar, gunakan "unknown" sebagai wasteTypeId.
      - Jangan gunakan angka pada tips penanganan, jika ada koma tetap gunakan koma.
      - Pisahkan dengan titik antar kalimat, bukan koma antar kalimat.
      - Berikan rekomendasi yang sesuai dengan jenis sampah yang terdeteksi dan penjelasan yang mudah dipahami pengguna
      - Jangan hapus koma agar lebih mudah dibaca
      
      Berikut daftar jenis sampah beserta harganya (Rp/kg) dan kategorinya:
      ${JSON.stringify(wasteTypes, null, 2)}
    `;

    console.log("📸 Processing image data...");

    // Generate content with image
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: requestBody.image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
      }
    });

    const response = result.response;
    const textResponse = response.text();
    
    console.log("📝 Raw Response:", textResponse.substring(0, 100) + "...");
    
    if (!textResponse) {
      throw new Error("Invalid response from Gemini API");
    }

    // Extract JSON object from the response
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                      textResponse.match(/```([\s\S]*?)```/) ||
                      textResponse.match(/{[\s\S]*}/);
    
    let wasteResult;
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[0].replace(/```json\n|```/g, '').trim();
        console.log("📊 Trying to parse JSON:", jsonStr.substring(0, 100) + "...");
        wasteResult = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        
        // Try to extract the waste type ID directly from the text
        const idMatch = textResponse.match(/wasteTypeId["\s:]+([a-z0-9-]+)/i);
        if (idMatch && idMatch[1]) {
          wasteResult = { 
            wasteTypeId: idMatch[1].trim(),
            confidence: 0.7,
            description: "Extracted from text response"
          };
        } else {
          throw new Error("Failed to parse Gemini API response");
        }
      }
    } else {
      // Try to extract the waste type ID directly from the text
      const idMatch = textResponse.match(/wasteTypeId["\s:]+([a-z0-9-]+)/i);
      if (idMatch && idMatch[1]) {
        wasteResult = { 
          wasteTypeId: idMatch[1].trim(),
          confidence: 0.7,
          description: "Extracted from text response"
        };
      } else {
        throw new Error("Could not extract waste type information from API response");
      }
    }

    // Validate that the returned wasteTypeId exists in our waste types
    const allWasteIds = wasteTypes.map(type => type.id);
    
    if (wasteResult.wasteTypeId !== "unknown" && !allWasteIds.includes(wasteResult.wasteTypeId)) {
      console.warn(`Detected waste type "${wasteResult.wasteTypeId}" not found in known types, using "unknown" instead`);
      wasteResult.wasteTypeId = "unknown";
    }

    // Enhance response with additional info if not provided by the model
    if (wasteResult.wasteTypeId !== "unknown") {
      const wasteTypeInfo = wasteTypes.find(type => type.id === wasteResult.wasteTypeId);
      
      if (!wasteResult.price && wasteTypeInfo) {
        wasteResult.price = wasteTypeInfo.price;
      }
      
      if (!wasteResult.bagColor && wasteTypeInfo) {
        wasteResult.bagColor = bagColors[wasteTypeInfo.category] || "transparan";
      }
      
      // Add default recommendations if missing
      if (!wasteResult.recommendations) {
        wasteResult.recommendations = generateDefaultRecommendations(wasteTypeInfo);
      }
    } else {
      // Default values for unknown waste
      wasteResult.price = 0;
      wasteResult.bagColor = "transparan";
      wasteResult.recommendations = "Sampah ini tidak teridentifikasi dengan jelas. Cobalah membersihkan atau memisahkan komponennya dan coba lagi.";
    }

    console.log("✅ Successfully identified waste:", wasteResult.wasteTypeId);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(wasteResult),
    };
  } catch (error) {
    console.error('❌ Error in waste detection:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Error detecting waste',
        error: error.message 
      }),
    };
  }
};

// Helper function to generate default recommendations based on waste type
function generateDefaultRecommendations(wasteType) {
  if (!wasteType) return "Tidak ada rekomendasi untuk sampah yang tidak teridentifikasi.";
  
  let recommendations = "";
  
  switch(wasteType.category) {
    case 'paper':
      recommendations = `
        • Pastikan kertas tetap kering dan bersih dari kontaminasi minyak atau makanan
        • Lipat atau ratakan untuk menghemat ruang penyimpanan
        • Simpan dalam kantong berwarna biru
        • Pisahkan berdasarkan jenisnya (koran, kardus, hvs) untuk nilai jual lebih baik
      `;
      break;
      
    case 'plastic':
      if (wasteType.id.includes('pet') || wasteType.id.includes('botol')) {
        recommendations = `
          • Kosongkan, bilas, dan keringkan botol sebelum disimpan
          • Pisahkan tutup botol (${wasteType.related ? wasteType.related.join(', ') : 'tutup-amdk'}) karena memiliki nilai jual lebih tinggi (Rp 2.000-2.500/kg)
          • Tekan botol untuk menghemat ruang penyimpanan
          • Simpan dalam kantong kuning khusus plastik
        `;
      } else {
        recommendations = `
          • Bersihkan dari kotoran dan residu sebelum disimpan
          • Simpan dalam kantong kuning khusus plastik
          • Pisahkan berdasarkan jenis untuk nilai jual optimal
        `;
      }
      break;
      
    case 'metal':
      recommendations = `
        • Bersihkan dari sisa makanan atau cairan
        • Hati-hati terhadap bagian tajam yang bisa melukai
        • Simpan dalam kantong merah khusus logam
        • ${wasteType.price > 5000 ? 'Jenis logam ini memiliki nilai jual tinggi, simpan dengan aman' : 'Tekan kaleng untuk menghemat ruang'}
      `;
      break;
      
    case 'glass':
      recommendations = `
        • Tangani dengan hati-hati untuk menghindari pecahan
        • Bilas untuk menghilangkan residu
        • Simpan dalam kantong hijau khusus kaca
        • Pisahkan tutup jika ada karena biasanya terbuat dari material berbeda
      `;
      break;
      
    case 'organic':
      recommendations = `
        • Simpan dalam wadah tertutup untuk menghindari bau
        • Idealnya diproses untuk kompos jika memungkinkan
        • Simpan dalam kantong coklat khusus sampah organik
      `;
      break;
      
    default:
      recommendations = `
        • Bersihkan dari kontaminan sebelum disimpan
        • Simpan dalam kantong ${bagColors[wasteType.category] || 'transparan'}
      `;
  }
  
  return recommendations.trim();
}