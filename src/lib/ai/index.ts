/**
 * AI Model Integration Hub
 * 
 * This module serves as the central configuration point for AI model integrations
 * in the Hinagiku educational platform. It manages different AI models for various
 * purposes including chat interactions, document processing, and speech recognition.
 * 
 * Model Assignments:
 * - Chat Model: OpenAI GPT-4 Mini - Primary conversational AI for student interactions
 * - PDF Model: Google Gemini Flash - Document analysis and content extraction
 * - ASR Model: Google Gemini Flash - Automatic Speech Recognition for voice features
 * 
 * This centralized approach allows for easy model switching and optimization
 * based on specific use cases and performance requirements.
 * 
 * @fileoverview Central AI model configuration and integration hub
 */

import { GoogleGeminiFlash } from './google';
import { OpenAIGpt41Mini } from './openai';

// Re-export Zod for schema validation in AI interactions
export { z } from 'zod';

// Re-export all Google AI integrations
export * from './google';

// Re-export all OpenAI integrations  
export * from './openai';

/** 
 * Primary chat model for student-AI interactions.
 * OpenAI GPT-4 Mini provides balanced performance and cost efficiency
 * for educational conversations and learning guidance.
 */
export const chatModel = OpenAIGpt41Mini;

/** 
 * Document processing model for PDF analysis and content extraction.
 * Google Gemini Flash excels at multimodal document understanding
 * and can process educational materials effectively.
 */
export const pdfModel = GoogleGeminiFlash;

/** 
 * Automatic Speech Recognition model for voice-to-text conversion.
 * Google Gemini Flash provides reliable speech recognition for
 * multilingual educational content and discussion transcription.
 */
export const asrModel = GoogleGeminiFlash;
