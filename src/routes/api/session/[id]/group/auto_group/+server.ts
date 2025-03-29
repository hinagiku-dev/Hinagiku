import { GroupSchema } from '$lib/schema/group';
import { adminDb, checkRemoveParticipantPermission } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';

async function createGroup(sessionId: string, member: string) {
	const groupsRef = adminDb.collection('sessions').doc(sessionId).collection('groups');
	const existingGroups = await groupsRef.get();
	const usedNumbers = new Set(existingGroups.docs.map((doc) => doc.data().number));

	let groupNumber = 1;
	while (usedNumbers.has(groupNumber) && groupNumber <= 50) {
		groupNumber++;
	}

	if (groupNumber > 50) {
		throw error(400, 'Maximum number of groups reached');
	}
	const groupRef = groupsRef.doc();
	const groupData = {
		participants: [member],
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
	return groupNumber;
}

async function joinGroup(sessionId: string, members: string[], groupNumber: number) {
	if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 50) {
		throw error(400, 'Invalid group number');
	}
	if (members.length === 0) {
		return;
	}
	// Find the group
	const groupsRef = adminDb.collection('sessions').doc(sessionId).collection('groups');
	const groupQuery = await groupsRef.where('number', '==', groupNumber).limit(1).get();

	if (groupQuery.empty) {
		throw error(404, 'Group not found');
	}

	const groupDoc = groupQuery.docs[0];
	const groupData = groupDoc.data();

	// Check if user is already in a group
	const userGroupQuery = await groupsRef
		.where('participants', 'array-contains-any', members)
		.limit(1)
		.get();

	if (!userGroupQuery.empty) {
		throw error(400, 'Someone are already in a group');
	}

	// Add user to group
	await groupDoc.ref.update({
		participants: groupData.participants.concat(members)
	});
}

export async function POST({ params, locals, request }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const members = await request.json();
		if (members.length === 0) {
			throw error(400, members);
		}
		const hasPermission = await checkRemoveParticipantPermission(
			params.id,
			locals.user.uid,
			members[0]
		);
		if (!hasPermission) {
			throw error(403, 'Permission denied');
		}
		const group_number = await createGroup(params.id, members[0]);
		joinGroup(params.id, members.slice(1), group_number);

		//Epmty the waiting list
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		await sessionRef.update({
			waitlist: []
		});

		return json({ success: true });
	} catch (error) {
		console.error(500, 'Failed to update settings', error);
	}
}
