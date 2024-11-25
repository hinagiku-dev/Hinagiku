import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

import { env } from '$env/dynamic/private';

export async function R2_upload(audioBuffer: Buffer, transcription: string): Promise<string> {
	const account_id = env.CLOUDFLARE_ACCOUNT_ID;
	const bucket_name = env.CLOUDFLARE_R2_BUCKET;

	// S3 client for auth
	const s3_client = new S3Client({
		region: 'auto',
		endpoint: `https://${account_id}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
			secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
		}
	});

	try {
		// Upload audio buffer to R2
		const audio_file = `stt/${uuidv4()}.mp3`;
		const command = new PutObjectCommand({
			Bucket: bucket_name,
			Key: audio_file,
			Body: audioBuffer,
			ContentType: 'audio/mpeg'
		});
		await s3_client.send(command);

		// Upload transcription to R2
		const transcription_file = `stt/${uuidv4()}.txt`;
		const transcription_command = new PutObjectCommand({
			Bucket: bucket_name,
			Key: transcription_file,
			Body: transcription,
			ContentType: 'text/plain'
		});
		await s3_client.send(transcription_command);

		// Return transcription file URL
		const transcription_file_url = `https://${bucket_name}.${account_id}.r2.cloudflarestorage.com/${transcription_file}`;
		return transcription_file_url;
	} catch (error) {
		console.error(error);
		throw error;
	}
}
