import { adminDb } from '$lib/server/firebase';
import { error, json, RequestHandler } from '@sveltejs/kit';

import { Conversation } from '$lib/schema/conversation';
import { chatWithLLMByDocs } from '$lib/server/llm';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
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
		const { userId, task, subtasks, resources, history } = await conversationData;
		if (userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		const data = await request.json();
		const { content } = data.get('content');

		if (!content) {
			throw error(400, 'Content is required');
		}

		history.push({
			role: 'user',
			content
		});

		const response = await chatWithLLMByDocs(history, task, subtasks, resources);
		if (!response.success) {
			throw error(500, response.error);
		}

		history.push({
			role: 'assistant',
			content: response.result
		});
		await conversationRef.update({
			history
		});

		return json({ success: true, message: response.result });
	} catch (error) {
		console.error('Error processing request:', error);
		return json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
	}
};
