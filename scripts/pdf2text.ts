import fs from 'fs';
import { pdf2Text } from '../src/lib/server/parsePdf';

const help_message = `
Usage: tsx <script> [options] <pdf_filepath>

Options:
    --help, -h       Show this help message
    <pdf_filepath> Path to the pdf file to be converted to text

Example:
    tsx script.ts file.pdf
`;

main();
async function main() {
	const args = process.argv;

	if (args.length === 2 || args.includes('--help') || args.includes('-h')) {
		console.log(help_message);
		return;
	}

	const pdf_filepath = args[2];

	if (!fs.existsSync(pdf_filepath)) {
		console.error(`Error: File not found: ${pdf_filepath}`);
		process.exit(1);
	}

	console.log(`Transcribing pdf file: ${pdf_filepath}`);

	const text = await pdf2Text(pdf_filepath);

	console.log('Transcription Result:');
	console.log(text);
}
