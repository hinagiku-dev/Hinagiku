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
		const groupNumber = data.get('groupNumber')?.toString();

		if (!tempId || !validateTempId(tempId)) {
			return fail(400, { tempId, idInvalid: true });
		}

		// verify group number match "^(?:[1-9]|[1-4][0-9]|50)$"
		if (!groupNumber || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(groupNumber)) {
			return fail(400, { groupNumber, groupNumberInvalid: true });
		}

		// Find session by tempId
		const sessionQuery = await adminDb
			.collection('sessions')
			.where('tempId', '==', tempId)
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
				joinedAt: new Date(),
				groupNumber: parseInt(groupNumber)
			}
		});

		// Add participant to group
		const groupSnapshot = await adminDb
			.collection('groups')
			.where('number', '==', parseInt(groupNumber))
			.where('sessionId', '==', session.id)
			.limit(1)
			.get();

		let groupRef;

		if (groupSnapshot.empty) {
			// Create new group
			groupRef = adminDb.collection('groups').doc();
			await groupRef.set({
				id: groupRef.id,
				number: parseInt(groupNumber),
				sessionId: session.id,
				participants: {
					[locals.user.uid]: {
						name: locals.user.name,
						joinedAt: new Date()
					}
				}
			});
		} else {
			// Add participant to existing group
			groupRef = groupSnapshot.docs[0].ref;
			await groupRef.update({
				[`participants.${locals.user.uid}`]: {
					name: locals.user.name,
					joinedAt: new Date()
				}
			});
		}

		return { success: true, sessionId: session.id };
	}
} satisfies Actions;
