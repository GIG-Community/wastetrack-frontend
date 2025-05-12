import { jsPDF } from "jspdf";
import { applyPlugin } from 'jspdf-autotable'; // Use applyPlugin for consistency
import moment from 'moment';
import axios from 'axios';

/**
 * Generates an AI-enhanced PDF report using the Gemini API
 * 
 * @param {Object} reportData Data to include in the report
 * @param {string} dateRange The date range of the report ("month", "quarter", "year")
 * @param {Object} userData User data containing name and organization details
 * @returns {Promise<Blob>} A promise that resolves to the PDF file as a Blob
 */
export async function generateAIReport(reportData, dateRange, userData) {
  try {
    // First, get AI-generated insights about the data
    const insights = await getAIInsights(reportData, dateRange);
    
    // Create PDF with those insights
    const pdfBlob = await createPDFReport(reportData, dateRange, userData, insights);
    return pdfBlob;
  } catch (error) {
    console.error("Error generating AI report:", error);
    throw new Error("Failed to generate AI report: " + error.message);
  }
}

/**
 * Fetches AI-generated insights about the waste data
 * 
 * @param {Object} reportData The report data to analyze
 * @param {string} dateRange The time period being analyzed
 * @returns {Promise<Object>} AI-generated insights
 */
async function getAIInsights(reportData, dateRange) {
  try {
    // Format the data for the AI to analyze
    const dataForAI = {
      dateRange,
      totalRevenue: reportData.financialStats.totalRevenue,
      totalWeight: reportData.collectionStats.totalWeight,
      carbonReduction: reportData.impactStats.carbonReduced,
      wasteDistribution: reportData.wasteTypeDistribution,
      revenueGrowth: reportData.financialStats.revenueGrowth,
      monthlyTrends: reportData.monthlyTrends
    };

    // Prepare the prompt for Gemini
    const prompt = `
      As a waste management analytics expert, analyze the following data from a waste bank 
      for the last ${dateRange}:
      
      - Total Revenue: ${dataForAI.totalRevenue} IDR
      - Total Weight Collected: ${dataForAI.totalWeight.toFixed(1)} kg
      - Carbon Reduction: ${dataForAI.carbonReduction.toFixed(1)} kg CO₂
      - Revenue Growth: ${dataForAI.revenueGrowth.toFixed(1)}%
      
      Waste distribution:
      ${dataForAI.wasteDistribution.map(w => `- ${w.name}: ${w.weight.toFixed(1)} kg`).join('\n')}
      
      Monthly trends:
      ${dataForAI.monthlyTrends.map(m => `- ${m.month}: ${m.weight.toFixed(1)} kg, ${m.revenue} IDR`).join('\n')}
      
      Please provide:
      1. A brief summary of performance (2-3 sentences)
      2. Three key insights from the data
      3. Two specific recommendations for improvement
      4. One environmental impact statement
      
      Format your response as a JSON object with the following structure:
      {
        "summary": "Summary text here",
        "insights": ["Insight 1", "Insight 2", "Insight 3"],
        "recommendations": ["Recommendation 1", "Recommendation 2"],
        "environmentalImpact": "Impact statement here"
      }
    `;

    // CRITICAL: Hardcode the API URL to your Next.js server's port (e.g., 3000)
    const apiUrl = 'http://localhost:3000/api/gemini'; // ADJUST PORT IF NECESSARY
    console.log(`Attempting API call to: ${apiUrl}. Ensure Next.js server is on this port.`);
    const response = await axios.post(apiUrl, { // Using the hardcoded URL
      prompt: prompt
    });

    // Parse and return the AI-generated insights
    const aiData = response.data;
    if (typeof aiData === 'string') {
        // If AI returns a string, try to parse it.
        // This can happen if the AI doesn't strictly follow the JSON instruction.
        try {
            return JSON.parse(aiData);
        } catch (e) {
            console.error("AI response was a string but not valid JSON:", aiData);
            // Fallback if parsing fails
            return {
                summary: "AI analysis could not be parsed. " + aiData.substring(0, 100) + "...",
                insights: ["Could not parse AI insights."],
                recommendations: ["Could not parse AI recommendations."],
                environmentalImpact: "Environmental impact statement unavailable due to parsing error."
            };
        }
    }
    return aiData; // Assuming it's already a parsed JSON object
  } catch (error) {
    console.error("Error getting AI insights:", error);
    // Ensure fallback insights have all expected keys to prevent 'undefined' errors later
    return {
      summary: "This report summarizes waste collection activities for the selected period. (AI analysis failed)",
      insights: [
        "Your waste bank has been collecting various types of recyclable materials.",
        "The data shows patterns in waste collection over time.",
        "Revenue fluctuates based on waste types and market conditions."
      ],
      recommendations: [
        "Consider focusing on high-value waste materials to increase revenue.",
        "Implement regular collection schedules to improve consistency."
      ],
      environmentalImpact: `Your recycling efforts have prevented approximately ${reportData.impactStats.carbonReduced.toFixed(1)} kg of CO₂ emissions. (AI analysis failed)`
    };
  }
}

/**
 * Creates a PDF report with the data and AI insights
 * 
 * @param {Object} reportData The report data
 * @param {string} dateRange The date range
 * @param {Object} userData User data
 * @param {Object} insights AI-generated insights (guaranteed to be an object)
 * @returns {Promise<Blob>} The generated PDF as a Blob
 */
