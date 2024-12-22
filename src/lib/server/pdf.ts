// import pdf from 'pdf-parse';
import { LlamaParse } from './llamaparse';

export async function pdf2Text(fileBuffer: ArrayBuffer, apiKey: string): Promise<string | null> {
	try {
		const parser = new LlamaParse(apiKey);
		const result = await parser.parseFile(new Blob([fileBuffer]));
		return result.markdown;
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
