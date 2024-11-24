import dotenv from 'dotenv';
import fs from 'fs';
import { transcribe } from '../src/lib/stt/core';

dotenv.config();

const help_message = `
Usage: tsx <script> [options] <audio_filepath>

Options:
	--help, -h       Show this help message
	<audio_filepath> Path to the audio file to be transcribed, (mp3, wav)

Example:
	tsx script.ts audio.mp3
`;

main();
async function main() {
	const args = process.argv;

	if (args.length === 2 || args.includes('--help') || args.includes('-h')) {
		console.log(help_message);
		return;
	}

	const audio_filepath = args[2];

	if (!fs.existsSync(audio_filepath)) {
		console.error(`Error: File not found: ${audio_filepath}`);
		process.exit(1);
	}

	console.log(`Transcribing audio file: ${audio_filepath}`);

	const data = fs.readFileSync(audio_filepath);
	const text = await transcribe(data, process.env.HUGGINGFACE_TOKEN!);

	console.log('Transcription Result:');
	console.log(text);
}
