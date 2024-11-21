import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import {
	CHAT_SUMMARY_PROMPT,
	DOCS_CONTEXT_SYSTEM_PROMPT,
	GROUP_OPINION_SUMMARY_PROMPT
} from './prompt';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
});

interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

interface Document {
	content: string;
	title?: string;
}
interface GroupOpinion {
	role: string;
	content: string;
}

export async function chatWithLLMByDocs(
	messages: ChatMessage[],
	mainQuestion: string,
	secondaryGoal: string[],
	documents: Document[],
	temperature = 0.7
) {
	try {
		// 準備文件上下文
		const formattedDocs = documents
			.map((doc, index) => {
				const title = doc.title || `Document ${index + 1}`;
				return `[${title}]:\n${doc.content}`;
			})
			.join('\n\n');

		// 創建系統提示詞
		const systemPrompt = DOCS_CONTEXT_SYSTEM_PROMPT.replace('{mainQuestion}', mainQuestion)
			.replace('{secondaryGoal}', secondaryGoal.join('\n'))
			.replace('{documents}', formattedDocs);

		// 組合完整的消息數組
		const fullMessages: ChatMessage[] = [
			{
				role: 'system',
				content: systemPrompt
			},
			...messages
		];

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: fullMessages,
			temperature,
			max_tokens: 1000
		});

		return {
			success: true,
			message: response.choices[0].message.content,
			metadata: {
				documentsUsed: documents.length,
				totalDocumentLength: formattedDocs.length
			}
		};
	} catch (error) {
		console.error('Error in chatWithLLMByDocs:', error);
		return {
			success: false,
			error: 'Failed to process documents and generate response'
		};
	}
}

export async function summarizeChat(chatHistory: ChatMessage[]) {
	try {
		const formattedHistory = chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
		const prompt = CHAT_SUMMARY_PROMPT.replace('{chatHistory}', formattedHistory);

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
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

export async function summarizeGroupOpinions(groupOpinions: GroupOpinion[]) {
	try {
		const formattedOpinions = groupOpinions
			.map((opinion) => `${opinion.role}: ${opinion.content}`)
			.join('\n');
		const prompt = GROUP_OPINION_SUMMARY_PROMPT.replace('{groupOpinions}', formattedOpinions);

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.5
		});

		return {
			success: true,
			summary: response.choices[0].message.content
		};
	} catch (error) {
		console.error('Error in summarizeGroupOpinions:', error);
		return {
			success: false,
			error: 'Failed to summarize group opinions'
		};
	}
}
