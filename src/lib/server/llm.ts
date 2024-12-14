import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import {
	CHAT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT
} from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	baseURL: env.OPENAI_BASE_URL
});

interface ChatMessage {
	role: string;
	content: string;
}

interface Student_opinion {
	student_id: string;
	student_conclusions: string;
}

const SummaryStudentOpinionSchema = z.object({
	student_viewpoints: z.string(),
	student_thoughts: z.string(),
	student_conclusions: z.string(),
	key_points: z.array(z.string())
});

const SummaryGroupOpinionSchema = z.object({
	group_viewpoints: z.string(),
	group_thoughts: z.string(),
	group_conclusions: z.string(),
	key_points: z.array(z.string())
});

async function isHarmfulContent(content: string): Promise<boolean> {
	const moderation = await openai.moderations.create({
		model: 'omni-moderation-latest',
		input: content
	});

	return moderation.results[0].flagged;
}

export async function checkFileContent(
	filePath: string
): Promise<{ success: boolean; message: string; error?: string }> {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		if (await isHarmfulContentfile(content)) {
			return {
				success: false,
				message: '',
				error: 'Harmful content detected in the uploaded file'
			};
		}
		return {
			success: true,
			message: 'File content is appropriate'
		};
	} catch (error) {
		console.error('Error in checkFileContent:', error);
		return {
			success: false,
			message: '',
			error: 'Error reading the file'
		};
	}
}

export async function isHarmfulContentfile(message: string) {
	const moderation = await openai.moderations.create({
		model: 'omni-moderation-latest',
		input: message
	});

	return moderation.results[0].flagged;
}

export async function chatWithLLMByDocs(
	history: ChatMessage[],
	task: string,
	subtasks: string[],
	resources: {
		name: string;
		content: string;
	}[],
	temperature = 0.7
) {
	try {
		if (await isHarmfulContent(history[history.length - 1].content)) {
			return {
				success: false,
				message: '',
				error: 'Harmful content detected'
			};
		}
		const formattedDocs = resources
			.map((doc, index) => {
				const title = doc.name || `Document ${index + 1}`;
				return `[${title}]:\n${doc.content}`;
			})
			.join('\n\n');

		const systemPrompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
			.replace('{subtasks}', subtasks.join('\n'))
			.replace('{resources}', formattedDocs);

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: systemPrompt
				},
				...history.map((msg) => ({
					role: msg.role as 'user' | 'assistant' | 'system',
					content: msg.content
				}))
			],
			temperature
		});

		const result = response.choices[0].message.content;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			message: result
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				message: '',
				error: 'Type error: ' + error.errors.map((e) => e.message).join(', ')
			};
		}
		return {
			success: false,
			message: '',
			error: 'Failed to process documents and generate response'
		};
	}
}

export async function summarizeStudentChat(chatHistory: ChatMessage[]) {
	try {
		const formattedHistory = chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formattedHistory);

		const completion = await openai.beta.chat.completions.parse({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.5,
			response_format: zodResponseFormat(SummaryStudentOpinionSchema, 'chat_summary')
		});

		const result = completion.choices[0].message.content;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			summary: result
		};
	} catch (error) {
		console.error('Error in summarizeChat:', error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: 'Type error: ' + error.errors.map((e) => e.message).join(', ')
			};
		}
		return {
			success: false,
			error: 'Failed to summarize chat'
		};
	}
}

export async function summarizeGroupOpinions(groupOpinions: Student_opinion[]) {
	try {
		const formattedOpinions = groupOpinions
			.map((opinion) => {
				return `Student ID: ${opinion.student_id}\nViewpoints: ${opinion.student_conclusions}`;
			})
			.join('\n\n');

		const prompt = GROUP_OPINION_SUMMARY_PROMPT.replace('{groupOpinions}', formattedOpinions);

		const completion = await openai.beta.chat.completions.parse({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.5,
			response_format: zodResponseFormat(SummaryGroupOpinionSchema, 'group_opinion_summary')
		});

		const result = completion.choices[0].message.content;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			summary: result
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions:', error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: 'Type error: ' + error.errors.map((e) => e.message).join(', ')
			};
		}
		return {
			success: false,
			error: 'Failed to summarize group opinions'
		};
	}
}
