import { env } from '$env/dynamic/private';
import { storageBucket } from '$lib/firebase';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getDownloadURL, ref, updateMetadata, uploadBytes } from 'firebase/storage';
import rfc2047 from 'rfc2047';
import { v4 as uuidv4 } from 'uuid';

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

interface StorageAdapter {
	upload(object: Buffer, type: keyof typeof EXT, metadata: Record<string, string>): Promise<string>;
}

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

class FirebaseAdapter implements StorageAdapter {
	async upload(object: Buffer, type: keyof typeof EXT, metadata: Record<string, string>) {
		const ext = EXT[type];
		const key = `${uuidv4()}.${ext}`;
		const storageRef = ref(storageBucket, key);
		await uploadBytes(storageRef, object, { contentType: type });
		await updateMetadata(storageRef, { customMetadata: metadata });
		return getDownloadURL(storageRef);
	}
}

const storageService: StorageAdapter =
	env.HINAGIKU_STORAGE_BACKEND === 'r2' ? new CloudflareAdapter() : new FirebaseAdapter();

export async function upload_object(
	object: Buffer,
	type: keyof typeof EXT,
	metadata: Record<string, string> = {}
): Promise<string> {
	for (const [k, v] of Object.entries(metadata)) {
		metadata[k] = rfc2047.encode(v);
	}
	const url = await storageService.upload(object, type, metadata);
	console.log(`Uploaded object to ${url}`);
	return url;
}
