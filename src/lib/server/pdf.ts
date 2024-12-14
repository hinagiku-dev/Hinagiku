import pdf from 'pdf-parse';

export async function pdf2Text(fileBuffer: ArrayBuffer): Promise<string | null> {
	try {
		const data = await pdf(Buffer.from(fileBuffer));
		const text = data.text;
		data.text = text.replace(/^\s*\n+/gm, '\n');
		return data.text;
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
