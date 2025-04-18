import { GoogleGeminiFlash, z } from '$lib/ai';
import type { Resource } from '$lib/schema/resource';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	FOREIGN_LANGUAGE_DETECTION_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	HARMFUL_CONTENT_DETECTION_PROMPT,
	HEY_HELP_PROMPT,
	HISTORY_PROMPT,
	OFF_TOPIC_DETECTION_PROMPT,
	SUBTASKS_COMPLETED_PROMPT,
	SUBTASK_PREFIX_PROMPT
} from './prompt';

import { normalizeText } from '$lib/utils/normalization';

export async function requestLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	temperature: number = 0.1,
	topP: number = 0.5
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
			config: { temperature: temperature, topP: topP }
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
		const { result } = await requestLLM(HARMFUL_CONTENT_DETECTION_PROMPT, history, schema, 0.1);
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
		const { result } = await requestLLM(system_prompt, history, schema, 0.1);
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

export async function cleanForeignLanguage(content: string) {
	// Pre-process content to identify conversation format markers

	const history = [
		{
			role: 'user' as const,
			content: content
		}
	];

	try {
		const schema = z.object({
			containsForeignLanguage: z.boolean(),
			revised_text: z.string()
		});

		const { result } = await requestLLM(FOREIGN_LANGUAGE_DETECTION_PROMPT, history, schema, 0.1);
		const parsed_result = schema.parse(result);

		// Post-process the revised text to ensure formatting markers are removed
		let revised_text = parsed_result.revised_text;

		// Handle post-processing to make sure format markers are removed
		// Remove common conversation format markers unconditionally
		revised_text = revised_text
			.replace(/^以下是對話紀錄[：:].*/gim, '')
			.replace(/^對話紀錄[:：]?\s*.*/gim, '')
			.replace(/^conversation history[:：]?\s*.*/gim, '')
			.replace(/^user[:：]?\s*.*/gim, '')
			.replace(/^assistant[:：]?\s*.*/gim, '')
			.replace(/^system[:：]?\s*.*/gim, '')
			.trim();

		return {
			success: true,
			containsForeignLanguage: parsed_result.containsForeignLanguage,
			revised_text: normalizeText(revised_text),
			error: ''
		};
	} catch (error) {
		console.error('Error in containForeignLanguage:', error);
		return {
			success: false,
			containsForeignLanguage: false,
			revised_text: normalizeText(content),
			error: 'Error in containForeignLanguage'
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
		const { result } = await requestLLM(system_prompt, history, schema, 0.1);
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

	const schema = z.object({
		affirmation: z.string(),
		elaboration: z.string(),
		question: z.string()
	});

	try {
		const [response, subtask_completed, moderation, off_topic] = await Promise.all([
			requestLLM(system_prompt, history, schema, 0.1),
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

		const { affirmation, elaboration, question } = schema.parse(response.result) as z.infer<
			typeof schema
		>;

		let normalized_response = `${normalizeText(affirmation)}\n\n${normalizeText(elaboration)}\n\n${normalizeText(
			question
		)}`;

		// Check for foreign language in the response and replace if needed
		const languageCheck = await cleanForeignLanguage(normalized_response);
		if (languageCheck.success && languageCheck.containsForeignLanguage) {
			console.log('Foreign language detected in LLM response, replacing with cleaned version');
			normalized_response = languageCheck.revised_text;
		}

		return {
			success: true,
			response: normalized_response,
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
		const { result } = await requestLLM(CHAT_SUMMARY_PROMPT, history, schema, 0.9);
		const parsed_result = schema.parse(result);

		let summary = normalizeText(parsed_result.student_summary);
		let key_points = parsed_result.student_key_points.map((point) => normalizeText(point));

		// Check for foreign language in the summary and replace if needed
		const summaryCheck = await cleanForeignLanguage(summary);
		if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
			console.log('Foreign language detected in summary, replacing with cleaned version');
			summary = summaryCheck.revised_text;
		}

		// Check for foreign language in each key point and replace if needed
		const checkedKeyPoints = await Promise.all(
			key_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log('Foreign language detected in key point, replacing with cleaned version');
					return pointCheck.revised_text;
				}
				return point;
			})
		);
		key_points = checkedKeyPoints;

		return {
			success: true,
			summary: summary,
			key_points: key_points,
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
		const { result } = await requestLLM(CONCEPT_SUMMARY_PROMPT, history, schema, 0.9);
		const parsed_result = schema.parse(result);

		// Normalize the content
		let similar_view_points = parsed_result.similar_view_points.map((point) =>
			normalizeText(point)
		);
		let different_view_points = parsed_result.different_view_points.map((point) =>
			normalizeText(point)
		);
		let students_summary = normalizeText(parsed_result.students_summary);

		// Check for foreign language in the students_summary and replace if needed
		const summaryCheck = await cleanForeignLanguage(students_summary);
		if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
			console.log('Foreign language detected in students summary, replacing with cleaned version');
			students_summary = summaryCheck.revised_text;
		}

		// Check for foreign language in each similar view point and replace if needed
		const checkedSimilarPoints = await Promise.all(
			similar_view_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log(
						'Foreign language detected in similar view point, replacing with cleaned version'
					);
					return pointCheck.revised_text;
				}
				return point;
			})
		);
		similar_view_points = checkedSimilarPoints;

		// Check for foreign language in each different view point and replace if needed
		const checkedDifferentPoints = await Promise.all(
			different_view_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log(
						'Foreign language detected in different view point, replacing with cleaned version'
					);
					return pointCheck.revised_text;
				}
				return point;
			})
		);
		different_view_points = checkedDifferentPoints;

		return {
			success: true,
			similar_view_points: similar_view_points,
			different_view_points: different_view_points,
			students_summary: students_summary,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeConcepts:', error);
		return {
			success: false,
			similar_view_points: [],
			different_view_points: [],
			students_summary: '',
			error: 'Error in summarizeConcepts'
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
		const { result } = await requestLLM(system_prompt, history, schema, 0.9);
		const parsed_result = schema.parse(result);

		// Normalize summary
		let summary = normalizeText(parsed_result.group_summary);

		// Check for foreign language in the summary and replace if needed
		const summaryCheck = await cleanForeignLanguage(summary);
		if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
			console.log('Foreign language detected in group summary, replacing with cleaned version');
			summary = summaryCheck.revised_text;
		}

		// Process and check keywords
		const keywords: Record<string, number> = {};

		// Check each keyword for foreign language
		for (const keywordObj of parsed_result.group_keywords) {
			let keyword = keywordObj.keyword;
			const keywordCheck = await cleanForeignLanguage(keyword);

			if (keywordCheck.success && keywordCheck.containsForeignLanguage) {
				console.log('Foreign language detected in keyword, replacing with cleaned version');
				keyword = keywordCheck.revised_text;
			}

			keywords[keyword] = keywordObj.strength;
		}

		return {
			success: true,
			summary: summary,
			keywords: keywords,
			error: ''
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

	const schema = z.object({
		affirmation: z.string(),
		elaboration: z.string(),
		question: z.string()
	});

	try {
		const response = await requestLLM(system_prompt, history, schema);

		if (!response.success) {
			throw new Error('Failed to get response');
		}

		const { affirmation, elaboration, question } = schema.parse(response.result) as z.infer<
			typeof schema
		>;

		let normalized_response = `${normalizeText(affirmation)}\n\n${normalizeText(elaboration)}\n\n${normalizeText(
			question
		)}`;

		// Check for foreign language in the response and replace if needed
		const languageCheck = await cleanForeignLanguage(normalized_response);
		if (languageCheck.success && languageCheck.containsForeignLanguage) {
			console.log('Foreign language detected in HeyHelp response, replacing with cleaned version');
			normalized_response = languageCheck.revised_text;
		}

		return {
			success: true,
			response: normalized_response,
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
