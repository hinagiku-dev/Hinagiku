import { json, type RequestHandler } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';
import { transcribe } from '$lib/stt/core';
import { R2_upload } from './utils';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// read audio buffer from request
		const contentType = request.headers.get('content-type');
		let audio_buffer: Buffer;

		if (contentType && contentType.includes('multipart/form-data')) {
			const data = await request.formData();
			const file = data.get('file') as File;
			if (!file) {
				return json({ status: 'error', message: 'No file provided' }, { status: 400 });
			}
			audio_buffer = Buffer.from(await file.arrayBuffer());
		} else {
			audio_buffer = Buffer.from(await request.arrayBuffer());
		}

		// transcribe and upload to R2 and return
		const transcription = await transcribe(audio_buffer, env.HUGGINGFACE_TOKEN);
		const transcription_file_url = await R2_upload(audio_buffer, transcription);
		return json({ status: 'success', transcription, transcription_file_url });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};
