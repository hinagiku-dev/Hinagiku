// import pdf from 'pdf-parse';
import { env } from '$env/dynamic/private';
import { LlamaParseReader } from 'llamaindex';

export async function pdf2Text(fileBuffer: ArrayBuffer): Promise<string | null> {
	try {
		const reader = new LlamaParseReader({
			resultType: 'markdown',
			apiKey: env.LLAMA_CLOUD_API_KEY
		});
		const documents = await reader.loadDataAsContent(new Uint8Array(fileBuffer));
		return documents.map((doc) => doc.text).join('\n');

		// const data = await pdf(Buffer.from(fileBuffer));
		// const text = data.text;
		// data.text = text.replace(/^\s*\n+/gm, '\n');
		// return data.text;
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
