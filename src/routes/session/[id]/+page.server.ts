import { SessionSchema } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { DOCS_CONTEXT_SYSTEM_PROMPT } from '$lib/server/prompt';
import { error, fail, redirect } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { z } from 'zod';
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
	},
	startIndividualStage: async ({ locals, params }) => {
		const sessionId = params.id;

		const sessionRef = adminDb.collection('sessions').doc(sessionId);
		const sessionData = (await sessionRef.get()).data() as z.infer<typeof SessionSchema>;

		const isHost = sessionData.host === locals.user?.uid;

		if (!isHost) {
			throw redirect(401, 'Unauthorized');
		}

		try {
			await sessionRef.update({
				status: 'active',
				stage: 'individual'
			});

			throw redirect(303, `/session/${sessionId}/status`);
		} catch (error) {
			console.error('Error starting individual stage:', error);
			return fail(500, { error: true });
		}
	},

	gotoConversation: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const userId = locals.user.uid;
		const sessionId = data.get('sessionId')?.toString();

		if (!sessionId) {
			return fail(400, { missing: true });
		}

		try {
			const conversationRef = adminDb.collection('conversations').doc();
			await conversationRef.set({
				userId: userId,
				sessionId: sessionId,
				history: [
					{
						role: 'system',
						content: DOCS_CONTEXT_SYSTEM_PROMPT
					}
				]
			});

			throw redirect(303, `/session/${sessionId}/conversation/${conversationRef.id}`);
		} catch (error) {
			console.error('Error creating conversation:', error);
			return fail(500, { error: true });
		}
	}
} satisfies Actions;
