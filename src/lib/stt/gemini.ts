/**
 * @fileoverview
 * Google Gemini speech-to-text transcription service for the Hinagiku educational platform.
 * 
 * This module provides an alternative audio transcription implementation using Google's
 * Gemini AI model for speech recognition. It serves as a backup or alternative to
 * OpenAI Whisper, offering different transcription characteristics and potentially
 * better performance for certain audio types or languages.
 * 
 * Features:
 * - Google Gemini AI model for speech recognition
 * - Structured output with schema validation using Zod
 * - Optimized for Traditional Chinese (Taiwan) and English content
 * - Base64 data URL encoding for audio transmission
 * - Temperature and top-P configuration for consistent transcription
 * - Post-processing to remove transcription artifacts
 * 
 * The service uses lower temperature settings for more deterministic transcription
 * results, making it suitable for educational content where accuracy is paramount.
 * 
 * @example
 * ```ts
 * import { transcribe } from '$lib/stt/gemini';
 * 
 * // Transcribe audio buffer using Gemini
 * const audioBuffer = Buffer.from(audioFile);
 * const transcription = await transcribe(audioBuffer);
 * console.log('Gemini transcription:', transcription);
 * ```
 */

import { asrModel, z } from '$lib/ai';

/**
 * Transcribes audio data to text using Google Gemini AI model.
 * 
 * Converts audio buffer to base64 data URL and processes it through
 * Google's Gemini model with structured output validation. The function
 * is configured for educational content with Traditional Chinese as the
 * primary language and English as secondary.
 * 
 * @param data - Audio data as Buffer (WAV format preferred)
 * @returns Promise resolving to transcribed text with cleaned formatting
 * @throws Error if transcription fails or returns empty result
 * 
 * @example
 * ```ts
 * const audioBuffer = fs.readFileSync('recording.wav');
 * const text = await transcribe(audioBuffer);
 * console.log('Student response:', text);
 * ```
 */
export async function transcribe(data: Buffer): Promise<string> {
	// Convert audio buffer to base64 data URL for Gemini API
	const dataurl = `data:audio/wav;base64,${data.toString('base64')}`;
	
	// Generate transcription using Gemini ASR model
	const { output } = await asrModel.generate({
		// System prompt for Traditional Chinese (Taiwan) transcription
		system: '(zh-tw)請將語音確實轉錄，使用的主要語言為臺灣繁體中文，次要語言為英語。',
		
		// Prompt with media input for audio transcription
		prompt: [{ text: '' }, { media: { url: dataurl } }],
		
		// Structured output schema for validation
		output: {
			schema: z.object({
				transcription: z.string()
			})
		},
		
		// Low temperature for consistent, deterministic results
		config: { temperature: 0.1, topP: 0.5 }
	});

	if (!output) {
		throw new Error('Failed to transcribe audio');
	}

	// Clean up transcription artifacts like beeps and trailing dots
	return output.transcription.replace(/[嗶.…]+$/g, '');
}
