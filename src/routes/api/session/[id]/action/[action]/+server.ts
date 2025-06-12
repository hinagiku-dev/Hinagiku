import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
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
		const action = params.action;
		const now = Timestamp.now();

		if (action === 'generate-code') {
			if (sessionData.host !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
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
				}
				return json({ code: code?.toString() });
			} else {
				return json({ error: 'Failed to generate code. Please retry.' }, { status: 500 });
			}
		}

		if (action === 'archive') {
			if (sessionData.host !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
			await sessionRef.update({
				active_status: 'archived'
			});
			return json({ success: true });
		}
		if (action === 'unarchive') {
			if (sessionData.host !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
			await sessionRef.update({
				active_status: 'active'
			});
			return json({ success: true });
		}

		if (action === 'delete') {
			if (sessionData.host !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
			await sessionRef.update({
				active_status: 'deleted'
			});
			return json({ success: true });
		}

		if (action === 'joinWaitlist') {
			try {
				const sessionRef = adminDb.collection('sessions').doc(params.id);
				const sessionData = (await sessionRef.get()).data();
				// Create new group
				if (!sessionData) {
					throw error(404, 'Session not found');
				}
				if (sessionData.waitlist === undefined) {
					//create waitlist
					await sessionRef.update({
						waitlist: [locals.user.uid]
					});
				} else {
					if (sessionData.waitlist.includes(locals.user.uid)) {
						return json({ error: 'You are already in the waitlist' }, { status: 400 });
					}
					await sessionRef.update({
						waitlist: [...sessionData.waitlist, locals.user.uid]
					});
				}
				return json({ success: true });
			} catch (e) {
				console.error('Error updating waitlist:', e);
				throw error(500, 'Failed to update waitlist');
			}
		}

		if (action === 'leaveWaitlist') {
			try {
				const sessionRef = adminDb.collection('sessions').doc(params.id);
				const sessionData = (await sessionRef.get()).data();
				if (!sessionData) {
					throw error(404, 'Session not found');
				}
				if (sessionData.waitlist === undefined) {
					return json({ error: 'You are not in the waitlist' }, { status: 400 });
				} else {
					if (!sessionData.waitlist.includes(locals.user.uid)) {
						return json({ error: 'You are not in the waitlist' }, { status: 400 });
					}
					const removed = sessionData.waitlist.filter((uid: string) => uid !== locals.user!.uid);
					if (removed.length === 0) {
						await sessionRef.update({
							waitlist: []
						});
					} else {
						await sessionRef.update({
							waitlist: removed
						});
					}
				}
				return json({ success: true });
			} catch (e) {
				console.error('Error updating waitlist:', e);
				throw error(500, 'Failed to update waitlist');
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
					status: 'after-group',
					'timing.group.end': now
				}
			},
			'end-after-group': {
				fromStatus: 'after-group',
				updates: {
					status: 'ended',
					'timing.after_group.end': now
				}
			},
			preparing: {
				fromStatus: 'individual',
				updates: {
					status: 'preparing'
				}
			}
		};

		// Validate action
		if (!(action in validTransitions)) {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		const transition = validTransitions[action as keyof typeof validTransitions];

		// Validate current status
		/*if (sessionData.status !== transition.fromStatus) {
			return json(
				{
					error: `Invalid action ${action} for current status ${sessionData.status}`
				},
				{ status: 400 }
			);
		}*/

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
