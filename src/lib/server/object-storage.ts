/**
 * @fileoverview
 * Multi-provider object storage service for the Hinagiku educational platform.
 * 
 * This module provides a unified interface for uploading and managing files across
 * different cloud storage providers. It supports both Firebase Cloud Storage and
 * Cloudflare R2, allowing deployments to choose the most suitable storage backend
 * based on their needs and infrastructure preferences.
 * 
 * Features:
 * - Multi-provider support (Firebase Cloud Storage, Cloudflare R2)
 * - Automatic file type detection and extension mapping
 * - Metadata encoding for international characters (RFC 2047)
 * - UUID-based unique file naming to prevent conflicts
 * - Environment-based provider selection
 * - Consistent API across different storage backends
 * 
 * The service is particularly designed for educational content including:
 * - Audio recordings and transcriptions
 * - Image uploads and visual resources
 * - PDF documents and learning materials
 * - JSON data exports and backups
 * 
 * @example
 * ```ts
 * import { upload_object } from '$lib/server/object-storage';
 * 
 * // Upload an audio file with metadata
 * const audioBuffer = Buffer.from(audioData);
 * const url = await upload_object(audioBuffer, 'audio/mpeg', {
 *   transcription: 'Student response about learning...',
 *   sessionId: 'session-123',
 *   userId: 'student-456'
 * });
 * 
 * console.log('Audio uploaded to:', url);
 * ```
 */

import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';
import rfc2047 from 'rfc2047';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mapping of MIME types to file extensions for proper file naming.
 * Covers common educational content types including audio, images, and documents.
 */
const EXT = {
	'audio/wav': 'wav',
	'audio/mpeg': 'mp3',
	'audio/ogg': 'ogg',
	'audio/webm': 'webm',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'application/pdf': 'pdf',
	'text/plain': 'txt',
	'application/json': 'json'
} as const;

/**
 * Interface defining the contract for storage adapter implementations.
 * Ensures consistent API across different cloud storage providers.
 */
interface StorageAdapter {
	/**
	 * Uploads an object to the storage backend.
	 * @param object - File data as Buffer
	 * @param type - MIME type of the file
	 * @param metadata - Additional metadata to store with the file
	 * @returns Promise resolving to the public URL of the uploaded file
	 */
	upload(object: Buffer, type: keyof typeof EXT, metadata: Record<string, string>): Promise<string>;
}

/**
 * Cloudflare R2 storage adapter implementation.
 * Provides high-performance object storage with S3-compatible API.
 */
class CloudflareAdapter implements StorageAdapter {
	private client: S3Client;
	private bucket: string;
	private publicUrl: string;

	constructor() {
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const bucket = env.CLOUDFLARE_R2_BUCKET;
		const publicUrl = env.CLOUDFLARE_R2_PUBLIC_URL;
		
		if (!accountId || !bucket || !publicUrl) {
			throw new Error('Cloudflare R2 bucket and account ID are required');
		}
		
		this.bucket = bucket;
		this.publicUrl = publicUrl;
		this.client = new S3Client({
			region: 'auto',
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
				secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
			}
		});
	}

	async upload(object: Buffer, type: keyof typeof EXT, metadata: Record<string, string>) {
		const ext = EXT[type];
		const key = `${uuidv4()}.${ext}`;
		
		const cmd = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: object,
			ContentType: type,
			Metadata: metadata
		});
		
		await this.client.send(cmd);
		return `${this.publicUrl}/${key}`;
	}
}

/**
 * Firebase Cloud Storage adapter implementation.
 * Provides seamless integration with Firebase ecosystem and Google Cloud.
 */
class FirebaseAdapter implements StorageAdapter {
	private storage: ReturnType<typeof getStorage>;
	private bucket: ReturnType<ReturnType<typeof getStorage>['bucket']>;

	constructor() {
		this.storage = getStorage();
		this.bucket = this.storage.bucket(env.GOOGLE_CLOUD_STORAGE_BUCKET);
	}

	async upload(object: Buffer, type: keyof typeof EXT, metadata: Record<string, string>) {
		const ext = EXT[type];
		const key = `${uuidv4()}.${ext}`;
		const file = this.bucket.file(key);
		
		await file.save(object, { contentType: type, metadata });
		return getDownloadURL(file);
	}
}

/**
 * Storage service instance selected based on environment configuration.
 * Defaults to Firebase if R2 is not explicitly configured.
 */
const storageService: StorageAdapter =
	env.HINAGIKU_STORAGE_BACKEND === 'r2' ? new CloudflareAdapter() : new FirebaseAdapter();

/**
 * Uploads an object to the configured storage backend with metadata.
 * 
 * Handles file upload with automatic type detection, unique naming,
 * and metadata encoding for international characters. Provides a
 * unified interface regardless of the underlying storage provider.
 * 
 * @param object - File data as Buffer
 * @param type - MIME type determining file extension and handling
 * @param metadata - Additional metadata to store (encoded using RFC 2047)
 * @returns Promise resolving to the public URL of the uploaded file
 * 
 * @example
 * ```ts
 * // Upload student audio recording
 * const audioUrl = await upload_object(audioBuffer, 'audio/mpeg', {
 *   studentId: 'S2024001',
 *   activity: 'pronunciation-practice',
 *   transcription: '學生回答內容...'
 * });
 * ```
 */
export async function upload_object(
	object: Buffer,
	type: keyof typeof EXT,
	metadata: Record<string, string> = {}
): Promise<string> {
	// Encode metadata values to handle international characters
	for (const [k, v] of Object.entries(metadata)) {
		metadata[k] = rfc2047.encode(v);
	}
	
	const url = await storageService.upload(object, type, metadata);
	console.log(`Uploaded object to ${url}`);
	return url;
}
