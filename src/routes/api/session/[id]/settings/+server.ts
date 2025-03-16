import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';

export async function POST({ params, locals, request }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
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
}

export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
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
}
