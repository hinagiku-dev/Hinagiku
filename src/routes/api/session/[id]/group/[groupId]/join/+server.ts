import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: sessionId, groupId } = params;
	const sessionRef = adminDb.collection('sessions').doc(sessionId);

	try {
		await sessionRef.update({
			[`groups.${groupId}.members.${locals.user.uid}`]: {
				name: locals.user.name,
				joinedAt: new Date()
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error joining group:', error);
		return json({ error: 'Failed to join group' }, { status: 500 });
	}
};
