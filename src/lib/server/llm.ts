import { env } from '$env/dynamic/private';
import type { LLMChatMessage, StudentSpeak } from '$lib/utils/types';
import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT
} from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	baseURL: env.OPENAI_BASE_URL
});

const SummaryStudentOpinionSchema = z.object({
	student_summary: z.string(),
	student_key_points: z.array(z.string())
});

const SummaryStudentConceptSchema = z.object({
	similar_view_points: z.array(z.string()),
	different_view_points: z.array(z.string()),
	students_summary: z.string()
});

const SummaryGroupOpinionSchema = z.object({
	group_summary: z.string(),
	group_key_points: z.array(z.string())
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
		if (await isHarmfulContentFile(content)) {
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

export async function isHarmfulContentFile(message: string) {
	const moderation = await openai.moderations.create({
		model: 'omni-moderation-latest',
		input: message
	});

	return moderation.results[0].flagged;
}

async function requestChatLLM(system_prompt: string, history: LLMChatMessage[], temperature = 0.7) {
	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'system', content: system_prompt }, ...history],
			temperature: temperature
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
		return {
			success: false,
			message: '',
			error: error
		};
	}
}
async function requestZodLLM(
	system_prompt: string,
	zod_scheme: z.ZodSchema<unknown>,
	temperature = 0.7
) {
	try {
		const response = await openai.beta.chat.completions.parse({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: system_prompt }],
			temperature: temperature,
			response_format: zodResponseFormat(zod_scheme, 'response')
		});

		const result = response.choices[0].message.parsed;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			message: result
		};
	} catch (error) {
		return {
			success: false,
			message: '',
			error: error
		};
	}
}

export async function chatWithLLMByDocs(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	resources: {
		name: string;
		content: string;
	}[],
	temperature = 0.7
): Promise<{ success: boolean; message: string; error?: string }> {
	try {
		const last_message_content = history[history.length - 1]?.content;
		if (last_message_content && (await isHarmfulContent(last_message_content))) {
			return {
				success: false,
				message: '',
				error: 'Harmful content detected in the last message'
			};
		}
		const formatted_docs = resources
			.map((doc, index) => {
				const title = doc.name || `Document ${index + 1}`;
				return `[${title}]:\n${doc.content}`;
			})
			.join('\n\n');

		const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
			.replace('{subtasks}', subtasks.join('\n'))
			.replace('{resources}', formatted_docs);

		const response = await requestChatLLM(system_prompt, history, temperature);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}
		return {
			success: true,
			message: response.message
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			message: '',
			error: 'Failed to chat with LLM'
		};
	}
}

export async function summarizeStudentChat(history: LLMChatMessage[]): Promise<{
	success: boolean;
	summary: string;
	key_points: string[];
	error?: string;
}> {
	try {
		const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formatted_history);

		const response = await requestZodLLM(prompt, SummaryStudentOpinionSchema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const message = response.message as z.infer<typeof SummaryStudentOpinionSchema>;
		return {
			success: true,
			summary: message.student_summary,
			key_points: message.student_key_points
		};
	} catch (error) {
		console.error('Error in summarizeChat:', error);
		return {
			success: false,
			summary: '',
			key_points: [],
			error: 'Failed to summarize chat'
		};
	}
}

export async function summarizeConcepts(
	student_opinion: { summary: string; keyPoints: string[] }[]
): Promise<{
	success: boolean;
	similar_view_points: string[];
	different_view_points: string[];
	students_summary: string;
	error?: string;
}> {
	try {
		const formatted_opinions = student_opinion
			.map((opinion) => {
				return `${opinion.summary}\nKey points: ${opinion.keyPoints.join(',')}`;
			})
			.join('\n{separator}\n');

		const system_prompt = CONCEPT_SUMMARY_PROMPT.replace('{studentOpinions}', formatted_opinions);
		const response = await requestZodLLM(system_prompt, SummaryStudentConceptSchema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}
		const message = response.message as z.infer<typeof SummaryStudentConceptSchema>;

		return {
			success: true,
			similar_view_points: message.similar_view_points,
			different_view_points: message.different_view_points,
			students_summary: message.students_summary
		};
	} catch (error) {
		console.error('Error in summarizeConcepts:', error);
		return {
			success: false,
			similar_view_points: [],
			different_view_points: [],
			students_summary: '',
			error: 'Failed to summarize concepts'
		};
	}
}

export async function summarizeGroupOpinions(
	student_opinion: StudentSpeak[]
): Promise<{ success: boolean; summary: string; error?: string }> {
	try {
		const formatted_opinions = student_opinion
			.map((opinion) => `${opinion.role}: ${opinion.content}`)
			.join('\n');

		const prompt = GROUP_OPINION_SUMMARY_PROMPT.replace('{groupOpinions}', formatted_opinions);
		const response = await requestZodLLM(prompt, SummaryGroupOpinionSchema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const message = response.message as z.infer<typeof SummaryGroupOpinionSchema>;

		return {
			success: true,
			summary: message.group_summary
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions:', error);
		return {
			success: false,
			summary: '',
			error: 'Failed to summarize group opinions'
		};
	}
}
