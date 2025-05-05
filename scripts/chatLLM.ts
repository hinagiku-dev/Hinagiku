import dotenv from 'dotenv';
dotenv.config();

import { genkit } from 'genkit';
import { gpt41Mini, openAI } from 'genkitx-openai';
import { z } from 'zod';
import { HARMFUL_CONTENT_DETECTION_PROMPT } from '../src/lib/server/prompt';
import type { LLMChatMessage } from '../src/lib/server/types';

export const llmModel = genkit({
	plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
	model: gpt41Mini
});

export async function requestLLM(
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	system_prompt?: string
) {
	const { output } = await llmModel.generate({
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
	const response = await requestLLM(
		[
			{
				role: 'user' as const,
				content: '請幫我寫一個簡單的Python程式，讓我可以計算圓的面積'
			},
			{
				role: 'assistant' as const,
				content:
					'當然可以！這是一個簡單的Python程式，可以計算圓的面積：\n\n```python\nimport math\n\ndef calculate_circle_area(radius):\n    return math.pi * radius ** 2\n\nradius = float(input("請輸入圓的半徑："))\narea = calculate_circle_area(radius)\nprint(f"圓的面積是：{area}")\n```'
			}
		],
		z.object({
			code: z.string(),
			'code-language': z.string(),
			'code-explanation': z.string()
		}),
		'請幫我檢查這段程式碼的錯誤，並給我建議'
	);
	console.log('Response:', response);
}

main();
