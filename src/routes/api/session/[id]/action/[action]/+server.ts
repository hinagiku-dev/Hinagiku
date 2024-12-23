import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const session = await sessionRef.get();

		if (!session.exists) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		const sessionData = session.data() as Session;

		if (sessionData.host !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const action = params.action;
		const now = Timestamp.now();

		if (action === 'generate-code') {
			let Codes;
			let code;
			let tryCount = 0;
			while (tryCount < 20) {
				code = Math.floor(100000 + Math.random() * 900000);
				Codes = adminDb.collection('temp_codes').doc(code.toString());
				const codeExists = await Codes.get();
				if (!codeExists.exists) {
					break;
				}
				if (
					codeExists.data() &&
					now.toMillis() - codeExists.data()!.createTime.toMillis() > 3600000
				) {
					break;
				}
				tryCount++;
			}
			if (tryCount < 20) {
				if (Codes) {
					await Codes.set({
						sessionId: sessionRef.id,
						createTime: now
					});
					Codes = adminDb.collection('temp_codes').doc(sessionRef.id);
					await Codes.set({
						code: code,
						createTime: now
					});
				}
				return json({ code: code?.toString() });
			} else {
				return json({ error: 'Failed to generate code. Please retry.' }, { status: 500 });
			}
		}

		// Define valid stage transitions
		const validTransitions = {
			'start-individual': {
				fromStatus: 'preparing',
				updates: {
					status: 'individual',
					'timing.individual.start': now
				}
			},
			'end-individual': {
				fromStatus: 'individual',
				updates: {
					status: 'before-group',
					'timing.individual.end': now
				}
			},
			'start-group': {
				fromStatus: 'before-group',
				updates: {
					status: 'group',
					'timing.group.start': now
				}
			},
			'end-group': {
				fromStatus: 'group',
				updates: {
					status: 'ended',
					'timing.group.end': now
				}
			}
		};

		// Validate action
		if (!(action in validTransitions)) {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		const transition = validTransitions[action as keyof typeof validTransitions];

		// Validate current status
		if (sessionData.status !== transition.fromStatus) {
			return json(
				{
					error: `Invalid action ${action} for current status ${sessionData.status}`
				},
				{ status: 400 }
			);
		}

		// Apply updates
		await sessionRef.update(transition.updates);

		return json({
			success: true,
			updates: transition.updates
		});
	} catch (error) {
		console.error('Error performing action:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
