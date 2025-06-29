import { env } from '$env/dynamic/private';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function transcribe(data: Buffer): Promise<string> {
	const transcription = await openai.audio.transcriptions.create({
		prompt: '請將語音確實轉錄，使用的主要語言為臺灣繁體中文，次要語言為英語。',
		file: new File([data], 'audio.mp3', { type: 'audio/mp3' }),
		model: 'gpt-4o-transcribe'
	});

	if (!transcription) {
		throw new Error('Failed to transcribe audio');
	}

	return transcription.text.replace(/[嗶.…]+$/g, '');
}
