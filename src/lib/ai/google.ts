/**
 * Google AI Integration Module
 * 
 * This module configures and exports the Google Gemini Flash model integration
 * for the Hinagiku educational platform. Gemini Flash excels at multimodal
 * understanding, making it ideal for document processing, image analysis,
 * and speech recognition in educational contexts.
 * 
 * Primary Use Cases:
 * - PDF document analysis and content extraction
 * - Automatic Speech Recognition (ASR) for multilingual content
 * - Image and multimedia content processing
 * - Fast response generation for real-time interactions
 * 
 * Gemini Flash is optimized for speed and efficiency while maintaining
 * high-quality multimodal understanding capabilities essential for
 * comprehensive educational technology solutions.
 * 
 * @fileoverview Google Gemini Flash model integration for multimodal educational AI
 */

import { env } from '$env/dynamic/private';
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

/**
 * Google Gemini Flash model instance configured for multimodal educational tasks.
 * 
 * This model specializes in:
 * - Rapid document analysis and content summarization
 * - Speech-to-text conversion for discussion transcription
 * - Multimodal content understanding (text, images, audio)
 * - Efficient real-time processing for interactive features
 * 
 * The model leverages Google's advanced AI capabilities with secure
 * API key management and is optimized for educational workloads.
 */
export const GoogleGeminiFlash = genkit({
	plugins: [googleAI({ apiKey: env.GOOGLE_GENAI_API_KEY })],
	model: gemini15Flash
});
