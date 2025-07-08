/**
 * @fileoverview
 * Speech-to-text transcription API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint provides audio transcription services for educational activities,
 * enabling students to submit voice recordings that are automatically converted
 * to text for analysis and feedback. The service integrates with:
 * - OpenAI Whisper for high-accuracy speech recognition
 * - Object storage for audio file persistence
 * - Metadata tagging for transcription results
 * 
 * Features:
 * - Multi-format audio file support through multipart form data
 * - Automatic transcription using state-of-the-art speech recognition
 * - Secure audio file upload and storage with metadata
 * - Error handling for various audio processing scenarios
 * - RESTful API design for easy integration with frontend components
 * 
 * The endpoint processes audio files, generates transcriptions, stores both
 * the audio and transcription in object storage, and returns URLs for
 * accessing the processed content.
 * 
 * @route POST /api/stt
 * @param {File} file - Audio file in multipart form data format
 * @returns {Object} Transcription text and storage URL or error details
 */

import { upload_object } from '$lib/server/object-storage';
import { transcribe } from '$lib/stt/openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Processes audio files for speech-to-text transcription.
 * 
 * Handles multipart form data uploads, validates audio files,
 * generates transcriptions using OpenAI Whisper, and stores
 * both audio and transcription data in object storage.
 * 
 * @param request - SvelteKit request containing audio file in form data
 * @returns JSON response with transcription text and storage URL or error details
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:5173/api/stt \
 *   -H "Content-Type: multipart/form-data" \
 *   -H "Origin: http://localhost:5173" \
 *   -F "file=@audio.wav"
 * ```
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse multipart form data to extract audio file
		const content_type = request.headers.get('content-type');
		let audio_buffer: Buffer | null = null;

		console.log('Content-Type:', content_type);
		
		// Validate content type and extract audio file
		if (content_type && content_type.includes('multipart/form-data')) {
			const data = await request.formData();
			const file = data.get('file') as File;
			
			console.log('File:', file);
			if (!file) {
				return json({ status: 'error', message: 'No file provided' }, { status: 400 });
			}
			
			// Convert file to buffer for processing
			audio_buffer = Buffer.from(await file.arrayBuffer());
			console.log('Audio Buffer:', audio_buffer);
		} else {
			return json({ status: 'error', message: 'Invalid Content-Type' }, { status: 400 });
		}

		// Generate transcription using OpenAI Whisper
		const transcription = await transcribe(audio_buffer);
		
		// Upload audio file with transcription metadata to object storage
		const url = await upload_object(audio_buffer, 'audio/mpeg', { transcription });
		
		return json({ status: 'success', transcription, url });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};
