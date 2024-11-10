import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { CHAT_SUMMARY_PROMPT, PARAGRAPH_SUMMARY_PROMPT } from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
});

interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export async function chatWithLLM(messages: ChatMessage[], temperature = 0.7) {
	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			messages,
			temperature
		});

		return {
			success: true,
			message: response.choices[0].message.content
		};
	} catch (error) {
		console.error('Error in chatWithLLM:', error);
		return {
			success: false,
			error: 'Failed to get response from LLM'
		};
	}
}

export async function summarizeChat(chatHistory: ChatMessage[]) {
	try {
		const formattedHistory = chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formattedHistory);

		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.5
		});

		return {
			success: true,
			summary: response.choices[0].message.content
		};
	} catch (error) {
		console.error('Error in summarizeChat:', error);
		return {
			success: false,
			error: 'Failed to summarize chat'
		};
	}
}

export async function summarizeParagraph(text: string) {
	try {
		const prompt = PARAGRAPH_SUMMARY_PROMPT.replace('{text}', text);

		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3
		});

		return {
			success: true,
			summary: response.choices[0].message.content
		};
	} catch (error) {
		console.error('Error in summarizeParagraph:', error);
		return {
			success: false,
			error: 'Failed to summarize paragraph'
		};
	}
}

// Helper function to validate environment variables
export function validateLLMConfig() {
	if (!env.OPENAI_API_KEY) {
		throw new Error('OPENAI_API_KEY is not set in environment variables');
	}
	return true;
}
