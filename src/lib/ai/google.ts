import { env } from '$env/dynamic/private';
import { genkit } from 'genkit';
import { gpt4o, openAI } from 'genkitx-openai';

// export const llmModel = genkit({
// 	plugins: [googleAI({ apiKey: env.GOOGLE_GENAI_API_KEY })],
// 	model: gemini20Flash
// });

export const llmModel = genkit({
	plugins: [openAI({ apiKey: env.OPENAI_API_KEY })],
	model: gpt4o
});
