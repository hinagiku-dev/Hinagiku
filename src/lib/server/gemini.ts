import { env } from '$env/dynamic/private';
import type { Resource } from '$lib/schema/resource';
import type { Discussion, LLMChatMessage } from '$lib/server/types';
import type { ResponseSchema } from '@google/generative-ai';
import {
	BlockReason,
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory,
	SchemaType
} from '@google/generative-ai';
import fs from 'fs/promises';
import { DOCS_CONTEXT_SYSTEM_PROMPT, OFF_TOPIC_DETECTION_PROMPT } from './prompt';

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function requestChatLLM(system_prompt: string, history: LLMChatMessage[]) {
	console.log('Requesting chat LLM:', {
		systemPromptLength: system_prompt.length,
		historyLength: history.length
	});
	try {
		const model = genAI.getGenerativeModel({
			model: 'gemini-1.5-pro',
			systemInstruction: system_prompt
		});
		const msg = history[history.length - 1].content;
		const gemini_history = history.slice(0, history.length - 1).map((log) => ({
			role: log.role == 'user' ? 'user' : 'model',
			parts: [{ text: log.content }]
		}));
		const chat = model.startChat({ history: gemini_history });

		const result = await chat.sendMessage(msg);
		if (!result) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			message: result.response.text()
		};
	} catch (error) {
		return {
			success: false,
			message: '',
			error: error
		};
	}
}

async function requestZodLLM(prompt: string, schema: ResponseSchema) {
	try {
		const model = genAI.getGenerativeModel({
			model: 'gemini-1.5-pro',
			generationConfig: {
				responseMimeType: 'application/json',
				responseSchema: schema
			}
		});
		const result = await model.generateContent(prompt);
		console.log('Received response from LLM', {
			result,
			result_format: schema
		});

		const text = result.response.text();
		const json = JSON.parse(text);
		if (!text) {
			throw new Error('Failed to parse response');
		}

		return {
			success: true,
			message: json
		};
	} catch (error) {
		return {
			success: false,
			message: '',
			error: error
		};
	}
}

