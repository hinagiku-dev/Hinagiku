import dotenv from 'dotenv';
dotenv.config();

import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { HARMFUL_CONTENT_DETECTION_PROMPT } from '../src/lib/server/prompt';
import type { LLMChatMessage } from '../src/lib/server/types';

export const GoogleGeminiFlash = genkit({
	plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
	model: gemini15Flash
});
export async function requestLLM(
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	system_prompt?: string
) {
	const { output } = await GoogleGeminiFlash.generate({
		prompt: [
			...(system_prompt ? [{ text: system_prompt }] : []),
			...history.map((msg) => ({
				text: msg.content,
				role: msg.role === 'user' ? 'user' : 'assistant'
			}))
		],
		output: { schema },
		config: { temperature: 0.1 }
	});

	console.log('Output:', output);
	if (!output) {
		throw new Error('Failed to generate response');
	}

	return output;
}

async function isHarmfulContent(content: string) {
	const history = [
		{
			role: 'user' as const,
			content: HARMFUL_CONTENT_DETECTION_PROMPT.replace('{studentMessage}', content)
		}
	];
	try {
		const result = await requestLLM(
			history,
			z.object({ isHarmful: z.boolean() }),
			HARMFUL_CONTENT_DETECTION_PROMPT
		);
		console.log('Result:', result);
		return {
			success: true,
			result: result.isHarmful,
			error: ''
		};
	} catch (error) {
		console.error('Error in isHarmfulContent:', error);
		return {
			success: false,
			result: false,
			error: 'Error in isHarmfulContent'
		};
	}
}

async function main() {
	const result = await isHarmfulContent('你好');
	console.log(result);
}

main();
