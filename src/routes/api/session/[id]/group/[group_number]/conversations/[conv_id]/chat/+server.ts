import { chatWithLLMByDocs } from '$lib/server/llm';
import { getConversationData, getConversationRef } from '$lib/utils/firestore';
import type { DBChatMessage, LLMChatMessage } from '$lib/utils/types';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Endpoint for chatting with LLM
// POST /api/session/[id]/group/[group_number]/conversations/[conv_id]/chat/+server
// Request data format
const requestDataFormat = z.object({
	content: z.string(),
	audio: z.string().nullable()
});

export const POST: RequestHandler = async ({ request, params, locals }) => {
	console.log('POST request received', { params });
	try {
		if (!locals.user) {
			console.log('User not authenticated');
			redirect(303, '/login');
		}
		const { id, group_number, conv_id } = params;
		if (!id || !group_number || !conv_id) {
			console.log('Missing parameters:', { id, group_number, conv_id });
			throw error(400, 'Missing parameters');
		}

		const conversation_ref = await getConversationRef(id, group_number, conv_id);
		console.log('Retrieved conversation reference');
		const { userId, task, subtasks, resources, history } =
			await getConversationData(conversation_ref);
		console.log('Retrieved conversation data', { userId, task, subtasksCount: subtasks.length });

		if (userId !== locals.user.uid) {
			console.log('User unauthorized', { userId, requestingUser: locals.user.uid });
			throw error(403, 'Forbidden');
		}

		const { content, audio } = await getRequestData(request);
		console.log('Parsed request data', { contentLength: content.length, hasAudio: !!audio });

		await conversation_ref.update({
			history: [
				...history,
				{
					role: 'user',
					content: content,
					audio: audio
				}
			]
		});
		console.log('Updated conversation with user message');
		const chat_history = history.map(DBChatMessage2LLMChatMessage);
		console.log('Prepared chat history for LLM', { historyLength: chat_history.length });

		const response = await chatWithLLMByDocs(
			[...chat_history, { role: 'user', content: content }],
			task,
			subtasks,
			resources
		);
		console.log('Received LLM response', {
			success: response.success,
			subtaskCompleted: response.subtask_completed
		});

		if (!response.success) {
			console.error('LLM response failed:', response.error);
			throw error(500, response.error);
		}

		await conversation_ref.update({
			history: [
				...history,
				{
					role: 'user',
					content: content,
					audio: audio
				},
				{
					role: 'assistant',
					content: response.message
				}
			],
			subtaskCompleted: response.subtask_completed
		});

		return json({ success: true, message: response.message });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	console.log('Processing request data');
	const data = await request.json();
	console.log('Parsed JSON data');
	const parsed = requestDataFormat.safeParse(data);
	if (!parsed.success) {
		console.error('Invalid request data:', parsed.error);
		throw error(400, `Invalid request data: ${parsed.error}`);
	}
	return parsed.data;
}

function DBChatMessage2LLMChatMessage(message: DBChatMessage): LLMChatMessage {
	return {
		role: message.role,
		content: message.content
	};
}
