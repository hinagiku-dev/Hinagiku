import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import rfc2047 from 'rfc2047';
import { v4 as uuidv4 } from 'uuid';

const CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_R2_BUCKET = env.CLOUDFLARE_R2_BUCKET;
const CLOUDFLARE_R2_PUBLIC_URL = env.CLOUDFLARE_R2_PUBLIC_URL;
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_BUCKET || !CLOUDFLARE_R2_PUBLIC_URL) {
	throw new Error('Cloudflare R2 bucket and account ID are required');
}

const client = new S3Client({
	region: 'auto',
	endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
		secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
	}
});

const GCP_PROJECT_ID = env.GCP_PROJECT_ID;
const GCP_KEY_FILENAME = env.GCP_KEY_FILENAME;
const GCP_BUCKET_NAME = env.GCP_BUCKET_NAME;
const GCP_PUBLIC_URL = env.GCP_PUBLIC_URL;
const USE_GCP = env.USE_GCP;
if (!GCP_PROJECT_ID || !GCP_KEY_FILENAME || !GCP_BUCKET_NAME || !GCP_PUBLIC_URL) {
	throw new Error('GCP project ID, key filename, bucket name, and public URL are required');
}

const storage = new Storage({
	projectId: GCP_PROJECT_ID,
	keyFilename: GCP_KEY_FILENAME
});
const bucket = storage.bucket(GCP_BUCKET_NAME);

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

export async function upload_object(
	object: Buffer,
	type: keyof typeof EXT,
	metadata: Record<string, string> = {}
): Promise<string> {
	const ext = EXT[type];
	if (!ext) {
		throw new Error('Invalid file type');
	}

	const key = `${uuidv4()}.${ext}`;

	for (const [k, v] of Object.entries(metadata)) {
		metadata[k] = rfc2047.encode(v);
	}

	if (USE_GCP === 'true') {
		return upload_object_gcp(object, type, metadata);
	}

	const command = new PutObjectCommand({
		Bucket: CLOUDFLARE_R2_BUCKET,
		Key: key,
		Body: object,
		ContentType: type,
		Metadata: metadata
	});
	await client.send(command);

	const url = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
	console.log(`Uploaded object to ${url}`);
	return url;
}

export async function upload_object_gcp(
	object: Buffer,
	type: keyof typeof EXT,
	metadata: Record<string, string> = {}
): Promise<string> {
	const ext = EXT[type];
	if (!ext) {
		throw new Error('Invalid file type');
	}

	const key = `${uuidv4()}.${ext}`;

	const file = bucket.file(key);
	const stream = file.createWriteStream({
		metadata: {
			contentType: type,
			metadata: metadata
		}
	});

	return new Promise((resolve, reject) => {
		stream.on('error', (err) => {
			reject(err);
		});

		stream.on('finish', async () => {
			try {
				await file.makePublic();
				const url = `${GCP_PUBLIC_URL}/${key}`;
				console.log(`Uploaded object to ${url}`);
				resolve(url);
			} catch (err) {
				reject(err);
			}
		});

		stream.end(object);
	});
}
