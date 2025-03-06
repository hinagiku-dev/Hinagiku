// import pdf from 'pdf-parse';
import { GoogleGeminiFlash, z } from '$lib/ai';
import { PDF_PARSE_PROMPT } from './prompt';

// export async function pdf2Text(fileBuffer: ArrayBuffer, apiKey: string): Promise<string | null> {
// 	try {
// 		const parser = new LlamaParse(apiKey);
// 		const result = await parser.parseFile(new Blob([fileBuffer]));
// 		return result.markdown;
// 	} catch (error) {
// 		console.error('Error in pdf2Text', error);
// 		return null;
// 	}
// }

export async function pdf2Text(fileBuffer: ArrayBuffer): Promise<string | null> {
	try {
		const { output } = await GoogleGeminiFlash.generate({
			system: PDF_PARSE_PROMPT,
			prompt: [
				{
					media: {
						url: `data:application/pdf;base64,${Buffer.from(fileBuffer).toString('base64')}`
					}
				}
			],
			output: {
				schema: z.object({
					markdown: z.string()
				})
			},
			config: { temperature: 0.1 }
		});

		if (!output) {
			throw new Error('Failed to parse PDF');
		}

		return output.markdown;
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
