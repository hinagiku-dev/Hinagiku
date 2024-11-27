import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const session = await sessionRef.get();

		if (!session.exists) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		if (session.data()?.host !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const { stage, duration } = await request.json();

		// Validate stage transition
		const currentStatus = session.data()?.status;
		const validTransitions = {
			preparing: 'individual',
			individual: 'group',
			group: 'ended'
		};

		if (validTransitions[currentStatus] !== stage) {
			return json(
				{
					error: `Invalid stage transition from ${currentStatus} to ${stage}`
				},
				{ status: 400 }
			);
		}

		// Calculate end time for the stage
		const endTime = Timestamp.fromMillis(Date.now() + duration * 60 * 1000);

		const updates: Record<string, unknown> = {
			status: stage
		};

		// Update appropriate end time based on stage
		if (stage === 'individual') {
			updates['end.self'] = endTime;
		} else if (stage === 'group') {
			updates['end.group'] = endTime;
		}

		await sessionRef.update(updates);

		return json({
			success: true,
			endTime: endTime
		});
	} catch (error) {
		console.error('Error advancing stage:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
