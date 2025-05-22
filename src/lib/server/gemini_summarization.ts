import { z } from '$lib/ai';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import {
	requestLLM
	// cleanForeignLanguage is handled by _processLLMResponse in requestLLM
} from './gemini_utils';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT
} from './prompt';

/**
 * Summarizes a student's chat history.
 *
 * @param history The chat history of the student.
 * @param presentation The desired presentation format for the summary (e.g., 'paragraph', 'list2').
 * @param textStyle The desired text style for the summary (e.g., 'default', 'humor').
 * @returns An object containing the success status, the generated summary, key points, or an error message.
 */
export async function summarizeStudentChat(
	history: LLMChatMessage[],
	presentation: string = 'paragraph',
	textStyle: string = 'default'
) {
	try {
		// Mapping for presentation format to the number of points/items.
		const presentationMap: Record<string, number> = {
			paragraph: 1,
			list2: 2,
			list3: 3,
			list4: 4,
			list5: 5
		};
		// Define the expected schema for the LLM's response.
		const schema = z.object({
			student_summary: z.array(z.string()).length(presentationMap[presentation] || 1),
			student_key_points: z.array(z.string())
		});
		// Mapping for text style options.
		const textStyleMap: Record<string, string> = {
			default: '預設', // Default
			humor: '幽默', // Humorous
			serious: '嚴肅', // Serious
			casual: '輕鬆', // Casual
			cute: '可愛' // Cute
		};
		// Construct the system prompt.
		const prompt = CHAT_SUMMARY_PROMPT.replace(
			'{presentation}',
			(presentationMap[presentation] || presentationMap.paragraph).toString()
		).replace('{textStyle}', textStyleMap[textStyle] || textStyleMap.default);

		// Call the LLM; text processing is handled by requestLLM.
		const response = await requestLLM(prompt, history, schema, 0.9);

		if (!response.success || !response.result) {
			throw new Error(response.error || 'Failed to summarize student chat due to LLM error.');
		}

		// Summary points and key points are already processed (normalized, language-cleaned).
		let processed_summary_points = response.result.student_summary;
		let processed_key_points = response.result.student_key_points;

		// Add numbering to summary points if the presentation format requires a list.
		const numbered_summary_points = processed_summary_points.map((point, index) => {
			if (presentationMap[presentation] >= 2) {
				return `${index + 1}. ${point}`;
			}
			return point;
		});

		const finalSummary = numbered_summary_points.join('\n\n');

		return {
			success: true,
			summary: finalSummary,
			key_points: processed_key_points,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeStudentChat for history:', history, error);
		return {
			success: false,
			summary: '',
			key_points: [],
			error: error instanceof Error ? error.message : 'Error in summarizeStudentChat'
		};
	}
}

/**
 * Summarizes concepts from a collection of student opinions.
 * Each opinion consists of a summary and key points.
 *
 * @param student_opinion An array of objects, each with a student's summary and key points.
 * @returns An object containing success status, lists of similar and different viewpoints,
 *          a combined student summary, or an error message.
 */
export async function summarizeConcepts(
	student_opinion: { summary: string; keyPoints: string[] }[]
) {
	// Format student opinions as chat history for the LLM.
	const history = student_opinion.map((opinion) => ({
		role: 'user' as const,
		content: `摘要：${opinion.summary}\n關鍵字：${opinion.keyPoints.join(',')}` // Summary and Keywords in Chinese
	}));
	try {
		// Define the expected schema for the LLM's response.
		const schema = z.object({
			similar_view_points: z.array(z.string()),
			different_view_points: z.array(z.string()),
			students_summary: z.string()
		});

		// Call the LLM; text processing is handled by requestLLM.
		const response = await requestLLM(CONCEPT_SUMMARY_PROMPT, history, schema, 0.9);

		if (!response.success || !response.result) {
			throw new Error(response.error || 'Failed to summarize concepts due to LLM error.');
		}

		// All response fields are already processed.
		return {
			success: true,
			similar_view_points: response.result.similar_view_points,
			different_view_points: response.result.different_view_points,
			students_summary: response.result.students_summary,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeConcepts for opinions:', student_opinion, error);
		return {
			success: false,
			similar_view_points: [],
			different_view_points: [],
			students_summary: '',
			error: error instanceof Error ? error.message : 'Error in summarizeConcepts'
		};
	}
}

/**
 * Summarizes group opinions from a list of discussion entries.
 *
 * @param student_opinion An array of discussion entries.
 * @param presentation The desired presentation format for the summary.
 * @param textStyle The desired text style for the summary.
 * @returns An object containing success status, the group summary, extracted keywords with strengths, or an error message.
 */
export async function summarizeGroupOpinions(
	student_opinion: Discussion[],
	presentation: string = 'paragraph',
	textStyle: string = 'default'
) {
	// Format discussion entries for the LLM, filtering out messages from '摘要小幫手' (Summary Helper).
	const formatted_opinions = student_opinion
		.filter((opinion) => opinion.speaker !== '摘要小幫手') // Filter out helper's own messages
		.map((opinion) => `${opinion.speaker}: ${opinion.content}`)
		.join('\n');
	const history = [
		{
			role: 'user' as const,
			content: formatted_opinions
		}
	];

	// Mappings for presentation and text style.
	const presentationMap: Record<string, number> = {
		paragraph: 1,
		list2: 2,
		list3: 3,
		list4: 4,
		list5: 5
	};
	const textStyleMap: Record<string, string> = {
		default: '預設',
		humor: '幽默',
		serious: '嚴肅',
		casual: '輕鬆',
		cute: '可愛'
	};

	// Construct the system prompt.
	const system_prompt = GROUP_OPINION_SUMMARY_PROMPT.replace(
		'{presentation}',
		(presentationMap[presentation] || presentationMap.paragraph).toString()
	).replace('{textStyle}', textStyleMap[textStyle] || textStyleMap.default);

	try {
		// Define the expected schema for the LLM's response.
		const schema = z.object({
			group_summary: z.array(z.string()).length(presentationMap[presentation] || 1),
			group_keywords: z.array(
				z.object({
					keyword: z.string(), // Keyword text
					strength: z.number() // Associated strength/relevance
				})
			)
		});

		// Call the LLM; text processing (including keywords) is handled by requestLLM.
		const response = await requestLLM(system_prompt, history, schema, 0.9);

		if (!response.success || !response.result) {
			throw new Error(response.error || 'Failed to summarize group opinions due to LLM error.');
		}

		// Group summary points are already processed.
		let processed_summary_points = response.result.group_summary;

		// Add numbering if needed.
		const numbered_summary_points = processed_summary_points.map((point, index) => {
			if (presentationMap[presentation] >= 2) {
				return `${index + 1}. ${point}`;
			}
			return point;
		});
		const final_summary = numbered_summary_points.join('\n\n');

		// Keywords are also already processed.
		const final_keywords: Record<string, number> = {};
		for (const kw_obj of response.result.group_keywords) {
			final_keywords[kw_obj.keyword] = kw_obj.strength;
		}

		return {
			success: true,
			summary: final_summary,
			keywords: final_keywords,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions for opinions:', student_opinion, error);
		return {
			success: false,
			summary: '',
			keywords: {},
			error: error instanceof Error ? error.message : 'Error in summarizeGroupOpinions'
		};
	}
}
