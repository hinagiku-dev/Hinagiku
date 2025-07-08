/**
 * @fileoverview
 * Audio conversion utilities for the Hinagiku educational platform.
 * 
 * This module provides client-side audio format conversion capabilities using
 * FFmpeg WebAssembly. It enables the platform to handle various audio formats
 * and convert them to standardized formats for speech recognition and storage.
 * 
 * Features:
 * - WAV to MP3 conversion using FFmpeg WASM
 * - Float32Array to WAV conversion for Web Audio API integration
 * - Client-side processing to reduce server load
 * - Support for educational audio recording workflows
 * - Custom FFmpeg core with optimized WASM loading
 * 
 * The utilities are particularly useful for:
 * - Converting student voice recordings to standard formats
 * - Processing Web Audio API output for transcription services
 * - Preparing audio files for storage and analysis
 * - Ensuring consistent audio formats across the platform
 * 
 * @example
 * ```ts
 * import { initFFmpeg, wav2mp3, float32ArrayToWav } from '$lib/utils/wav2mp3';
 * 
 * // Initialize FFmpeg (call once per session)
 * await initFFmpeg();
 * 
 * // Convert WAV to MP3
 * const wavFile = new File([wavData], 'recording.wav');
 * const mp3File = await wav2mp3(wavFile);
 * 
 * // Convert Float32Array to WAV
 * const audioData = new Float32Array([...]);
 * const wavBlob = float32ArrayToWav(audioData, 44100);
 * ```
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import wasmURL from '@hinagiku/ffmpeg-core/wasm?url';
import coreURL from '@hinagiku/ffmpeg-core?url';

/** Global FFmpeg instance for audio conversion operations */
const ffmpeg = new FFmpeg();

// Enable logging for debugging and monitoring conversion progress
ffmpeg.on('log', ({ message }) => console.log(message));

/**
 * Initializes the FFmpeg WebAssembly module.
 * 
 * Loads the FFmpeg core and WASM files, then verifies the installation
 * by listing available formats. This function should be called once
 * per session before performing any audio conversions.
 * 
 * @example
 * ```ts
 * // Initialize during app startup or before first audio operation
 * await initFFmpeg();
 * console.log('FFmpeg ready for audio conversion');
 * ```
 */
export async function initFFmpeg() {
	await ffmpeg.load({ coreURL, wasmURL });
	await ffmpeg.exec(['-formats']); // Verify installation
}

/**
 * Converts WAV audio to MP3 format using FFmpeg.
 * 
 * Processes audio files client-side to convert WAV format to MP3,
 * which is more efficient for storage and transmission. Useful for
 * preparing student voice recordings for upload and transcription.
 * 
 * @param wav - Input audio data as Blob, File, or ArrayBuffer
 * @returns Promise resolving to MP3 File object
 * 
 * @example
 * ```ts
 * // Convert uploaded WAV file to MP3
 * const wavFile = event.target.files[0];
 * const mp3File = await wav2mp3(wavFile);
 * 
 * // Upload MP3 for transcription
 * const formData = new FormData();
 * formData.append('file', mp3File);
 * ```
 */
export async function wav2mp3(wav: Blob | File | ArrayBuffer): Promise<File> {
	// Write input audio to FFmpeg virtual file system
	ffmpeg.writeFile(
		'audio.wav',
		new Uint8Array(wav instanceof ArrayBuffer ? wav : await wav.arrayBuffer())
	);
	
	// Execute FFmpeg conversion command
	await ffmpeg.exec(['-i', 'audio.wav', 'audio.mp3']);
	
	// Read converted MP3 data
	const data = await ffmpeg.readFile('audio.mp3');
	return new File([data], 'audio.mp3', { type: 'audio/mpeg' });
}

/**
 * Converts Float32Array audio data to WAV format.
 * 
 * Creates a properly formatted WAV file from Float32Array data typically
 * obtained from Web Audio API. Includes proper WAV header generation
 * and PCM data encoding for compatibility with audio processing systems.
 * 
 * @param float32Array - Audio sample data as Float32Array (-1.0 to 1.0 range)
 * @param sampleRate - Audio sample rate in Hz (default: 16000)
 * @param numChannels - Number of audio channels (default: 1 for mono)
 * @returns WAV audio data as Blob
 * 
 * @example
 * ```ts
 * // Convert Web Audio API recording to WAV
 * const audioContext = new AudioContext();
 * const buffer = audioContext.createBuffer(1, sampleRate, sampleRate);
 * const channelData = buffer.getChannelData(0);
 * 
 * const wavBlob = float32ArrayToWav(channelData, audioContext.sampleRate);
 * const wavFile = new File([wavBlob], 'recording.wav');
 * ```
 */
export function float32ArrayToWav(
	float32Array: Float32Array,
	sampleRate = 16000,
	numChannels = 1
): Blob {
	const bitsPerSample = 16; // 16-bit PCM for compatibility
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;

	// Create buffer for WAV file (44-byte header + PCM data)
	const buffer = new ArrayBuffer(44 + float32Array.length * 2);
	const view = new DataView(buffer);

	// Write WAV header fields
	let offset = 0;
	const writeString = (str: string) => {
		for (let i = 0; i < str.length; i++) {
			view.setUint8(offset++, str.charCodeAt(i));
		}
	};

	// RIFF header
	writeString('RIFF'); // ChunkID
	view.setUint32(offset, 36 + float32Array.length * 2, true);
	offset += 4; // ChunkSize
	writeString('WAVE'); // Format

	// Format subchunk
	writeString('fmt '); // Subchunk1ID
	view.setUint32(offset, 16, true);
	offset += 4; // Subchunk1Size
	view.setUint16(offset, 1, true);
	offset += 2; // AudioFormat (1 = PCM)
	view.setUint16(offset, numChannels, true);
	offset += 2; // NumChannels
	view.setUint32(offset, sampleRate, true);
	offset += 4; // SampleRate
	view.setUint32(offset, byteRate, true);
	offset += 4; // ByteRate
	view.setUint16(offset, blockAlign, true);
	offset += 2; // BlockAlign
	view.setUint16(offset, bitsPerSample, true);
	offset += 2; // BitsPerSample

	// Data subchunk
	writeString('data'); // Subchunk2ID
	view.setUint32(offset, float32Array.length * 2, true);
	offset += 4; // Subchunk2Size

	// Write PCM audio data
	for (let i = 0; i < float32Array.length; i++, offset += 2) {
		// Clamp sample to valid range and scale to 16-bit integer
		let sample = Math.max(-1, Math.min(1, float32Array[i]));
		sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
		view.setInt16(offset, sample, true);
	}

	return new Blob([buffer], { type: 'audio/wav' });
}
