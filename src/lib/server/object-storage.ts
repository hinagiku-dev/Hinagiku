import { env } from '$env/dynamic/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
