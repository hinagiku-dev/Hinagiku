import { adminDb } from '$lib/server/firebase';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	// ceate a new conversation

	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!params.id || !params.group_number) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const data = await request.json();
		const task = data.get('task');
		const subtasks = data.get('subtasks');
		const resources = data.get('resources');

		const conversationRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number)
			.collection('conversations')
			.doc();

		await conversationRef.set({
			userId: locals.user.uid,
			task,
			subtasks,
			resources,
			history: []
		});

		return json({
			success: true,
			conversationId: conversationRef.id
		});
	} catch (error) {
		console.error('Error creating conversation:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
