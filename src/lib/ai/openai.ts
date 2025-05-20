import { env } from '$env/dynamic/private';
import { genkit } from 'genkit';
import { gpt41Mini, openAI } from 'genkitx-openai';

export const OpenAIGpt41Mini = genkit({
	plugins: [openAI({ apiKey: env.OPENAI_API_KEY })],
	model: gpt41Mini
});
