import { env } from '$env/dynamic/private';
import type { LLMChatMessage, LLMChatResult, StudentSpeak } from '$lib/utils/types';
import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	SUBTASKS_COMPLETED_PROMPT,
	WARNING_DETECTION_PROMPT
} from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	baseURL: env.OPENAI_BASE_URL
});

export async function checkFileContent(
	filePath: string
): Promise<{ success: boolean; message: string; error?: string }> {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		if (await moderationDetection(content)) {
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

async function moderationDetection(content: string) {
	const moderation_result = await openai.moderations.create({
		model: 'omni-moderation-latest',
		input: content
	});

	return moderation_result.results[0].flagged;
}

async function warningDetection(history: LLMChatMessage[]) {
	const llmMessage = history.length === 1 ? '' : history[history.length - 2].content;
	const userMessage = history[history.length - 1].content;

	const warning_detection_prompt = WARNING_DETECTION_PROMPT.replace(
		'{studentMessage}',
		userMessage
	).replace('{llmMessage}', llmMessage);

	const warning_detection_schema = z.object({
		inappropriate_content: z.number().min(1).max(10),
		stealing_llm_info: z.number().min(1).max(10),
		off_topic: z.number().min(1).max(10)
	});

	const [moderation_result, warning_detection_response] = await Promise.all([
		moderationDetection(userMessage),
		requestZodLLM(warning_detection_prompt, warning_detection_schema)
	]);

	if (!warning_detection_response.success) {
		throw new Error('Failed to parse warning detection response');
	}

	const warning_detection_result = warning_detection_response.message as z.infer<
		typeof warning_detection_schema
	>;

	return {
		moderation: moderation_result,
		inappropriate_content: warning_detection_result.inappropriate_content,
		stealing_llm_info: warning_detection_result.stealing_llm_info,
		off_topic: warning_detection_result.off_topic
	};
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
): Promise<LLMChatResult> {
	try {
		const formatted_docs = resources
			.map((doc, index) => {
				const title = doc.name || `Document ${index + 1}`;
				return `[${title}]:\n${doc.content}`;
			})
			.join('\n\n');

		const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
			.replace('{subtasks}', subtasks.join('\n'))
			.replace('{resources}', formatted_docs);

		const [subtask_completed, response, warning_detection] = await Promise.all([
			checkSubtaskCompleted(history, subtasks),
			requestChatLLM(system_prompt, history, temperature),
			warningDetection(history)
		]);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}
		return {
			success: true,
			content: response.message,
			warning: warning_detection,
			completed: subtask_completed.completed
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			content: '',
			warning: {
				moderation: false,
				inappropriate_content: 0,
				stealing_llm_info: 0,
				off_topic: 0
			},
			completed: [],
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
		const completed_schema = z.array(z.boolean()).length(subtasks.length);

		const response = await requestZodLLM(system_prompt, completed_schema);

		if (!response.success) {
			throw new Error('Failed to parse response');
		}

		const completed = response.message as z.infer<typeof completed_schema>;
		return {
			success: true,
			completed: completed
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
	try {
		const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const system_prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formatted_history);
		const summary_student_opinion_schema = z.object({
			student_summary: z.string(),
			student_key_points: z.array(z.string())
		});

		const response = await requestZodLLM(system_prompt, summary_student_opinion_schema);

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
		const formatted_opinions = student_opinion
			.map((opinion) => {
				return `${opinion.summary}\nKey points: ${opinion.keyPoints.join(',')}`;
			})
			.join('\n{separator}\n');
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
