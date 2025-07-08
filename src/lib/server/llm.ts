/**
 * @fileoverview
 * LLM (Large Language Model) service module for the Hinagiku educational platform.
 *
 * This module provides comprehensive AI-powered functions for:
 * - Student conversation analysis and summarization
 * - Content moderation (harmful content and off-topic detection)
 * - Foreign language detection and cleaning
 * - Group discussion summarization and keyword extraction
 * - Educational guidance and introduction generation
 * - Session-wide learning progress tracking
 *
 * All functions use structured prompts and schema validation to ensure
 * consistent, reliable responses from the AI model.
 */

import { chatModel, z } from '$lib/ai';
import type { Resource } from '$lib/schema/resource';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import {
	CHAT_SUMMARY_PROMPT,
	CONCEPT_SUMMARY_PROMPT,
	DOCS_CONTEXT_RESPONSE_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	FOREIGN_LANGUAGE_DETECTION_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT,
	HARMFUL_CONTENT_DETECTION_PROMPT,
	HEY_HELP_PROMPT,
	HISTORY_PROMPT,
	INTRODUCTION_PROMPT,
	OFF_TOPIC_DETECTION_PROMPT,
	SESSION_SUMMARY_PROMPT,
	SUBTASKS_COMPLETED_PROMPT,
	SUBTASK_PREFIX_PROMPT
} from './prompt';

import { normalizeText } from '$lib/utils/normalization';

/**
 * Core function to make requests to the Large Language Model with structured output validation.
 *
 * This function handles all LLM interactions in the application, providing a consistent
 * interface for AI-generated content with proper schema validation and error handling.
 *
 * @param system_prompt - The system prompt that defines the AI's role and behavior context
 * @param history - Array of conversation messages to provide context to the AI
 * @param schema - Zod schema for validating and parsing the AI's structured response
 * @param temperature - Controls randomness (0.0 = deterministic, 1.0 = very random). Default: 0.1
 * @param topP - Controls diversity of token selection (0.0 = narrow, 1.0 = broad). Default: 0.5
 *
 * @returns Promise resolving to either:
 *   - Success: { success: true, result: parsed_response, error: '' }
 *   - Failure: { success: false, result: null, error: 'Error message' }
 *
 * @example
 * ```typescript
 * const schema = z.object({ summary: z.string() });
 * const result = await requestLLM(prompt, history, schema, 0.5);
 * if (result.success) {
 *   console.log(result.result.summary);
 * }
 * ```
 */
