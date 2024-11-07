import { adminDb } from '$lib/server/firebase';
import type { FirestoreSession } from '$lib/types/session';
import { convertFirestoreSession } from '$lib/types/session';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const sessionRef = adminDb.collection('sessions').doc(params.id);
	const sessionDoc = await sessionRef.get();

	if (!sessionDoc.exists) {
		throw error(404, 'Session not found');
	}

	const sessionData = sessionDoc.data() as FirestoreSession;
	const session = convertFirestoreSession(sessionData);

	// Check if user is a participant
	if (!(locals.user.uid in session.participants)) {
		throw error(403, 'Not a participant in this session');
	}

	return {
		session,
		user: locals.user
	};
};

export const actions = {
	createGroup: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const data = await request.formData();
		const groupName = data.get('groupName')?.toString();

		if (!groupName) {
			return fail(400, { missing: true });
		}

		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const groupId = crypto.randomUUID();

		await sessionRef.update({
			[`groups.${groupId}`]: {
				name: groupName,
				leaderId: locals.user.uid,
				members: {
					[locals.user.uid]: {
						name: locals.user.name,
						joinedAt: new Date()
					}
				}
			}
		});

		return { success: true, groupId };
	}
} satisfies Actions;
