import { env } from '$env/dynamic/private';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { WORDCLOUD_PROMPT } from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	baseURL: env.OPENAI_BASE_URL
});

const WordCloudSchema = z.object({
	keywords: z.array(
		z.object({
			word: z.string().min(1),
			weight: z.number().min(1).max(100)
		})
	)
});

type WordCloudData = Record<string, number>;

export async function generateWordCloud(documents: string[]): Promise<{
	success: boolean;
	data?: WordCloudData;
	error?: string;
}> {
	try {
		const combinedText = documents.join('\n');

		const completion = await openai.beta.chat.completions.parse({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: WORDCLOUD_PROMPT
				},
				{
					role: 'user',
					content: combinedText
				}
			],
			response_format: zodResponseFormat(WordCloudSchema, 'word_cloud')
		});

		const result = completion.choices[0].message.parsed;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		// 轉換為 WordCloudData 格式
		const cleanedData: WordCloudData = Object.fromEntries(
			result.keywords.map(({ word, weight }) => [word, weight])
		);

		return {
			success: true,
			data: cleanedData
		};
	} catch (error) {
		console.error('Error in generateWordCloud:', error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: 'Type error: ' + error.errors.map((e) => e.message).join(', ')
			};
		}
		return {
			success: false,
			error: 'Failed to generate word cloud data'
		};
	}
}
