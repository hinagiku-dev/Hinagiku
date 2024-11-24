import { adminDb } from '$lib/server/firebase';
import { validateTempId } from '$lib/utils/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const tempId = data.get('tempId')?.toString();
		const groupId = data.get('groupId')?.toString();

		if (!tempId || !validateTempId(tempId)) {
			return fail(400, { tempId, invalid: true });
		}

		if (!groupId) {
			return fail(400, { groupId, invalid: true });
		}

		// Find session by tempId
		const sessionQuery = await adminDb
			.collection('sessions')
			.where('tempId', '==', tempId)
			.where('status', '==', 'waiting')
			.limit(1)
			.get();

		if (sessionQuery.empty) {
			return fail(400, { tempId, notFound: true });
		}

		const session = sessionQuery.docs[0];
		const sessionData = session.data();

		// Check if code has expired
		if (sessionData.tempIdExpiry.toDate() < new Date()) {
			return fail(400, { tempId, expired: true });
		}

		// Add participant to session
		await session.ref.update({
			[`participants.${locals.user.uid}`]: {
				name: locals.user.name,
				joinedAt: new Date()
			}
		});

		return { success: true, sessionId: session.id };
	}
} satisfies Actions;
