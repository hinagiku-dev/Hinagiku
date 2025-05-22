import { z } from '$lib/ai';
import type { LLMChatMessage } from '$lib/server/types';
import { _requestLLMInternal } from './gemini_utils'; // Using _requestLLMInternal directly to control skipResponseProcessing
import {
	HARMFUL_CONTENT_DETECTION_PROMPT,
	OFF_TOPIC_DETECTION_PROMPT
} from './prompt';

/**
 * Checks if the given content is harmful.
 * Uses the LLM with a specific prompt for harmful content detection.
 *
 * @param content The text content to check.
 * @returns An object indicating success, whether the content is harmful, or an error message.
 */
export async function isHarmfulContent(content: string) {
	// Prepare a minimal history for the LLM, focusing on the content to be checked.
	const history = [
		{
			role: 'user' as const,
			content: content
		}
	];
	try {
		// Define the expected schema for the LLM's response (a boolean flag).
		const schema = z.object({ isHarmful: z.boolean() });

		// Call the LLM. `skipResponseProcessing` is true because the result is a boolean
		// and doesn't require text normalization or language cleaning.
		const response = await _requestLLMInternal(
			HARMFUL_CONTENT_DETECTION_PROMPT, // Prompt for harmful content detection
			history,
			schema,
			0.1, // Low temperature for more deterministic (less creative) output
			0.5,
			true // Skip text processing for the boolean result
		);

		if (!response.success || !response.result) {
			// Handle LLM call failure or unexpected result format.
			throw new Error(response.error || 'Failed to check for harmful content due to LLM error.');
		}
		return {
			success: true,
			harmfulContent: response.result.isHarmful, // The boolean result from the LLM
			error: ''
		};
	} catch (error) {
		console.error('Error in isHarmfulContent for content:', content, error);
		return {
			success: false,
			harmfulContent: false, // Assume not harmful on error, to be safe
			error: error instanceof Error ? error.message : 'Error in isHarmfulContent'
		};
	}
}

/**
 * Checks if the conversation history is off-topic relative to a given topic and subtasks.
 *
 * @param history The conversation history.
 * @param topic The main topic of the conversation.
 * @param subtasks A list of relevant subtasks.
 * @returns An object indicating success, whether the conversation is off-topic, or an error message.
 */
export async function isOffTopic(history: LLMChatMessage[], topic: string, subtasks: string[]) {
	// Extract the last two messages for context, if available.
	const llm_message = history.length > 1 ? history[history.length - 2].content : '';
	const student_message = history.length > 0 ? history[history.length - 1].content : '';

	// Construct the system prompt for off-topic detection.
	const system_prompt = OFF_TOPIC_DETECTION_PROMPT.replace('{llmMessage}', llm_message)
		.replace('{studentMessage}', student_message)
		.replace('{topic}', topic)
		.replace('{subtopic}', subtasks.join('\n'));
	try {
		// Define the expected schema for the LLM's response.
		const schema = z.object({ isOffTopic: z.boolean() });

		// Call the LLM. `skipResponseProcessing` is true as the result is a boolean.
		const response = await _requestLLMInternal(
			system_prompt,
			history,
			schema,
			0.1, // Low temperature
			0.5,
			true // Skip text processing for the boolean result
		);

		if (!response.success || !response.result) {
			// Handle LLM call failure.
			throw new Error(response.error || 'Failed to check if off-topic due to LLM error.');
		}
		return {
			success: true,
			offTopic: response.result.isOffTopic, // The boolean result
			error: ''
		};
	} catch (error) {
		console.error('Error in isOffTopic for topic:', topic, 'history:', history, error);
		return {
			success: false,
			offTopic: false, // Assume on-topic on error
			error: error instanceof Error ? error.message : 'Error in isOffTopic'
		};
	}
}