async function createPDFReport(reportData, dateRange, userData, insights) {
  return new Promise((resolve, reject) => {
    try {
      console.log("createPDFReport: Initializing jsPDF.");
      const doc = new jsPDF();
      
      console.log("createPDFReport: Applying jspdf-autotable plugin.");
      applyPlugin(doc); // Use applyPlugin

      if (typeof doc.autoTable !== 'function') {
        const errorMsg = "createPDFReport: doc.autoTable is still not a function after applyPlugin.";
        console.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }
      console.log("createPDFReport: doc.autoTable is a function.");

      if (!doc.internal || !doc.internal.pageSize) {
        const errorMsg = "createPDFReport: jsPDF instance is not correctly initialized (no internal.pageSize).";
        console.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }
      console.log("createPDFReport: jsPDF instance seems valid, proceeding with page size.");

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
      doc.text('Waste Bank Report', margin, 25);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${moment().format('MMMM D, YYYY')}`, margin, 35);
      doc.text(`Date Range: ${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}`, pageWidth - margin - 50, 35, { align: 'right' });
      
      // Add organization info
      if (userData?.organization) {
        doc.text(`Organization: ${userData.organization}`, margin, 35);
      }
      
      y = 50;
      
      // Add AI insights section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('AI-Powered Analysis', margin, y);
      
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Add AI summary
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'FD');
      
      y += 10;
      doc.setFontSize(10);
      const summaryText = insights && insights.summary ? insights.summary : "Summary not available.";
      const splitSummary = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 10);
      doc.text(splitSummary, margin + 5, y);
      
      y += splitSummary.length * 6 + 10;
      
      // Add insights
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Insights', margin, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const insightsArray = insights && Array.isArray(insights.insights) ? insights.insights : ["Insights not available."];
      insightsArray.forEach((insight, index) => {
        const insightText = `${index + 1}. ${insight}`;
        const splitInsight = doc.splitTextToSize(insightText, pageWidth - margin * 2 - 10);
        doc.text(splitInsight, margin + 5, y);
        y += splitInsight.length * 6 + 5;
      });
      
      y += 5;
      
      // Add recommendations
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations', margin, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const recommendationsArray = insights && Array.isArray(insights.recommendations) ? insights.recommendations : ["Recommendations not available."];
      recommendationsArray.forEach((recommendation, index) => {
        const recText = `${index + 1}. ${recommendation}`;
        const splitRec = doc.splitTextToSize(recText, pageWidth - margin * 2 - 10);
        doc.text(splitRec, margin + 5, y);
        y += splitRec.length * 6 + 5;
      });
      
      y += 5;
      
      // Check if we need a new page
      if (y > pageHeight - 70) {
        doc.addPage();
        y = margin;
      }
      
      // Add summary section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Summary', margin, y);
      
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Add stats in a nice layout
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 3, 3, 'FD');
      
      y += 10;
      console.log("createPDFReport: Before setting font for 'Total Revenue'. Current y:", y);
      doc.setFont('helvetica', 'bold'); 
      console.log("createPDFReport: Font set to helvetica bold.");
      doc.text('Total Revenue:', margin + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${reportData.financialStats.totalRevenue.toLocaleString()}`, margin + 60, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total Weight:', margin + pageWidth/2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reportData.collectionStats.totalWeight.toFixed(1)} kg`, margin + pageWidth/2 + 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Completed Pickups:', margin + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reportData.collectionStats.completedPickups}`, margin + 60, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Average Price:', margin + pageWidth/2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${reportData.financialStats.averagePerKg.toLocaleString()}/kg`, margin + pageWidth/2 + 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Carbon Reduction:', margin + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reportData.impactStats.carbonReduced.toFixed(1)} kg CO₂`, margin + 60, y);
      
      y += 20;
      
      // Add waste distribution table
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Waste Distribution', margin, y);
      y += 10;
      
      const wasteColumns = [
        { header: 'Waste Type', dataKey: 'name' },
        { header: 'Weight (kg)', dataKey: 'weight' },
        { header: 'Revenue (Rp)', dataKey: 'revenue' },
        { header: 'Avg. Price (Rp/kg)', dataKey: 'averagePrice' }
      ];
      
      const wasteRows = reportData.revenueByWasteType.map(waste => ({
        ...waste,
        weight: waste.weight.toFixed(1),
        revenue: waste.revenue.toLocaleString(),
        averagePrice: waste.averagePrice.toLocaleString()
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
      
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Trends', margin, y);
      y += 10;
      
      const trendColumns = [
        { header: 'Month', dataKey: 'month' },
        { header: 'Weight (kg)', dataKey: 'weight' },
        { header: 'Revenue (Rp)', dataKey: 'revenue' },
        { header: 'Pickups', dataKey: 'pickups' },
        { header: 'CO₂ Reduction (kg)', dataKey: 'carbon' }
      ];
      
      const trendRows = reportData.monthlyTrends.map(trend => ({
        ...trend,
        weight: trend.weight.toFixed(1),
        revenue: trend.revenue.toLocaleString(),
        carbon: (trend.weight * 2.0).toFixed(1) // Using same calculation as in chart
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
      
      // Add environmental impact footer
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
      doc.text('Environmental Impact', margin + 10, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Use the AI-generated environmental impact statement
      const envImpactText = insights && insights.environmentalImpact ? insights.environmentalImpact : "Environmental impact statement not available.";
      const impactText = doc.splitTextToSize(envImpactText, pageWidth - margin * 2 - 20);
      doc.text(impactText, margin + 10, y);
      
      // Create blob and resolve
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (pdfError) {
      console.error("Error during PDF creation in createPDFReport:", pdfError);
      reject(pdfError);
    }
  });
}

export default generateAIReport;
