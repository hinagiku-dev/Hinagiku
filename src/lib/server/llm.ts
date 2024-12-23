import { env } from '$env/dynamic/private';
import type { Resource } from '$lib/schema/resource';
import type { LLMChatMessage, StudentSpeak } from '$lib/utils/types';
import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	SUBTASKS_COMPLETED_PROMPT
} from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	baseURL: env.OPENAI_BASE_URL
});

async function isHarmfulContent(content: string): Promise<boolean> {
	console.log('Checking content for harmful content:', { contentLength: content.length });
	const moderation = await openai.moderations.create({
		model: 'omni-moderation-latest',
		input: content
	});
	console.log('Moderation result:', moderation.results[0]);
	return moderation.results[0].flagged;
}

export async function checkFileContent(
	filePath: string
): Promise<{ success: boolean; message: string; error?: string }> {
	console.log('Checking file content:', { filePath });
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		console.log('File content read successfully:', { contentLength: content.length });
		if (await isHarmfulContentFile(content)) {
			console.warn('Harmful content detected in file');
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

export async function requestChatLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	temperature = 0.7
) {
	console.log('Requesting chat LLM:', {
		systemPromptLength: system_prompt.length,
		historyLength: history.length,
		temperature
	});
	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'system', content: system_prompt }, ...history],
			temperature: temperature
		});
		console.log('Chat LLM response received:', {
			responseLength: response.choices[0].message.content?.length,
			usage: response.usage
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
async function requestZodLLM<T extends Record<string, unknown>>(
	system_prompt: string,
	zod_scheme: z.ZodSchema<T>,
	temperature = 0.7
) {
	const response = await openai.beta.chat.completions.parse({
		model: 'gpt-4o-mini',
		messages: [{ role: 'user', content: system_prompt }],
		temperature: temperature,
		response_format: zodResponseFormat(zod_scheme, 'response')
	});
	console.log('Received response from LLM', {
		response,
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
}

export async function chatWithLLMByDocs(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	resources: Resource[],
	temperature = 0.7
): Promise<{ success: boolean; message: string; subtask_completed: boolean[]; error?: string }> {
	console.log('Starting chatWithLLMByDocs:', {
		historyLength: history.length,
		task,
		subtasksCount: subtasks.length,
		resourcesCount: resources.length
	});
	try {
		const last_message_content = history[history.length - 1]?.content;
		if (last_message_content && (await isHarmfulContent(last_message_content))) {
			return {
				success: false,
				message: '',
				subtask_completed: [],
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

		const subtask_completed = await checkSubtaskCompleted(history, subtasks);
		console.log('Formatted system prompt:', {
			promptLength: system_prompt.length,
			subtaskCompletedCount: subtask_completed.completed.length
		});

		const response = await requestChatLLM(system_prompt, history, temperature);
		console.log('Chat response received:', {
			success: response.success,
			messageLength: response.message.length
		});

		if (!response.success) {
			throw new Error('Failed to parse response');
		}
		return {
			success: true,
			message: response.message,
			subtask_completed: subtask_completed.completed
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			message: '',
			subtask_completed: [],
			error: 'Failed to chat with LLM'
		};
	}
}

async function checkSubtaskCompleted(
	history: LLMChatMessage[],
	subtasks: string[]
): Promise<{ success: boolean; completed: boolean[]; error?: string }> {
	try {
		const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const system_prompt = SUBTASKS_COMPLETED_PROMPT.replace(
			'{chatHistory}',
			formatted_history
		).replace('{subtasks}', subtasks.join('\n'));
		const completed_schema = z.object({
			satisfied: z.object(Object.fromEntries(subtasks.map((subtask) => [subtask, z.boolean()])))
		});

		const response = await requestZodLLM(system_prompt, completed_schema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const completed = subtasks.map((subtask) => response.message.satisfied[subtask]);

		return {
			success: true,
			completed
		};
	} catch (error) {
		console.error('Error in checkSubtaskCompleted:', error);
		return {
			success: false,
			completed: [],
			error: 'Failed to check subtask completion'
		};
	}
}

export async function summarizeStudentChat(history: LLMChatMessage[]): Promise<{
	success: boolean;
	summary: string;
	key_points: string[];
	error?: string;
}> {
	console.log('Summarizing student chat:', { historyLength: history.length });
	try {
		const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const system_prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formatted_history);
		const summary_student_opinion_schema = z.object({
			student_summary: z.string(),
			student_key_points: z.array(z.string())
		});

		const response = await requestZodLLM(system_prompt, summary_student_opinion_schema);
		console.log('Summary response:', {
			success: response.success,
			messageType: typeof response.message
		});

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const message = response.message as z.infer<typeof summary_student_opinion_schema>;
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
		if (!Array.isArray(student_opinion) || student_opinion.length === 0) {
			return {
				success: false,
				similar_view_points: [],
				different_view_points: [],
				students_summary: '',
				error: 'no student opinion'
			};
		}

		const formatted_opinions = student_opinion
			.map((opinion) => {
				const keyPoints = Array.isArray(opinion.keyPoints) ? opinion.keyPoints : [];
				return `${opinion.summary || ''}\nKey points: ${keyPoints.join(',')}`;
			})
			.filter(Boolean)
			.join('\n{separator}\n');

		if (!formatted_opinions) {
			return {
				success: false,
				similar_view_points: [],
				different_view_points: [],
				students_summary: '',
				error: 'format student opinion error'
			};
		}

		const system_prompt = CONCEPT_SUMMARY_PROMPT.replace('{studentOpinions}', formatted_opinions);
		const summary_student_concept_schema = z.object({
			similar_view_points: z.array(z.string()),
			different_view_points: z.array(z.string()),
			students_summary: z.string()
		});

		const response = await requestZodLLM(system_prompt, summary_student_concept_schema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}
		const message = response.message as z.infer<typeof summary_student_concept_schema>;

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

		const system_prompt = GROUP_OPINION_SUMMARY_PROMPT.replace(
			'{groupOpinions}',
			formatted_opinions
		);
		const summary_group_opinion_schema = z.object({
			group_summary: z.string(),
			group_key_points: z.array(z.string())
		});

		const response = await requestZodLLM(system_prompt, summary_group_opinion_schema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const message = response.message as z.infer<typeof summary_group_opinion_schema>;

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
