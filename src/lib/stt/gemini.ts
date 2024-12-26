import { GoogleGeminiFlash, z } from '$lib/ai';

export async function transcribe(data: Buffer): Promise<string> {
	const dataurl = `data:audio/wav;base64,${data.toString('base64')}`;
	const { output } = await GoogleGeminiFlash.generate({
		system: '請將語音確實轉錄，使用的主要語言為正體中文（台灣），次要語言為英語。',
		prompt: [{ text: '' }, { media: { url: dataurl } }],
		output: {
			schema: z.object({
				transcription: z.string()
			})
		},
		config: { temperature: 0.1 }
	});

	if (!output) {
		throw new Error('Failed to transcribe audio');
	}

	return output.transcription.replace(/[嗶.…]+$/g, '');
}
