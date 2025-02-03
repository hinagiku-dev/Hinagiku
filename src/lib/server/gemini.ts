import { GoogleGeminiFlash, z } from '$lib/ai';
import type { Resource } from '$lib/schema/resource';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import fs from 'fs/promises';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	HARMFUL_CONTENT_DETECTION_PROMPT,
	OFF_TOPIC_DETECTION_PROMPT,
	SUBTASKS_COMPLETED_PROMPT
} from './prompt';

export async function requestLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema
) {
	try {
		const { output } = await GoogleGeminiFlash.generate({
			system: system_prompt,
			prompt:
				history?.map((message) => ({
					role: message.role === 'user' ? 'user' : 'model',
					text: message.content
				})) ?? [],

			output: {
				schema: schema
			},
			config: { temperature: 0.1 }
		});
		const result = output as z.infer<typeof schema>;

		if (!output) {
			throw new Error('Failed to generate response');
		}

		return {
			success: true,
			result: result,
			error: ''
		};
	} catch (error) {
		console.error('Error in requestLLM:', error);
		return {
			success: false,
			result: null,
			error: 'Error in requestLLM'
		};
	}
}

export async function isHarmfulContent(content: string) {
	const system_prompt = HARMFUL_CONTENT_DETECTION_PROMPT;
	const history = [
		{
			role: 'user' as const,
			content: content
		}
	];
	try {
		const schema = z.object({ isHarmful: z.boolean() });
		const { result } = await requestLLM(system_prompt, history, schema);
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

export async function isOffTopic(history: LLMChatMessage[], topic: string) {
	const system_prompt = OFF_TOPIC_DETECTION_PROMPT.replace('{topic}', topic);
	try {
		const { result } = await requestLLM(
			system_prompt,
			history,
			z.object({ isOffTopic: z.boolean() })
		);
		return {
			success: true,
			result: result.isOffTopic,
			error: ''
		};
	} catch (error) {
		console.error('Error in isOffTopic:', error);
		return {
			success: false,
			result: false,
			error: 'Error in isOffTopic'
		};
	}
}

async function checkSubtaskCompleted(history: LLMChatMessage[], subtasks: string[]) {
	const subtasks_prompt = SUBTASKS_COMPLETED_PROMPT.replace('{subtasks}', subtasks.join('\n'));

	try {
		const { result } = await requestLLM(
			subtasks_prompt,
			history,
			z.object({
				satisfied: z.object(Object.fromEntries(subtasks.map((subtask) => [subtask, z.boolean()]))),
				satisfied_subtasks: z.array(z.string())
			})
		);

		const completed = subtasks.map((subtask) => result.satisfied[subtask]);
		return {
			success: true,
			completed: completed
		};
	} catch (error) {
		console.error('Error in checkSubtaskCompleted:', error);
		return {
			success: false,
			completed: [],
			error: 'Error in checkSubtaskCompleted'
		};
	}
}

export async function isHarmfulFileContent(filePath: string) {
	const content = await fs.readFile(filePath, 'utf-8');
	try {
		if (await isHarmfulContent(content)) {
			console.warn('Harmful content detected in file');
			return false;
		}
		return true;
	} catch (error) {
		console.error('Error in isHarmfulFileContent:', error);
		return false;
	}
}

export async function chatWithLLMByDocs(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	subtaskCompleted: boolean[],
	resources: Resource[]
) {
	const formatted_docs = resources
		.map((doc, index) => {
			const title = doc.name || `Document ${index + 1}`;
			return `[${title}]:\n${doc.content}`;
		})
		.join('\n\n');

	const formattedSubtasks = subtasks.map((subtask, index) => {
		return subtaskCompleted[index] ? `(完成)${subtask}` : `(未完成)subtask`;
	});

	const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
		.replace('{subtasks}', formattedSubtasks.join('\n'))
		.replace('{resources}', formatted_docs);

	try {
		const [response, subtask_completed, moderation, off_topic] = await Promise.all([
			requestLLM(system_prompt, history, z.object({ response: z.string() })),
			checkSubtaskCompleted(history, subtasks),
			isHarmfulContent(history.length > 0 ? history[history.length - 1].content : ''),
			isOffTopic(history, task)
		]);

		if (
			!response.success ||
			!subtask_completed.success ||
			!moderation.success ||
			!off_topic.success
		) {
			throw new Error('Failed to get response');
		}

		return {
			success: true,
			response: response.result.response,
			subtask_completed: subtask_completed.completed,
			warning: {
				moderation: moderation.result,
				off_topic: off_topic.result
			},
			error: ''
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			response: '',
			subtask_completed: [],
			warning: {
				moderation: false,
				off_topic: false
			},
			error: 'Error in chatWithLLMByDocs'
		};
	}
}

export async function summarizeStudentChat(history: LLMChatMessage[]) {
	const formatted_history = [
		{
			role: 'user' as const,
			content: history
				.filter((msg) => msg.role === 'user')
				.map((msg) => msg.content)
				.join('\n')
		}
	];

	try {
		const { result } = await requestLLM(
			CHAT_SUMMARY_PROMPT,
			formatted_history,
			z.object({
				student_summary: z.string(),
				student_key_points: z.array(z.string())
			})
		);

		return {
			success: true,
			summary: result.student_summary,
			key_points: result.student_key_points,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeStudentChat:', error);
		return {
			success: false,
			summary: '',
			key_points: [],
			error: 'Error in summarizeStudentChat'
		};
	}
}

export async function summarizeConcepts(
	student_opinion: { summary: string; keyPoints: string[] }[]
) {
	const history = student_opinion.map((opinion) => ({
		role: 'user' as const,
		content: `摘要：${opinion.summary}\n關鍵字：${opinion.keyPoints.join(',')}`
	}));
	try {
		const { result } = await requestLLM(
			CONCEPT_SUMMARY_PROMPT,
			history,
			z.object({
				similar_view_points: z.array(z.string()),
				different_view_points: z.array(z.string()),
				students_summary: z.string()
			})
		);
		return {
			success: true,
			similar_view_points: result.similar_view_points,
			different_view_points: result.different_view_points,
			students_summary: result.students_summary
		};
	} catch (error) {
		console.error('Error in summarizeConcepts:', error);
		return {
			success: false,
			similar_view_points: [],
			different_view_points: [],
			students_summary: ''
		};
	}
}

export async function summarizeGroupOpinions(student_opinion: Discussion[]) {
	const formatted_opinions = student_opinion
		.filter((opinion) => opinion.speaker !== '摘要小幫手')
		.map((opinion) => `${opinion.speaker}: ${opinion.content}`)
		.join('\n');
	const history = [
		{
			role: 'user' as const,
			content: formatted_opinions
		}
	];

	try {
		const system_prompt = GROUP_OPINION_SUMMARY_PROMPT;
		const { result } = await requestLLM(
			system_prompt,
			history,
			z.object({
				group_summary: z.string(),
				group_keywords: z.array(
					z.object({
						keyword: z.string(),
						strength: z.number()
					})
				)
			})
		);

		const summary = result.group_summary;
		const keywords = result.group_keywords.reduce(
			(acc: Record<string, number>, keyword: { keyword: string; strength: number }) => ({
				...acc,
				[keyword.keyword]: keyword.strength
			}),
			{} as Record<string, number>
		);

		return {
			success: true,
			summary: summary,
			keywords: keywords
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions:', error);
		return {
			success: false,
			summary: '',
			keywords: {},
			error: 'Error in summarizeGroupOpinions'
		};
	}
}
