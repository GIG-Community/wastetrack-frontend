// src/lib/api/wasteDetection.js
import { analyzeWasteImage, testGeminiApi } from './gemini';

/**
 * Handles the waste detection request using Gemini API
 * 
 * @param {Object} requestData - The request data containing the image
 * @param {string} requestData.image - Base64-encoded image data
 * @returns {Promise<Object>} Detection result with waste type ID and confidence
 */
export async function detectWaste(requestData) {
  if (!requestData.image) {
    throw new Error('No image provided for waste detection');
  }
  
  try {
    const result = await analyzeWasteImage(requestData.image);
    return result;
  } catch (error) {
    console.error('Error in waste detection:', error);
    throw error;
  }
}

/**
 * Tests the Gemini API connection
 * 
 * @param {Object} requestData - The request data
 * @param {string} requestData.prompt - Test prompt to send to Gemini
 * @returns {Promise<Object>} Test result
 */
export async function testGeminiConnection(requestData) {
  const prompt = requestData.prompt || 'What are 3 types of recyclable waste?';
  try {
    return await testGeminiApi(prompt);
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    throw error;
  }
}