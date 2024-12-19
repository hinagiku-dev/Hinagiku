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
	audio: z.string()
});

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const { id, group_number, conv_id } = params;
		if (!id || !group_number || !conv_id) {
			throw error(400, 'Missing parameters');
		}

		const conversation_ref = await getConversationRef(id, group_number, conv_id);
		const { userId, task, subtasks, resources, history } =
			await getConversationData(conversation_ref);

		if (userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		const { content, audio } = await getRequestData(request);
		const chat_history = history.map(DBChatMessage2LLMChatMessage);

		const response = await chatWithLLMByDocs(
			[...chat_history, { role: 'user', content: content }],
			task,
			subtasks,
			resources
		);
		if (!response.success) {
			throw error(500, response.error);
		}

		await conversation_ref.update({
			history: [
				...history,
				{
					role: 'assistant',
					content: response.message,
					audio: audio
				}
			]
		});

		return json({ success: true, message: response.message });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const parsedData = requestDataFormat.parse(data);
	if (!parsedData.content && !parsedData.audio) {
		throw error(400, 'Missing parameters');
	}
	if (typeof parsedData.content !== 'string' || typeof parsedData.audio !== 'string') {
		throw error(400, 'Invalid parameters');
	}
	return parsedData;
}

function DBChatMessage2LLMChatMessage(message: DBChatMessage): LLMChatMessage {
	return {
		role: message.role,
		content: message.content
	};
}
