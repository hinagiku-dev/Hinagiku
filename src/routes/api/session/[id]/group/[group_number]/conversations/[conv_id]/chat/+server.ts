import { adminDb } from '$lib/server/firebase';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

import type { Conversation } from '$lib/schema/conversation';
import { chatWithLLMByDocs } from '$lib/server/llm';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}
		if (!params.id || !params.group_number || !params.conv_id) {
			throw error(400, 'Missing parameters');
		}

		const conversationRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number)
			.collection('conversations')
			.doc(params.conv_id);

		const conversation = await conversationRef.get();
		if (!conversation.exists) {
			throw error(404, 'Conversation not found');
		}

		const conversationData = conversation.data() as Conversation;
		const { userId, task, subtasks, resources, history } = conversationData;
		if (userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		const data = await request.json();
		const content = data.get('content');
		const audio = data.get('audio');

		history.push({
			content: content,
			role: 'user',
			audio: audio
		});

		const response = await chatWithLLMByDocs(history, task, subtasks, resources);
		if (!response.success) {
			throw error(500, response.error);
		}

		history.push({
			role: 'assistant',
			audio: null,
			content: response.message
		});
		await conversationRef.update({
			history
		});

		return json({ success: true, message: response.message });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};
