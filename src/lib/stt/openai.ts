/**
 * @fileoverview
 * OpenAI Whisper speech-to-text transcription service for the Hinagiku educational platform.
 * 
 * This module provides audio transcription capabilities using OpenAI's Whisper model,
 * specifically configured for educational contexts with Traditional Chinese and English
 * language support. The service is optimized for classroom conversations and
 * educational content.
 * 
 * Features:
 * - High-accuracy transcription using OpenAI's gpt-4o-transcribe model
 * - Multi-language support with Traditional Chinese (Taiwan) as primary language
 * - English as secondary language for mixed-language educational content
 * - Audio format handling for various educational recording scenarios
 * - Post-processing to clean up transcription artifacts
 * 
 * The transcription service includes contextual prompts to improve accuracy
 * for educational terminology and classroom conversations, making it ideal
 * for student voice submissions and teacher feedback scenarios.
 * 
 * @example
 * ```ts
 * import { transcribe } from '$lib/stt/openai';
 * 
 * // Transcribe audio buffer from file upload
 * const audioBuffer = Buffer.from(audioFile);
 * const transcription = await transcribe(audioBuffer);
 * console.log('Transcribed text:', transcription);
 * ```
 */

import { env } from '$env/dynamic/private';
import { OpenAI } from 'openai';

/** 
 * OpenAI client configured with API key and base URL.
 * Uses environment variable for secure API key management.
 */
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1' });

/**
 * Transcribes audio data to text using OpenAI Whisper model.
 * 
 * Processes audio buffers and returns transcribed text optimized for
 * Traditional Chinese (Taiwan) and English educational content. The function
 * includes contextual prompts to improve transcription accuracy for classroom
 * conversations and educational terminology.
 * 
 * @param data - Audio data as Buffer (typically MP3 format)
 * @returns Promise resolving to transcribed text with cleaned formatting
 * @throws Error if transcription fails or returns empty result
 * 
 * @example
 * ```ts
 * const audioBuffer = fs.readFileSync('recording.mp3');
 * const text = await transcribe(audioBuffer);
 * console.log('Student said:', text);
 * ```
 */
export async function transcribe(data: Buffer): Promise<string> {
	const transcription = await openai.audio.transcriptions.create({
		// Contextual prompt for better educational content transcription
		prompt: '請將語音確實轉錄，使用的主要語言為臺灣繁體中文，次要語言為英語。',
		
		// Convert buffer to File object for API compatibility
		file: new File([data], 'audio.mp3', { type: 'audio/mpeg' }),
		
		// Use advanced transcribe model for better accuracy
		model: 'gpt-4o-transcribe'
	});

	if (!transcription) {
		throw new Error('Failed to transcribe audio');
	}

	// Clean up transcription artifacts like beeps and trailing dots
	return transcription.text.replace(/[嗶.…]+$/g, '');
}
