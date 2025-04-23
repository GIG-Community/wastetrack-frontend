// src/lib/api/gemini.js
import { wasteTypes, WASTE_CATEGORIES } from '../constants';

/**
 * Analyzes an image using Google's Gemini API to detect waste type
 * @param {string} base64Image - Base64-encoded image data
 * @returns {Promise<{wasteTypeId: string, confidence: number, description: string}>} Detection result
 */
export async function analyzeWasteImage(base64Image) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    // Create waste types information for the AI to reference
    const wasteTypeInfo = wasteTypes.flatMap(category => {
      if (category.subcategories) {
        return category.subcategories.flatMap(subcategory => 
          subcategory.types.map(type => ({
            id: type.id,
            name: type.name,
            category: category.id,
            subcategory: subcategory.name
          }))
        );
      } else {
        return category.types.map(type => ({
          id: type.id,
          name: type.name,
          category: category.id
        }));
      }
    });

    const prompt = `
      You are a waste classification expert. Analyze this image and identify what type of waste it is.
      The waste should be classified into one of these categories:
      ${JSON.stringify(wasteTypeInfo, null, 2)}
      
      Provide your response in JSON format with these fields:
      - wasteTypeId: The ID of the specific waste type
      - confidence: A number between 0 and 1 indicating your confidence
      - description: A brief explanation of why you classified it this way
      
      If you cannot identify the waste with reasonable confidence, return "unknown" as the wasteTypeId.
    `;

    const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent";
    
    const payload = {
      contents: [{
        role: "user",
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generation_config: {
        temperature: 0.1,
        max_output_tokens: 800,
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
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the JSON response from the text
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Invalid response from Gemini API");
    }

    // Extract JSON object from the response if it's embedded in text
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                      textResponse.match(/{[\s\S]*}/);
    
    let result;
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, '').trim());
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        throw new Error("Failed to parse Gemini API response");
      }
    } else {
      // Try to extract the waste type ID directly from the text
      const idMatch = textResponse.match(/wasteTypeId["\s:]+([a-z0-9-]+)/i);
      if (idMatch && idMatch[1]) {
        result = { 
          wasteTypeId: idMatch[1].trim(),
          confidence: 0.7,
          description: "Extracted from text response"
        };
      } else {
        throw new Error("Could not extract waste type information from API response");
      }
    }

    // Validate that the returned wasteTypeId exists in our constants
    const allWasteIds = wasteTypeInfo.map(type => type.id);
    
    if (result.wasteTypeId !== "unknown" && !allWasteIds.includes(result.wasteTypeId)) {
      console.warn(`Detected waste type "${result.wasteTypeId}" not found in known types, using "unknown" instead`);
      result.wasteTypeId = "unknown";
    }

    return result;
  } catch (error) {
    console.error("Error analyzing waste image:", error);
    return { wasteTypeId: "unknown", confidence: 0, description: error.message };
  }
}

/**
 * Tests the Gemini API connection with a simple text prompt
 * @param {string} prompt - Text prompt to send to Gemini
 * @returns {Promise<{success: boolean, text: string}>} Response from Gemini
 */
export async function testGeminiApi(prompt) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 800,
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
    
    return {
      success: true,
      text: textResponse || "API returned successful but empty response"
    };
  } catch (error) {
    console.error("Error testing Gemini API:", error);
    return {
      success: false,
      text: error.message
    };
  }
}