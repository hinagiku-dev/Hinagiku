import { adminDb } from '$lib/server/firebase';
import { generateTempId } from '$lib/utils/session';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sessionId = params.id;
	const sessionRef = adminDb.collection('sessions').doc(sessionId);
	const session = await sessionRef.get();

	if (!session.exists) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	if (session.data()?.hostId !== locals.user.uid) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const tempId = generateTempId();
	const tempIdExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

	await sessionRef.update({
		tempId,
		tempIdExpiry,
		status: 'waiting'
	});

	return json({ tempId, tempIdExpiry });
};
