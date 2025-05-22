import { llmModel, z } from '$lib/ai';
import type { LLMChatMessage } from '$lib/server/types';
import {
	FOREIGN_LANGUAGE_DETECTION_PROMPT,
	HISTORY_PROMPT,
	SUBTASKS_COMPLETED_PROMPT,
	SUBTASK_PREFIX_PROMPT
} from './prompt';
import { normalizeText } from '$lib/utils/normalization';

/**
 * Recursively processes LLM response data to normalize text and clean foreign languages.
 * It handles strings, arrays, and objects.
 * @param data The data to process. Can be a string, array, or object.
 * @returns The processed data with strings normalized and cleaned.
 */
async function _processLLMResponse(data: any): Promise<any> {
	if (typeof data === 'string') {
		const normalized = normalizeText(data);
		// Avoid re-processing prompts or specific content related to language cleaning itself.
		// This is a heuristic to prevent infinite loops if cleanForeignLanguage's own prompt text
		// were to be passed back through this processing.
		if (
			data === normalized &&
			(data.includes('Revised text after translation') || data.includes('Original text was in English'))
		) {
			return data; // Return original if it's part of the prompt for cleanForeignLanguage
		}

		// Call cleanForeignLanguage to detect and revise non-English content.
		// cleanForeignLanguage itself calls _requestLLMInternal with skipResponseProcessing=true.
		const langCheck = await cleanForeignLanguage(normalized);
		if (langCheck.success && langCheck.containsForeignLanguage) {
			// console.log('Foreign language detected, replacing with cleaned version in _processLLMResponse');
			return langCheck.revisedText;
		}
		return normalized; // Return normalized text if no foreign language or if cleaning failed
	} else if (Array.isArray(data)) {
		// If data is an array, process each item recursively.
		return Promise.all(data.map((item) => _processLLMResponse(item)));
	} else if (typeof data === 'object' && data !== null) {
		// If data is an object, check if it's the direct output of cleanForeignLanguage.
		// This is another safeguard against reprocessing and potential loops.
		if ('containsForeignLanguage' in data && 'revisedText' in data) {
			return data; // Return as is if it's a direct cleanForeignLanguage output object
		}
		// Otherwise, process each value in the object recursively.
		const processedObject: { [key: string]: any } = {};
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				processedObject[key] = await _processLLMResponse(data[key]);
			}
		}
		return processedObject;
	}
	// Return data মানুষ if it's not a string, array, or object (e.g., number, boolean).
	return data;
}

/**
 * Internal helper function to make a request to the LLM.
 * It handles the core generation logic, schema validation, and optional response processing.
 * This function is typically not called directly from outside this module, except by other gemini_*.ts files.
 * For general LLM requests, use the `requestLLM` wrapper.
 *
 * @param system_prompt The system prompt to guide the LLM.
 * @param history A list of previous chat messages for context.
 * @param schema A Zod schema to validate the LLM's output.
 * @param temperature Controls randomness in output. Lower is more deterministic.
 * @param topP Controls nucleus sampling.
 * @param skipResponseProcessing If true, skips the `_processLLMResponse` step. Useful for internal calls like `cleanForeignLanguage`.
 * @returns An object containing the success status, the processed LLM result, or an error message.
 */