export async function checkFileContent(
	filePath: string
): Promise<{ success: boolean; message: string; error?: string }> {
	console.log('Checking file content:', { filePath });
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		console.log('File content read successfully:', { contentLength: content.length });
		if (await isHarmfulContent(content)) {
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

export async function isHarmfulContent(content: string) {
	try {
		const safetySettings = [
			{
				category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
				threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
			},
			{
				category: HarmCategory.HARM_CATEGORY_HARASSMENT,
				threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
			},
			{
				category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
				threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
			},
			{
				category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
				threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
			},
			{
				category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
				threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
			}
		];
		const model = genAI.getGenerativeModel({
			model: 'gemini-1.5-pro',
			safetySettings: safetySettings
		});
		const result = await model.generateContent(content);
		// check all result is illegal
		const harmful = result.response.promptFeedback?.blockReason == BlockReason.SAFETY;
		return {
			success: true,
			harmful: harmful
		};
	} catch (error) {
		return {
			success: false,
			harmful: false,
			error: error
		};
	}
}

async function isOffTopic(
	history: LLMChatMessage[],
	prompt: string
): Promise<{ success: boolean; off_topic: boolean; error?: string }> {
	console.log('Checking if off topic:', { historyLength: history.length });
	if (history.length < 1) {
		return { success: true, off_topic: false };
	}
	try {
		const llm_message = history.length > 1 ? history[history.length - 2].content : prompt;
		const student_message = history[history.length - 1].content;
		const system_prompt = OFF_TOPIC_DETECTION_PROMPT.replace('{llmMessage}', llm_message).replace(
			'{studentMessage}',
			student_message
		);

		const response = await requestZodLLM(system_prompt, {
			description: 'Detect off topic response',
			type: SchemaType.BOOLEAN
		});

		if (!response.success) {
			throw new Error('Failed to detect off topic response');
		}

		return {
			success: true,
			off_topic: response.message,
			error: ''
		};
	} catch (error) {
		console.error('Error in isOffTopic:', error);
		return {
			success: false,
			off_topic: false,
			error: 'Failed to detect off topic'
		};
	}
}

export async function chatWithLLMByDocs(
	history: LLMChatMessage[],
	task: string,
	subtasks: string[],
	subtaskCompleted: boolean[],
	resources: Resource[]
): Promise<{
	success: boolean;
	message: string;
	subtask_completed: boolean[];
	warning: { off_topic: boolean; moderation: boolean };
	error?: string;
}> {
	console.log('Chat with LLM by docs:', {
		historyLength: history.length,
		task,
		subtasks,
		subtaskCompleted,
		resourcesLength: resources.length
	});
	try {
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

		const [response, subtask_completed, moderation, off_topic] = await Promise.all([
			requestChatLLM(system_prompt, history),
			checkSubtaskCompleted(history, subtasks),
			isHarmfulContent(history.length > 0 ? history[history.length - 1].content : ''),
			isOffTopic(history, system_prompt)
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
			message: response.message,
			subtask_completed: subtask_completed.completed,
			warning: {
				moderation: moderation.harmful,
				off_topic: off_topic.off_topic
			}
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			message: '',
			subtask_completed: [],
			warning: { moderation: false, off_topic: false },
			error: 'Failed to chat with LLM by docs'
		};
	}
}

async function checkSubtaskCompleted(
	history: LLMChatMessage[],
	subtasks: string[]
): Promise<{ success: boolean; completed: boolean[]; error?: string }> {
	console.log('Checking subtask completed:', { historyLength: history.length, subtasks });
	if (history.length < 1) {
		return { success: true, completed: subtasks.map(() => false) };
	}
	try {
		const llm_message = history.length > 1 ? history[history.length - 2].content : '';
		const student_message = history[history.length - 1].content;
		const system_prompt = `Task: Check subtask completed\n\nSubtasks: ${subtasks.join(
			'\n'
		)}\n\nLLM Message: ${llm_message}\n\nStudent Message: ${student_message}`;

		const response = await requestZodLLM(system_prompt, {
			description: 'Check subtask completed',
			type: SchemaType.ARRAY,
			items: {
				description: 'Subtask completed',
				type: SchemaType.BOOLEAN
			}
		});

		if (!response.success) {
			throw new Error('Failed to check subtask completed');
		}

		return {
			success: true,
			completed: response.message
		};
	} catch (error) {
		console.error('Error in checkSubtaskCompleted:', error);
		return {
			success: false,
			completed: subtasks.map(() => false),
			error: 'Failed to check subtask completed'
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
		const systemPrompt = history.map((log) => log.content).join('\n');
		const response = await requestZodLLM(systemPrompt, {
			description: 'Summarize student chat',
			type: SchemaType.OBJECT,
			properties: {
				summary: {
					description: 'Summary of the chat',
					type: SchemaType.STRING
				},
				keyPoints: {
					description: 'Key points of the chat',
					type: SchemaType.ARRAY,
					items: {
						description: 'Key point',
						type: SchemaType.STRING
					}
				}
			}
		});

		if (!response.success) {
			throw new Error('Failed to summarize student chat');
		}

		return {
			success: true,
			summary: response.message.summary,
			key_points: response.message.keyPoints
		};
	} catch (error) {
		console.error('Error in summarizeStudentChat:', error);
		return {
			success: false,
			summary: '',
			key_points: [],
			error: 'Failed to summarize student chat'
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
	console.log('Summarizing concepts:', { student_opinionLength: student_opinion.length });
	try {
		const systemPrompt = student_opinion.map((opinion) => opinion.summary).join('\n');
		const response = await requestZodLLM(systemPrompt, {
			description: 'Summarize concepts',
			type: SchemaType.OBJECT,
			properties: {
				similarViewPoints: {
					description: 'Similar view points',
					type: SchemaType.ARRAY,
					items: {
						description: 'Similar view point',
						type: SchemaType.STRING
					}
				},
				differentViewPoints: {
					description: 'Different view points',
					type: SchemaType.ARRAY,
					items: {
						description: 'Different view point',
						type: SchemaType.STRING
					}
				},
				studentsSummary: {
					description: 'Summary of student opinions',
					type: SchemaType.STRING
				}
			}
		});

		if (!response.success) {
			throw new Error('Failed to summarize concepts');
		}

		return {
			success: true,
			similar_view_points: response.message.similarViewPoints,
			different_view_points: response.message.differentViewPoints,
			students_summary: response.message.studentsSummary
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

export async function summarizeGroupOpinions(student_opinion: Discussion[]): Promise<{
	success: boolean;
	summary: string;
	keywords: Record<string, number>;
	error?: string;
}> {
	console.log('Summarizing group opinions:', { student_opinionLength: student_opinion.length });
	try {
		const systemPrompt = student_opinion.map((opinion) => opinion.content).join('\n');
		const response = await requestZodLLM(systemPrompt, {
			description: 'Summarize group opinions',
			type: SchemaType.OBJECT,
			properties: {
				summary: {
					description: 'Summary of group opinions',
					type: SchemaType.STRING
				},
				keywords: {
					description: 'Keywords of group opinions',
					type: SchemaType.OBJECT
				}
			}
		});

		if (!response.success) {
			throw new Error('Failed to summarize group opinions');
		}

		return {
			success: true,
			summary: response.message.summary,
			keywords: response.message.keywords
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions:', error);
		return {
			success: false,
			summary: '',
			keywords: {},
			error: 'Failed to summarize group opinions'
		};
	}
}