export async function requestLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	temperature: number = 0.1,
	topP: number = 0.5
) {
	try {
		const { output } = await chatModel.generate({
			system: system_prompt,
			prompt: HISTORY_PROMPT.replace(
				'{chatHistory}',
				// Format conversation history into a readable string for the AI context
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

/**
 * Analyzes content to detect potentially harmful material including explicit content,
 * violence, and hate speech.
 *
 * This function is crucial for maintaining a safe educational environment by
 * automatically flagging inappropriate content that students might submit.
 * Uses AI classification to determine content safety.
 *
 * @param content - The text content to analyze for harmful material
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, harmfulContent: boolean, error: '' }
 *   - Failure: { success: false, harmfulContent: false, error: 'Error message' }
 *
 * @example
 * ```typescript
 * const result = await isHarmfulContent("Some user message");
 * if (result.success && result.harmfulContent) {
 *   // Block or flag the content for review
 *   handleInappropriateContent();
 * }
 * ```
 */
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

/**
 * Determines if a student's conversation has veered off the assigned learning topic.
 *
 * This function helps maintain educational focus by detecting when students
 * stray from the main discussion topic or subtasks. It considers both the
 * most recent LLM response and student message to make contextual decisions.
 *
 * @param history - Complete conversation history for context analysis
 * @param topic - The main learning topic/question students should focus on
 * @param subtasks - Array of specific subtasks that are considered on-topic
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, offTopic: boolean, error: '' }
 *   - Failure: { success: false, offTopic: false, error: 'Error message' }
 *
 * @example
 * ```typescript
 * const result = await isOffTopic(history, "Climate Change", ["causes", "effects"]);
 * if (result.success && result.offTopic) {
 *   // Gently redirect student back to the topic
 *   sendRedirectionMessage();
 * }
 * ```
 */
export async function isOffTopic(history: LLMChatMessage[], topic: string, subtasks: string[]) {
	// Extract the last LLM message and student response for contextual analysis
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

/**
 * Detects and removes foreign language content from text, ensuring consistency
 * in Traditional Chinese educational content.
 *
 * This function is essential for maintaining language consistency in the educational
 * platform, as it identifies content in languages other than Traditional Chinese
 * and English, then provides cleaned versions. It also removes conversation format
 * markers that shouldn't appear in final responses.
 *
 * @param content - Text content to analyze and potentially clean
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, containsForeignLanguage: boolean, revisedText: string, error: '' }
 *   - Failure: { success: false, containsForeignLanguage: false, revisedText: original_content, error: 'Error message' }
 *
 * Languages detected as foreign: Simplified Chinese, Japanese, Korean, Russian, Ukrainian, etc.
 * Conversation markers removed: "以下是對話紀錄:", "user:", "assistant:", "system:", etc.
 *
 * @example
 * ```typescript
 * const result = await cleanForeignLanguage("user: Hello 你好 こんにちは");
 * if (result.success && result.containsForeignLanguage) {
 *   console.log(result.revisedText); // "Hello 你好" (Japanese removed, markers removed)
 * }
 * ```
 */
export async function cleanForeignLanguage(content: string) {
	// Create conversation context for the AI to analyze the content
	const history = [
		{
			role: 'user' as const,
			content: content
		}
	];

	try {
		const schema = z.object({
			containsForeignLanguage: z.boolean(),
			revisedText: z.string()
		});

		const { result } = await requestLLM(FOREIGN_LANGUAGE_DETECTION_PROMPT, history, schema, 0.1);
		const parsed_result = schema.parse(result);

		// Post-process the AI's response to ensure conversation format markers are completely removed
		let revisedText = parsed_result.revisedText;

		// Remove conversation format markers that shouldn't appear in chat responses
		// These patterns match common conversation logging formats in both Chinese and English
		revisedText = revisedText
			.replace(/^以下是對話紀錄[：:].*/gim, '') // "Following is conversation record:"
			.replace(/^對話紀錄[:：]?\s*.*/gim, '') // "Conversation record:"
			.replace(/^conversation history[:：]?\s*.*/gim, '') // English conversation markers
			.replace(/^user[:：]?\s*.*/gim, '') // User: prefixes
			.replace(/^assistant[:：]?\s*.*/gim, '') // Assistant: prefixes
			.replace(/^system[:：]?\s*.*/gim, '') // System: prefixes
			.trim();

		return {
			success: true,
			containsForeignLanguage: parsed_result.containsForeignLanguage,
			revisedText: revisedText,
			error: ''
		};
	} catch (error) {
		// In case of error, return original content to avoid data loss
		console.error('Error in containForeignLanguage:', error);
		return {
			success: false,
			containsForeignLanguage: false,
			revisedText: content,
			error: 'Error in containForeignLanguage'
		};
	}
}

/**
 * Internal function to check which subtasks have been completed based on conversation history.
 *
 * This function analyzes the entire conversation to determine student progress
 * through assigned learning subtasks. It's used internally by other functions
 * to track educational advancement and guide further interactions.
 *
 * @param history - Complete conversation history to analyze for completed subtasks
 * @param subtasks - Array of subtask descriptions to check completion status for
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, completed: boolean[] }
 *   - Failure: { success: false, completed: [], error: 'Error message' }
 *
 * The returned boolean array corresponds to subtasks array indices.
 */
async function checkSubtaskCompleted(history: LLMChatMessage[], subtasks: string[]) {
	// Format conversation history for AI analysis
	const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
	const system_prompt = SUBTASKS_COMPLETED_PROMPT.replace(
		'{chatHistory}',
		formatted_history
	).replace(
		'{subtasks}',
		// Prefix each subtask with standardized format for consistent AI evaluation
		subtasks.map((subtask) => SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask)).join('\n')
	);

	try {
		// Create dynamic schema where each subtask becomes a boolean field
		const schema = z.object({
			satisfied: z.object(Object.fromEntries(subtasks.map((subtask) => [subtask, z.boolean()]))),
			satisfied_subtasks: z.array(z.string())
		});
		const { result } = await requestLLM(system_prompt, history, schema, 0.1);
		const parsed_result = schema.parse(result);

		// Convert object-based results to boolean array matching subtasks order
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

/**
 * Generates an introductory message to welcome students and initiate learning sessions.
 *
 * This function creates personalized introductions for students based on their
 * assigned task, subtasks, and available learning resources. The AI assistant
 * introduces itself and begins guiding students toward their learning objectives.
 *
 * @param task - The main learning objective or question students should work toward
 * @param subtasks - Array of specific learning goals that support the main task
 * @param resources - Educational materials (documents, links, etc.) available for reference
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, response: introduction_text, error: '' }
 *   - Failure: { success: false, response: '', error: 'Error message' }
 *
 * @example
 * ```typescript
 * const intro = await generateIntroduction(
 *   "Understanding climate change",
 *   ["causes", "effects", "solutions"],
 *   [{ name: "Climate Report", content: "..." }]
 * );
 * ```
 */
export async function generateIntroduction(
	task: string,
	subtasks: string[],
	resources: Resource[]
) {
	// Format resource documents for AI context
	const formatted_docs = resources
		.map((doc, index) => {
			const title = doc.name || `Document ${index + 1}`;
			return `[${title}]:\n${doc.content}`;
		})
		.join('\n\n');

	// Prepare subtasks with consistent formatting for AI processing
	const formattedSubtasks = subtasks.map((subtask) => {
		return SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask);
	});

	// Create comprehensive system prompt with all learning context
	const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
		.replace('{subtasks}', formattedSubtasks.join('\n'))
		.replace('{resources}', formatted_docs)
		.replace('{response_prompt}', ''); // No specific response format for introductions

	const schema = z.object({
		introduction: z.string()
	});

	try {
		const response = await requestLLM(
			system_prompt,
			[{ role: 'user', content: INTRODUCTION_PROMPT }],
			schema,
			0.5 // Slightly higher temperature for more natural introductions
		);
		if (!response.success) {
			throw new Error('Failed to get response');
		}

		const { introduction } = schema.parse(response.result) as z.infer<typeof schema>;

		let normalized_response = normalizeText(introduction);

		// Ensure introduction uses consistent language (Traditional Chinese/English only)
		const languageCheck = await cleanForeignLanguage(normalized_response);
		if (languageCheck.success && languageCheck.containsForeignLanguage) {
			console.log('Foreign language detected in LLM response, replacing with cleaned version');
			normalized_response = languageCheck.revisedText;
			console.log(normalized_response);
		}

		return {
			success: true,
			response: normalized_response,
			error: ''
		};
	} catch (error) {
		console.error('Error in introduce:', error);
		return {
			success: false,
			response: '',
			error: 'Error in introduce'
		};
	}
}

/**
 * Main conversational function that processes student messages and generates educational responses.
 *
 * This is the core interaction function that powers the AI teaching assistant. It:
 * - Analyzes student input within the context of assigned tasks and resources
 * - Generates structured educational responses (affirmation, elaboration, question)
 * - Tracks learning progress through subtask completion
 * - Monitors for harmful content and off-topic discussions
 * - Maintains consistent language use
 *
 * @param history - Complete conversation history for context awareness
 * @param task - Main learning objective students are working toward
 * @param subtasks - Specific learning goals that support the main task
 * @param subtaskCompleted - Current completion status for each subtask
 * @param resources - Educational materials available for reference and guidance
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, response: formatted_response, subtask_completed: boolean[], warning: {moderation, off_topic}, error: '' }
 *   - Failure: { success: false, response: '', subtask_completed: [], warning: {false, false}, error: 'Error message' }
 *
 * Response structure follows educational best practices:
 * - Affirmation: Acknowledges and validates student input
 * - Elaboration: Provides deeper guidance using first-person narrative
 * - Question: Directs student toward next learning steps
 *
 * @example
 * ```typescript
 * const result = await chatWithLLMByDocs(
 *   conversationHistory,
 *   "Climate change impacts",
 *   ["causes", "effects"],
 *   [true, false],
 *   resourceDocuments
 * );
 * ```
 */
export async function chatWithLLMByDocs(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	subtaskCompleted: boolean[],
	resources: Resource[]
) {
	// Format educational resources for AI context
	const formatted_docs = resources
		.map((doc, index) => {
			const title = doc.name || `Document ${index + 1}`;
			return `[${title}]:\n${doc.content}`;
		})
		.join('\n\n');

	// Prepare subtasks with completion status for AI guidance
	const formattedSubtasks = subtasks.map((subtask, index) => {
		return subtaskCompleted[index]
			? `(完成)` // "(Completed)" marker for finished subtasks
			: `(未完成)` + SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask); // "(Incomplete)" with guidance
	});

	// Create comprehensive system prompt with educational context
	const system_prompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{task}', task)
		.replace('{subtasks}', formattedSubtasks.join('\n'))
		.replace('{resources}', formatted_docs)
		.replace('{response_prompt}', DOCS_CONTEXT_RESPONSE_PROMPT);

	// Define expected response structure for educational conversations
	const schema = z.object({
		affirmation: z.string(), // Validates student understanding
		elaboration: z.string(), // Provides deeper educational content
		question: z.string() // Guides next learning steps
	});

	try {
		// Run parallel analysis for efficiency: content generation + safety checks + progress tracking
		const [response, subtask_completed, moderation, off_topic] = await Promise.all([
			requestLLM(system_prompt, history, schema, 0.5),
			checkSubtaskCompleted(history, subtasks),
			isHarmfulContent(history.length > 0 ? history[history.length - 1].content : ''),
			isOffTopic(history, task, subtasks)
		]);

		// Ensure all analysis functions succeeded before proceeding
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

		// Combine response components with proper formatting
		let normalized_response = `${normalizeText(affirmation)}\n\n${normalizeText(elaboration)}\n\n${normalizeText(
			question
		)}`;

		// Ensure response uses consistent language standards
		const languageCheck = await cleanForeignLanguage(normalized_response);
		if (languageCheck.success && languageCheck.containsForeignLanguage) {
			console.log('Foreign language detected in LLM response, replacing with cleaned version');
			normalized_response = languageCheck.revisedText;
			console.log(normalized_response);
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

/**
 * Summarizes individual student conversations and extracts key learning points.
 *
 * This function analyzes a student's chat history to create personalized summaries
 * of their learning journey. It extracts main viewpoints and key concepts discussed,
 * supporting various presentation formats and text styles for different contexts.
 *
 * @param history - Complete conversation history for the individual student
 * @param presentation - Output format: 'paragraph' (1 point) or 'list2-5' (2-5 points). Default: 'paragraph'
 * @param textStyle - Tone of summary: 'default', 'humor', 'serious', 'casual', 'cute'. Default: 'default'
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, summary: formatted_text, key_points: string[], error: '' }
 *   - Failure: { success: false, summary: '', key_points: [], error: 'Error message' }
 *
 * The summary format adapts based on presentation parameter:
 * - paragraph: Single cohesive paragraph
 * - list2-5: Numbered list with 2-5 main points
 *
 * @example
 * ```typescript
 * const summary = await summarizeStudentChat(
 *   studentHistory,
 *   'list3',      // Want 3 main points
 *   'casual'      // Casual tone
 * );
 * ```
 */
export async function summarizeStudentChat(
	history: LLMChatMessage[],
	presentation: string = 'paragraph',
	textStyle: string = 'default'
) {
	try {
		// Define presentation format mapping for consistent AI understanding
		const presentationMap: Record<string, number> = {
			paragraph: 1, // Single paragraph summary
			list2: 2, // 2-point list
			list3: 3, // 3-point list
			list4: 4, // 4-point list
			list5: 5 // 5-point list
		};

		// Schema expects dynamic array length based on presentation choice
		const schema = z.object({
			student_summary: z.array(z.string()).length(presentationMap[presentation] || 1),
			student_key_points: z.array(z.string())
		});

		// Text style mapping for Traditional Chinese educational context
		const textStyleMap: Record<string, string> = {
			default: '預設', // Default/neutral tone
			humor: '幽默', // Humorous tone
			serious: '嚴肅', // Serious/formal tone
			casual: '輕鬆', // Casual/relaxed tone
			cute: '可愛' // Cute/friendly tone
		};

		// Prepare system prompt with formatting and style specifications
		const prompt = CHAT_SUMMARY_PROMPT.replace(
			'{presentation}',
			(presentationMap[presentation] || presentationMap.paragraph).toString()
		).replace('{textStyle}', textStyleMap[textStyle] || textStyleMap.default);

		const { result } = await requestLLM(prompt, history, schema, 0.9); // Higher temperature for creativity
		const parsed_result = schema.parse(result);

		// Process summary points with appropriate formatting
		let summary = parsed_result.student_summary.map((point, index) => {
			// Add numbering for multi-point formats
			if (presentationMap[presentation] >= 2) {
				return normalizeText(`${index + 1}. ${point}`);
			}
			return normalizeText(point);
		});
		let key_points = parsed_result.student_key_points.map((point) => normalizeText(point));

		// Ensure language consistency across all summary points
		const checkedSummary = await Promise.all(
			summary.map(async (point) => {
				const summaryCheck = await cleanForeignLanguage(point);
				if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
					console.log('Foreign language detected in summary point, replacing with cleaned version');
					return summaryCheck.revisedText;
				}
				return point;
			})
		);
		summary = checkedSummary;

		// Ensure language consistency across all key points
		const checkedKeyPoints = await Promise.all(
			key_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log('Foreign language detected in key point, replacing with cleaned version');
					return pointCheck.revisedText;
				}
				return point;
			})
		);
		key_points = checkedKeyPoints;

		// Combine summary points into final formatted text with double line breaks for readability
		const finalSummary = summary.join('\n\n');

		return {
			success: true,
			summary: finalSummary,
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

/**
 * Analyzes and summarizes conceptual understanding across multiple student opinions.
 *
 * This function takes individual student summaries and key points, then identifies
 * common themes, differences in understanding, and creates a consolidated view
 * of how students collectively understand the learning concepts.
 *
 * @param student_opinion - Array of individual student analysis results containing summaries and key points
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, similar_view_points: string[], different_view_points: string[], students_summary: string, error: '' }
 *   - Failure: { success: false, similar_view_points: [], different_view_points: [], students_summary: '', error: 'Error message' }
 *
 * Output provides:
 * - similar_view_points: Common understanding across students
 * - different_view_points: Areas where students have conflicting views
 * - students_summary: Overall synthesis of collective learning
 *
 * @example
 * ```typescript
 * const concepts = await summarizeConcepts([
 *   { summary: "Climate change is serious", keyPoints: ["warming", "effects"] },
 *   { summary: "Need urgent action", keyPoints: ["policy", "individual"] }
 * ]);
 * ```
 */
export async function summarizeConcepts(
	student_opinion: { summary: string; keyPoints: string[] }[]
) {
	// Format individual student insights for AI analysis
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

		// Normalize content for consistency
		let similar_view_points = parsed_result.similar_view_points.map((point) =>
			normalizeText(point)
		);
		let different_view_points = parsed_result.different_view_points.map((point) =>
			normalizeText(point)
		);
		let students_summary = normalizeText(parsed_result.students_summary);

		// Ensure language consistency in the overall summary
		const summaryCheck = await cleanForeignLanguage(students_summary);
		if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
			console.log('Foreign language detected in students summary, replacing with cleaned version');
			students_summary = summaryCheck.revisedText;
		}

		// Clean similar viewpoints for language consistency
		const checkedSimilarPoints = await Promise.all(
			similar_view_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log(
						'Foreign language detected in similar view point, replacing with cleaned version'
					);
					return pointCheck.revisedText;
				}
				return point;
			})
		);
		similar_view_points = checkedSimilarPoints;

		// Clean different viewpoints for language consistency
		const checkedDifferentPoints = await Promise.all(
			different_view_points.map(async (point) => {
				const pointCheck = await cleanForeignLanguage(point);
				if (pointCheck.success && pointCheck.containsForeignLanguage) {
					console.log(
						'Foreign language detected in different view point, replacing with cleaned version'
					);
					return pointCheck.revisedText;
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

/**
 * Summarizes group discussion content and extracts important keywords with relevance scores.
 *
 * This function analyzes group discussion transcripts to create comprehensive summaries
 * and identify key terms that emerged during collaborative learning. It filters out
 * system-generated content and processes only authentic participant contributions.
 *
 * @param student_opinion - Array of discussion messages from group participants
 * @param presentation - Output format: 'paragraph' (1 point) or 'list2-5' (2-5 points). Default: 'paragraph'
 * @param textStyle - Tone of summary: 'default', 'humor', 'serious', 'casual', 'cute'. Default: 'default'
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, summary: formatted_text, keywords: Record<string, number>, error: '' }
 *   - Failure: { success: false, summary: '', keywords: {}, error: 'Error message' }
 *
 * Keywords are returned as a Record where:
 * - Key: The keyword/phrase identified
 * - Value: Importance score (typically 1-5, higher = more important)
 *
 * @example
 * ```typescript
 * const groupSummary = await summarizeGroupOpinions(
 *   discussionMessages,
 *   'list3',      // Want 3 summary points
 *   'serious'     // Serious academic tone
 * );
 * console.log(groupSummary.keywords); // { "climate": 5, "policy": 3, "action": 4 }
 * ```
 */
export async function summarizeGroupOpinions(
	student_opinion: Discussion[],
	presentation: string = 'paragraph',
	textStyle: string = 'default'
) {
	// Filter out AI-generated content to focus on authentic student contributions
	const formatted_opinions = student_opinion
		.filter((opinion) => opinion.speaker !== '摘要小幫手') // Exclude summary assistant messages
		.map((opinion) => `${opinion.speaker}: ${opinion.content}`)
		.join('\n');
	const history = [
		{
			role: 'user' as const,
			content: formatted_opinions
		}
	];

	// Define presentation format mapping for consistent output structure
	const presentationMap: Record<string, number> = {
		paragraph: 1, // Single cohesive paragraph
		list2: 2, // 2-point summary list
		list3: 3, // 3-point summary list
		list4: 4, // 4-point summary list
		list5: 5 // 5-point summary list
	};

	// Text style mapping for Traditional Chinese educational context
	const textStyleMap: Record<string, string> = {
		default: '預設', // Default/neutral tone
		humor: '幽默', // Humorous tone
		serious: '嚴肅', // Serious/formal tone
		casual: '輕鬆', // Casual/relaxed tone
		cute: '可愛' // Cute/friendly tone
	};

	// Prepare system prompt with formatting and style specifications
	const system_prompt = GROUP_OPINION_SUMMARY_PROMPT.replace(
		'{presentation}',
		(presentationMap[presentation] || presentationMap.paragraph).toString()
	).replace('{textStyle}', textStyleMap[textStyle] || textStyleMap.default);

	try {
		const schema = z.object({
			group_summary: z.array(z.string()).length(presentationMap[presentation] || 1),
			group_keywords: z.array(
				z.object({
					keyword: z.string(),
					strength: z.number() // Importance/relevance score for the keyword
				})
			)
		});
		const { result } = await requestLLM(system_prompt, history, schema, 0.9);
		const parsed_result = schema.parse(result);

		// Process and format summary content with appropriate numbering
		let summary = parsed_result.group_summary
			.map((point, index) => {
				// Add sequential numbering for multi-point formats
				if (presentationMap[presentation] >= 2) {
					return normalizeText(`${index + 1}. ${point}`);
				}
				return normalizeText(point);
			})
			.join('\n\n'); // Double line breaks for readability

		// Ensure summary uses consistent language standards
		const summaryCheck = await cleanForeignLanguage(summary);
		if (summaryCheck.success && summaryCheck.containsForeignLanguage) {
			console.log('Foreign language detected in group summary, replacing with cleaned version');
			summary = summaryCheck.revisedText;
		}

		// Process keywords and ensure language consistency
		const keywords: Record<string, number> = {};

		// Clean each keyword individually to maintain quality
		for (const keywordObj of parsed_result.group_keywords) {
			let keyword = keywordObj.keyword;
			const keywordCheck = await cleanForeignLanguage(keyword);

			if (keywordCheck.success && keywordCheck.containsForeignLanguage) {
				console.log('Foreign language detected in keyword, replacing with cleaned version');
				keyword = keywordCheck.revisedText;
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

/**
 * Provides helpful guidance when students are unsure about discussion direction.
 *
 * This function generates supportive responses when students explicitly request help
 * or seem stuck in their learning process. It uses third-person perspective to
 * encourage group collaboration and maintains focus on educational objectives.
 *
 * @param history - Complete conversation history for context understanding
 * @param task - Main learning objective students should work toward
 * @param subtasks - Specific learning goals that support the main task
 * @param resources - Educational materials available for reference and guidance
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, response: guidance_message, error: '' }
 *   - Failure: { success: false, response: '', error: 'Error message' }
 *
 * Response maintains encouraging tone and provides concrete next steps
 * without directly giving answers, following pedagogical best practices.
 *
 * @example
 * ```typescript
 * const help = await getHeyHelpMessage(
 *   stuckConversation,
 *   "Understanding ecosystems",
 *   ["food chains", "energy flow"],
 *   educationalResources
 * );
 * ```
 */
export async function getHeyHelpMessage(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	resources: Resource[]
) {
	// Format educational resources for AI context
	const formatted_docs = resources
		.map((doc, index) => {
			const title = doc.name || `Document ${index + 1}`;
			return `[${title}]:\n${doc.content}`;
		})
		.join('\n\n');

	// Prepare subtasks with consistent formatting for AI processing
	const formattedSubtasks = subtasks.map((subtask) => {
		return SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask);
	});

	// Combine system prompt with help-specific guidance instructions
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

		// Combine help components into supportive guidance message
		let normalized_response = `${normalizeText(affirmation)}\n\n${normalizeText(elaboration)}\n\n${normalizeText(
			question
		)}`;

		// Ensure guidance uses consistent language standards
		const languageCheck = await cleanForeignLanguage(normalized_response);
		if (languageCheck.success && languageCheck.containsForeignLanguage) {
			console.log('Foreign language detected in HeyHelp response, replacing with cleaned version');
			normalized_response = languageCheck.revisedText;
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

/**
 * Creates comprehensive session-wide summaries combining individual and group learning activities.
 *
 * This function provides the highest-level analysis of a complete learning session,
 * synthesizing individual student progress with group collaboration results to create
 * holistic insights into the educational experience and learning outcomes achieved.
 *
 * @param individualRecords - Array of individual student conversation histories with IDs
 * @param groupRecords - Array of group discussion records with group IDs
 *
 * @returns Promise resolving to:
 *   - Success: { success: true, summary: analysis_object, error: '' }
 *   - Failure: { success: false, summary: null, error: 'Error message' }
 *
 * Summary object contains:
 * - integratedViewpoint: Synthesis of common understanding across all participants
 * - differences: Key areas where individual/group perspectives diverged
 * - learningProgress: Analysis of educational advancement through the session
 * - finalConclusion: Overall assessment of session outcomes and achievements
 *
 * @example
 * ```typescript
 * const sessionSummary = await summarizeSession(
 *   [{ studentId: "123", history: [...] }],
 *   [{ groupId: "A", discussion: [...] }]
 * );
 * ```
 */
export async function summarizeSession(
	individualRecords: { studentId: string; history: LLMChatMessage[] }[],
	groupRecords: { groupId: string; discussion: Discussion[] }[]
) {
	// Format individual learning journeys for analysis
	const individualDiscussions = individualRecords
		.map(
			(record) =>
				`### 學生 ${record.studentId} 的個人學習紀錄:\n` +
				record.history.map((msg) => `${msg.name || msg.role}: ${msg.content}`).join('\n')
		)
		.join('\n\n');

	// Format group collaboration records for analysis
	const groupDiscussions = groupRecords
		.map(
			(record) =>
				`### 小組 ${record.groupId} 的討論紀錄:\n` +
				record.discussion.map((msg) => `${msg.speaker}: ${msg.content}`).join('\n')
		)
		.join('\n\n');

	// Combine all educational activities into comprehensive context
	const fullDiscussion = `## 個人學習紀錄\n${individualDiscussions}\n\n## 小組討論紀錄\n${groupDiscussions}`;

	const system_prompt = SESSION_SUMMARY_PROMPT;
	const history_prompt = [
		{
			role: 'user' as const,
			content: fullDiscussion
		}
	];

	try {
		const schema = z.object({
			integratedViewpoint: z.string(), // Common understanding synthesis
			differences: z.string(), // Areas of divergent thinking
			learningProgress: z.string(), // Educational advancement analysis
			finalConclusion: z.string() // Overall session assessment
		});

		const { result } = await requestLLM(system_prompt, history_prompt, schema, 0.7);
		if (!result) {
			throw new Error('Failed to get result from LLM');
		}
		const parsed_result = schema.parse(result);

		// Normalize each analysis component for consistency
		const summary = {
			integratedViewpoint: normalizeText(parsed_result.integratedViewpoint),
			differences: normalizeText(parsed_result.differences),
			learningProgress: normalizeText(parsed_result.learningProgress),
			finalConclusion: normalizeText(parsed_result.finalConclusion)
		};

		// Ensure language consistency across all summary components
		const fields = Object.values(summary);
		const checkedFields = await Promise.all(
			fields.map(async (field) => {
				const check = await cleanForeignLanguage(field);
				return check.success && check.containsForeignLanguage ? check.revisedText : field;
			})
		);

		// Reconstruct cleaned summary maintaining original structure
		const cleanedSummary = {
			integratedViewpoint: checkedFields[0],
			differences: checkedFields[1],
			learningProgress: checkedFields[2],
			finalConclusion: checkedFields[3]
		};

		return {
			success: true,
			summary: cleanedSummary,
			error: ''
		};
	} catch (error) {
		console.error('Error in summarizeSession:', error);
		return {
			success: false,
			summary: null,
			error: 'Error in summarizeSession'
		};
	}
}
