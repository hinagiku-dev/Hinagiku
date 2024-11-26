import { adminDb } from '$lib/server/firebase';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = params;
	const { goal, subQuestions } = await request.json();

	if (!id) {
		return json({ error: 'Missing parameters' }, { status: 400 });
	}

	try {
		const sessionRef = adminDb.collection('sessions').doc(id);
		await sessionRef.update({ goal, subQuestions });

		return json({ success: true });
	} catch (error) {
		console.error('Error saving session:', error);
		return json({ error: 'Failed to save session' }, { status: 500 });
	}
};
