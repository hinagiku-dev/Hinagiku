/**
 * @fileoverview
 * Hugging Face Whisper speech-to-text transcription service for the Hinagiku educational platform.
 * 
 * This module provides audio transcription using a specialized Whisper model hosted on
 * Hugging Face, specifically fine-tuned for Traditional Chinese (Taiwan) speech recognition.
 * It offers an alternative transcription service with models optimized for regional
 * language variants and educational content.
 * 
 * Features:
 * - Fine-tuned Whisper model for Traditional Chinese (Taiwan)
 * - Hugging Face Inference API for scalable transcription
 * - Model caching control for consistent performance
 * - Configurable model selection for different use cases
 * - Direct audio buffer processing without format conversion
 * - Error handling for API failures and network issues
 * 
 * The service uses a specialized model (JacobLinCool/whisper-large-v3-turbo-common_voice_19_0-zh-TW)
 * that has been trained on Common Voice 19.0 dataset for Traditional Chinese,
 * providing potentially better accuracy for Taiwan Mandarin speech patterns.
 * 
 * @example
 * ```ts
 * import { transcribe } from '$lib/stt/hf-whisper';
 * 
 * // Use default model
 * const transcription = await transcribe(audioBuffer);
 * 
 * // Use custom model
 * const customTranscription = await transcribe(
 *   audioBuffer, 
 *   'your-hf-token', 
 *   'custom/whisper-model'
 * );
 * ```
 */

import { env } from '$env/dynamic/private';

/**
 * Transcribes audio data using Hugging Face Whisper model.
 * 
 * Sends audio data to Hugging Face Inference API using a specialized
 * Whisper model fine-tuned for Traditional Chinese (Taiwan). The function
 * handles API authentication, caching control, and error management.
 * 
 * @param data - Audio data as Buffer (various formats supported)
 * @param token - Hugging Face API token (defaults to environment variable)
 * @param model - Model identifier on Hugging Face Hub (defaults to Taiwan-specific Whisper)
 * @returns Promise resolving to transcribed text with trimmed whitespace
 * @throws Error if API request fails or returns error status
 * 
 * @example
 * ```ts
 * // Basic usage with defaults
 * const text = await transcribe(audioBuffer);
 * 
 * // Custom model for specific domain
 * const medicalText = await transcribe(
 *   audioBuffer,
 *   process.env.HF_TOKEN,
 *   'medical/whisper-taiwan'
 * );
 * ```
 */
export async function transcribe(
	data: Buffer,
	token = env.HUGGINGFACE_TOKEN,
	model = 'JacobLinCool/whisper-large-v3-turbo-common_voice_19_0-zh-TW'
): Promise<string> {
	// Send transcription request to Hugging Face Inference API
	const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'x-wait-for-model': 'true', // Wait for model to load if needed
			'x-use-cache': 'false' // Disable caching for real-time transcription
		},
		method: 'POST',
		body: data
	});

	// Check for API errors
	if (!response.ok) {
		throw new Error(`Failed to transcribe audio: ${response.statusText}`);
	}
	
	// Parse response and extract transcription text
	const result: { text: string } = await response.json();
	return result.text.trim();
}
