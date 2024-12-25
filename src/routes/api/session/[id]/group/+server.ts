import { GroupSchema } from '$lib/schema/group';
import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Get the next available group number
		const groupsRef = adminDb.collection('sessions').doc(params.id).collection('groups');
		const existingGroups = await groupsRef.get();
		const usedNumbers = new Set(existingGroups.docs.map((doc) => doc.data().number));

		let groupNumber = 1;
		while (usedNumbers.has(groupNumber) && groupNumber <= 50) {
			groupNumber++;
		}

		if (groupNumber > 50) {
			throw error(400, 'Maximum number of groups reached');
		}

		// Create new group
		const groupRef = groupsRef.doc();
		const groupData = {
			participants: [locals.user.uid],
			concept: null,
			discussions: [],
			summary: null,
			keywords: {},
			number: groupNumber,
			createdAt: new Date(),
			status: 'discussion',
			moderation: false,
			updatedAt: new Date()
		};

		const result = GroupSchema.safeParse(groupData);
		if (!result.success) {
			throw error(400, 'Invalid group data');
		}

		await groupRef.set(groupData);

		return json({ success: true, groupId: groupRef.id });
	} catch (e) {
		console.error('Error creating group:', e);
		throw error(500, 'Failed to create group');
	}
};
