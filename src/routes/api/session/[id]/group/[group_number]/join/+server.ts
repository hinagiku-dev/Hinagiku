import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const groupNumber = parseInt(params.group_number);
		if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 50) {
			throw error(400, 'Invalid group number');
		}

		// Find the group
		const groupsRef = adminDb.collection('sessions').doc(params.id).collection('groups');
		const groupQuery = await groupsRef.where('number', '==', groupNumber).limit(1).get();

		if (groupQuery.empty) {
			throw error(404, 'Group not found');
		}

		const groupDoc = groupQuery.docs[0];
		const groupData = groupDoc.data();

		// Check if user is already in a group
		const userGroupQuery = await groupsRef
			.where('participants', 'array-contains', locals.user.uid)
			.limit(1)
			.get();

		if (!userGroupQuery.empty) {
			throw error(400, 'You are already in a group');
		}

		// Add user to group
		await groupDoc.ref.update({
			participants: [...groupData.participants, locals.user.uid]
		});

		return json({ success: true, groupId: groupDoc.id });
	} catch (e) {
		console.error('Error joining group:', e);
		throw error(500, 'Failed to join group');
	}
};
