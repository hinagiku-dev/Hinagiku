import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { json, type RequestHandler } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (!params.id) {
		return json({ error: 'Missing session ID' }, { status: 400 });
	}

	try {
		const settings = (await request.json()) as Session['settings'];
		const sessionRef = adminDb.collection('sessions').doc(params.id);

		await sessionRef.update({
			settings: settings
		});

		return json({ success: true });
	} catch (error) {
		console.error(500, 'Failed to update settings', error);
	}
	return json({ error: 'Failed to update settings' }, { status: 500 });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (!params.id) {
		return json({ error: 'Missing session ID' }, { status: 400 });
	}

	try {
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			console.error(404, 'Session not found');
		}

		const data = sessionDoc.data();
		return json(data?.settings || { autoGroup: true });
	} catch (error) {
		console.error(500, 'Failed to fetch settings', error);
	}
	return json({ error: 'Failed to fetch settings' }, { status: 500 });
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (!params.id) {
		return json({ error: 'Missing session ID' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		if (sessionDoc.data()?.host !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const dataToUpdate: Partial<Session> = {};

		if (body.reflectionQuestion !== undefined) {
			dataToUpdate.reflectionQuestion = body.reflectionQuestion;
		}

		// Add other updatable fields here if necessary

		if (Object.keys(dataToUpdate).length > 0) {
			await sessionRef.update({
				...dataToUpdate,
				updatedAt: Timestamp.now()
			});
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update session settings:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
