import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { message, active } = await request.json();
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		// Check if user is the host
		const sessionData = sessionDoc.data();
		if (sessionData?.host !== locals.user.uid) {
			return json({ error: 'Only the host can broadcast announcements' }, { status: 403 });
		}

		if (active) {
			// Set the announcement
			await sessionRef.update({
				announcement: {
					message,
					active: true,
					timestamp: new Date()
				}
			});
		} else {
			// Clear the announcement
			await sessionRef.update({
				announcement: {
					message: '',
					active: false,
					timestamp: new Date()
				}
			});
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error updating announcement:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		const sessionData = sessionDoc.data();
		return json({ announcement: sessionData?.announcement || null });
	} catch (error) {
		console.error('Error fetching announcement:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
