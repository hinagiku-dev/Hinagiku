import fs from 'fs';
import pdf from 'pdf-parse';

export async function pdf2Text(filePath: string): Promise<string> {
	const dataBuffer = fs.readFileSync(filePath);
	const data = await pdf(dataBuffer);

	const text = data.text;
	// remove space line
	data.text = text.replace(/^\s*\n+/gm, '\n');

	return data.text;
}
