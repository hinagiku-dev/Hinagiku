import { env } from '$env/dynamic/private';
import { genkit } from 'genkit';
import { gpt41Mini, gpt4oTranscribe, openAI } from 'genkitx-openai';

export const llmModel = genkit({
	plugins: [openAI({ apiKey: env.OPENAI_API_KEY })],
	model: gpt41Mini
});

export const asrModel = genkit({
	plugins: [openAI({ apiKey: env.OPENAI_API_KEY })],
	model: gpt4oTranscribe
});
