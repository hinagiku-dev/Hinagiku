// import pdf from 'pdf-parse';
import { LlamaParseReader } from 'llamaindex';

export async function pdf2Text(fileBuffer: ArrayBuffer, apiKey: string): Promise<string | null> {
	try {
		const reader = new LlamaParseReader({
			resultType: 'markdown',
			apiKey: apiKey
		});
		const documents = await reader.loadDataAsContent(new Uint8Array(fileBuffer));
		return documents.map((doc) => doc.text).join('\n');
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
