import { json, type RequestHandler } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';
import { upload_object } from '$lib/server/object-storage';
import { transcribe } from '$lib/stt/core';

// curl -X POST http://localhost:5173/api/stt -H "Content-Type: multipart/form-data" -H "Origin: http://localhost:5173" -F "file=@test.wav"
export const POST: RequestHandler = async ({ request }) => {
	try {
		// read audio buffer from request
		const content_type = request.headers.get('content-type');
		let audio_buffer: Buffer | null = null;

		if (content_type && content_type.includes('multipart/form-data')) {
			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file) {
				return json({ status: 'error', message: 'No file provided' }, { status: 400 });
			}
			audio_buffer = Buffer.from(await file.arrayBuffer());
		} else {
			return json({ status: 'error', message: 'Invalid Content-Type' }, { status: 400 });
		}

		const transcription = await transcribe(audio_buffer, env.HUGGINGFACE_TOKEN);
		const url = await upload_object(audio_buffer, 'audio/wav', { transcription });
		return json({ status: 'success', transcription, url });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};
