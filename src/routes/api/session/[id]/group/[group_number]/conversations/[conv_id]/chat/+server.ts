import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

import { chatWithLLMByDocs } from '$lib/server/llm';
import { getConversationData, getConversationRef } from '$lib/utils/firestore';
import type { DBChatMessage, LLMChatMessage } from '$lib/utils/types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
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

		const data = await request.json();
		const content = data.get('content');
		const audio = data.get('audio');

		if (!content || !audio) {
			throw error(400, 'Missing content');
		}
		if (typeof content != 'string' || typeof audio != 'string') {
			throw error(400, 'Wrong request body format');
		}

		const chat_history = history.map(DBChatMessage2LLMChatMessage);

		const response = await chatWithLLMByDocs(chat_history, task, subtasks, resources);
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

function DBChatMessage2LLMChatMessage(message: DBChatMessage): LLMChatMessage {
	return {
		role: message.role,
		content: message.content
	};
}
