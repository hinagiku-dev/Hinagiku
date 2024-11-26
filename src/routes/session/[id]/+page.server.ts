import { adminDb } from '$lib/server/firebase';
import { error, fail, redirect } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
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

	return {
		user: locals.user
	};
};

export const actions = {
	deleteParticipant: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const participantId = data.get('participantId')?.toString();
		const sessionId = data.get('sessionId')?.toString();

		if (!participantId || !sessionId) {
			return fail(400, { missing: true });
		}

		try {
			// Delete participant from session
			const sessionRef = adminDb.collection('sessions').doc(sessionId);
			await sessionRef.update({
				[`participants.${participantId}`]: FieldValue.delete()
			});

			// Delete participant from group
			const groupSnapshot = await adminDb
				.collection('groups')
				.where('sessionId', '==', sessionId)
				.where('participants', 'array-contains', participantId)
				.get();

			if (!groupSnapshot.empty) {
				const groupDoc = groupSnapshot.docs[0];
				const groupRef = adminDb.collection('groups').doc(groupDoc.id);

				// remove participant from group
				await groupRef.update({
					participants: FieldValue.arrayRemove(participantId)
				});
			}
			return { success: true };
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(500, { error: true });
		}
	},
	updateTitle: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const sessionId = data.get('sessionId')?.toString();
		const title = data.get('title')?.toString();

		if (!sessionId || !title) {
			return fail(400, { missing: true });
		}

		try {
			const sessionRef = adminDb.collection('sessions').doc(sessionId);
			await sessionRef.update({
				title
			});

			return { success: true };
		} catch (error) {
			console.error('Error updating session title:', error);
			return fail(500, { error: true });
		}
	}
} satisfies Actions;
