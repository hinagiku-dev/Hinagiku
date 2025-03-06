import { env } from '$env/dynamic/private';
import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const GoogleGeminiFlash = genkit({
	plugins: [googleAI({ apiKey: env.GOOGLE_GENAI_API_KEY })],
	model: gemini20Flash
});