export async function _requestLLMInternal(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	temperature: number = 0.1,
	topP: number = 0.5,
	skipResponseProcessing: boolean = false
) {
	try {
		// Generate content using the llmModel
		const { output } = await llmModel.generate({
			system: system_prompt,
			prompt: HISTORY_PROMPT.replace(
				'{chatHistory}',
				history.map((msg) => `${msg.name ? msg.name : msg.role}: ${msg.content}`).join('\n')
			),
			output: {
				schema: schema // Expect LLM output to conform to this schema
			},
			config: { temperature: temperature, topP: topP } // LLM generation parameters
		});

		// Check if the LLM returned any output
		if (!output) {
			// This case should ideally be rare if the LLM is functioning correctly.
			console.error('LLM generation returned no output for prompt:', system_prompt);
			throw new Error('LLM generation returned no output');
		}

		// Validate the LLM's output against the provided schema
		const parsedResult = schema.safeParse(output);

		if (!parsedResult.success) {
			// Log the validation error details for debugging
			console.error(
				'Schema validation failed for prompt:',
				system_prompt,
				'Error:',
				parsedResult.error.flatten()
			);
			throw new Error(`Schema validation failed: ${parsedResult.error.message}`);
		}

		// Process the validated data (normalization, language cleaning) unless skipped
		let processedData = parsedResult.data;
		if (!skipResponseProcessing) {
			processedData = await _processLLMResponse(parsedResult.data);
		}

		return {
			success: true,
			result: processedData,
			error: '' // No error
		};
	} catch (error) {
		// Catch any errors during generation, validation, or processing
		console.error('Error in _requestLLMInternal for prompt:', system_prompt, error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error in _requestLLMInternal';
		return {
			success: false,
			result: null, // No result on error
			error: errorMessage
		};
	}
}

/**
 * Public wrapper function for making requests to the LLM.
 * This function includes response processing (normalization, language cleaning) by default.
 *
 * @param system_prompt The system prompt to guide the LLM.
 * @param history A list of previous chat messages for context.
 * @param schema A Zod schema to validate the LLM's output.
 * @param temperature Controls randomness in output.
 * @param topP Controls nucleus sampling.
 * @returns An object containing the success status, the processed LLM result, or an error message.
 */
export async function requestLLM(
	system_prompt: string,
	history: LLMChatMessage[],
	schema: z.ZodSchema,
	temperature: number = 0.1,
	topP: number = 0.5
) {
	// Calls the internal function, ensuring response processing is enabled.
	return _requestLLMInternal(system_prompt, history, schema, temperature, topP, false);
}

/**
 * Detects and cleans foreign language content from a given text string.
 * It uses an LLM to identify if the text contains non-English content and, if so,
 * attempts to translate it or provide an English-only version.
 * Also removes common chat history markers.
 *
 * @param content The text content to clean.
 * @returns An object indicating success, whether foreign language was found, the revised text, and any error.
 */
export async function cleanForeignLanguage(content: string) {
	const history = [
		{
			role: 'user' as const, // Role for the LLM prompt
			content: content // The text to be checked
		}
	];

	try {
		// Define the expected schema for the LLM's response
		const schema = z.object({
			containsForeignLanguage: z.boolean(), // True if foreign language is detected
			revisedText: z.string() // The cleaned or translated text
		});

		// Call the LLM to perform language detection and cleaning.
		// `skipResponseProcessing` is true because we don't want this specific LLM call's output
		// (which is about language cleaning) to be itself put through language cleaning.
		const response = await _requestLLMInternal(
			FOREIGN_LANGUAGE_DETECTION_PROMPT, // Prompt specifically for language detection
			history,
			schema,
			0.1, // Low temperature for more deterministic output
			0.5,
			true // CRITICAL: Skip response processing to prevent recursion
		);

		if (!response.success || !response.result) {
			// If the LLM call fails or returns no result
			throw new Error(response.error || 'Failed to clean foreign language due to LLM error.');
		}

		let revisedText = response.result.revisedText;

		// Post-process the revised text to remove common chat history/format markers.
		// This is a heuristic cleanup based on observed LLM outputs.
		revisedText = revisedText
			.replace(/^以下是對話紀錄[：:].*/gim, '') // Chinese marker for "conversation history"
			.replace(/^對話紀錄[:：]?\s*.*/gim, '') // Chinese marker for "conversation history"
			.replace(/^conversation history[:：]?\s*.*/gim, '') // English marker
			.replace(/^user[:：]?\s*.*/gim, '') // "user:" marker
			.replace(/^assistant[:：]?\s*.*/gim, '') // "assistant:" marker
			.replace(/^system[:：]?\s*.*/gim, '') // "system:" marker
			.trim(); // Remove leading/trailing whitespace

		return {
			success: true,
			containsForeignLanguage: response.result.containsForeignLanguage,
			revisedText: revisedText, // The cleaned and marker-stripped text
			error: ''
		};
	} catch (error) {
		console.error('Error in cleanForeignLanguage for content:', content, error);
		return {
			success: false,
			containsForeignLanguage: false, // Assume no foreign language on error, return original
			revisedText: content, // Return original content if cleaning fails
			error: error instanceof Error ? error.message : 'Error in cleanForeignLanguage'
		};
	}
}

/**
 * Checks which of the given subtasks have been completed based on the chat history.
 *
 * @param history The conversation history.
 * @param subtasks A list of subtask descriptions.
 * @returns An object indicating success and a boolean array corresponding to the completion status of each subtask.
 */
export async function checkSubtaskCompleted(history: LLMChatMessage[], subtasks: string[]) {
	// Format the chat history and subtasks for the LLM prompt
	const formatted_history = history.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
	const system_prompt = SUBTASKS_COMPLETED_PROMPT.replace(
		'{chatHistory}',
		formatted_history
	).replace(
		'{subtasks}',
		subtasks.map((subtask) => SUBTASK_PREFIX_PROMPT.replace('{subtask}', subtask)).join('\n')
	);

	try {
		// Define the expected schema for the LLM's response
		const schema = z.object({
			// An object where keys are subtask descriptions and values are booleans
			satisfied: z.object(Object.fromEntries(subtasks.map((subtask) => [subtask, z.boolean()]))),
			// An array of strings listing the subtasks the LLM considers satisfied (textual output)
			satisfied_subtasks: z.array(z.string())
		});

		// Call the LLM. Response processing (normalization, language cleaning) is enabled
		// for `satisfied_subtasks` as it's textual.
		const response = await _requestLLMInternal(system_prompt, history, schema, 0.1, 0.5, false);

		if (!response.success || !response.result) {
			throw new Error(response.error || 'Failed to check subtask completion due to LLM error.');
		}

		// Map the boolean results from the 'satisfied' object to an array based on the original subtask order.
		const completed = subtasks.map((subtask) => response.result.satisfied[subtask]);
		return {
			success: true,
			completed: completed // Boolean array indicating completion status
		};
	} catch (error) {
		console.error('Error in checkSubtaskCompleted for subtasks:', subtasks, error);
		return {
			success: false,
			completed: [], // Return empty array on error
			error: error instanceof Error ? error.message : 'Error in checkSubtaskCompleted'
		};
	}
}
