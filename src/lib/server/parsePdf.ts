import fs from 'fs';
import pdf from 'pdf-parse';

export async function pdf2Text(filePath: string): Promise<string> {
	const dataBuffer = fs.readFileSync(filePath);
	const data = await pdf(dataBuffer);

	return data.text;
}
