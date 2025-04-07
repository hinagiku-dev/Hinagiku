import { GoogleGeminiFlash, z } from '$lib/ai';

export async function transcribe(data: Buffer): Promise<string> {
	const dataurl = `data:audio/wav;base64,${data.toString('base64')}`;
	const { output } = await GoogleGeminiFlash.generate({
		system: '(zh-tw)請將語音確實轉錄，使用的主要語言為臺灣繁體中文，次要語言為英語。其次是正確辨識「嘿小菊」的關鍵字。',
		prompt: [{ text: '' }, { media: { url: dataurl } }],
		output: {
			schema: z.object({
				transcription: z.string()
			})
		},
		config: { temperature: 0.1, topP: 0.5 }
	});

	if (!output) {
		throw new Error('Failed to transcribe audio');
	}

	return output.transcription.replace(/[嗶.…]+$/g, '');
}
