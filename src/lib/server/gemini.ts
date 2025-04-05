import { GoogleGeminiFlash, z } from '$lib/ai';
import type { Resource } from '$lib/schema/resource';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	HARMFUL_CONTENT_DETECTION_PROMPT,
	HEY_HELP_PROMPT,
	HISTORY_PROMPT,
	OFF_TOPIC_DETECTION_PROMPT,
	SUBTASKS_COMPLETED_PROMPT,
	SUBTASK_PREFIX_PROMPT
} from './prompt';

export async function requestLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema
) {
	try {
		const { output } = await GoogleGeminiFlash.generate({
			system: system_prompt,
			prompt: HISTORY_PROMPT.replace(
				'{chatHistory}',
				history.map((msg) => `${msg.name ? msg.name : msg.role}: ${msg.content}`).join('\n')
			),

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
	const history = [
		{
			role: 'user' as const,
			content: content
		}
	];
	try {
		const schema = z.object({ isHarmful: z.boolean() });
		const { result } = await requestLLM(HARMFUL_CONTENT_DETECTION_PROMPT, history, schema);
		const parsed_result = schema.parse(result);
		return {
			success: true,
			harmfulContent: parsed_result.isHarmful,
			error: ''
		};
	} catch (error) {
		console.error('Error in isHarmfulContent:', error);
		return {
			success: false,
			harmfulContent: false,
			error: 'Error in isHarmfulContent'
		};
	}
}

export async function isOffTopic(history: LLMChatMessage[], topic: string, subtasks: string[]) {
	const llm_message = history.length > 1 ? history[history.length - 2].content : '';
	const student_message = history[history.length - 1].content;
	const system_prompt = OFF_TOPIC_DETECTION_PROMPT.replace('{llmMessage}', llm_message)
		.replace('{studentMessage}', student_message)
		.replace('{topic}', topic)
		.replace('{subtopic}', subtasks.join('\n'));
	try {
		const schema = z.object({ isOffTopic: z.boolean() });
		const { result } = await requestLLM(system_prompt, history, schema);
		const parsed_result = schema.parse(result);
		return {
			success: true,
			offTopic: parsed_result.isOffTopic,
			error: ''
		};
	} catch (error) {
		console.error('Error in isOffTopic:', error);
		return {
			success: false,
			offTopic: false,
			error: 'Error in isOffTopic'
		};
	}
}

async function checkSubtaskCompleted(history: LLMChatMessage[], subtasks: string[]) {
	const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
	const system_prompt = SUBTASKS_COMPLETED_PROMPT.replace(
		'{chatHistory}',
		formatted_history
	).replace(
		'{subtasks}',
		subtasks.map((subtask) => SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask)).join('\n')
	);

	try {
		const schema = z.object({
			satisfied: z.object(Object.fromEntries(subtasks.map((subtask) => [subtask, z.boolean()]))),
			satisfied_subtasks: z.array(z.string())
		});
		const { result } = await requestLLM(system_prompt, history, schema);
		const parsed_result = schema.parse(result);

		const completed = subtasks.map((subtask) => parsed_result.satisfied[subtask]);
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
		return subtaskCompleted[index]
			? `(完成)`
			: `(未完成)` + SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask);
	});

	const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
		.replace('{subtasks}', formattedSubtasks.join('\n'))
		.replace('{resources}', formatted_docs);

	try {
		const [response, subtask_completed, moderation, off_topic] = await Promise.all([
			requestLLM(system_prompt, history, z.object({ response: z.string() })),
			checkSubtaskCompleted(history, subtasks),
			isHarmfulContent(history.length > 0 ? history[history.length - 1].content : ''),
			isOffTopic(history, task, subtasks)
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
				moderation: moderation.harmfulContent,
				off_topic: off_topic.offTopic
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
	try {
		const schema = z.object({
			student_summary: z.string(),
			student_key_points: z.array(z.string())
		});
		const { result } = await requestLLM(CHAT_SUMMARY_PROMPT, history, schema);
		const parsed_result = schema.parse(result);

		return {
			success: true,
			summary: parsed_result.student_summary,
			key_points: parsed_result.student_key_points,
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
		const schema = z.object({
			similar_view_points: z.array(z.string()),
			different_view_points: z.array(z.string()),
			students_summary: z.string()
		});
		const { result } = await requestLLM(CONCEPT_SUMMARY_PROMPT, history, schema);
		const parsed_result = schema.parse(result);
		return {
			success: true,
			similar_view_points: parsed_result.similar_view_points,
			different_view_points: parsed_result.different_view_points,
			students_summary: parsed_result.students_summary
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
	const system_prompt = GROUP_OPINION_SUMMARY_PROMPT;

	try {
		const schema = z.object({
			group_summary: z.string(),
			group_keywords: z.array(
				z.object({
					keyword: z.string(),
					strength: z.number()
				})
			)
		});
		const { result } = await requestLLM(system_prompt, history, schema);
		const parsed_result = schema.parse(result);

		const summary = parsed_result.group_summary;
		const keywords = parsed_result.group_keywords.reduce(
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

export async function getHeyHelpMessage(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	resources: Resource[]
) {
	const formatted_docs = resources
		.map((doc, index) => {
			const title = doc.name || `Document ${index + 1}`;
			return `[${title}]:\n${doc.content}`;
		})
		.join('\n\n');

	const formattedSubtasks = subtasks.map((subtask) => {
		return SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask);
	});

	const system_prompt =
		DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
			.replace('{subtasks}', formattedSubtasks.join('\n'))
			.replace('{resources}', formatted_docs) + HEY_HELP_PROMPT;

	try {
		const response = await requestLLM(system_prompt, history, z.object({ response: z.string() }));

		if (!response.success) {
			throw new Error('Failed to get response');
		}

		return {
			success: true,
			response: response.result.response,
			error: ''
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			response: '',
			error: 'Error in chatWithLLMByDocs'
		};
	}
}
