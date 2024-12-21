import { adminDb } from '$lib/server/firebase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const sessionId = params.id;
	const groupsRef = adminDb.collection('sessions').doc(sessionId).collection('groups');
	const groupsSnapshot = await groupsRef.get();

	const groups = await Promise.all(
		groupsSnapshot.docs.map(async (groupDoc) => {
			const participants = groupDoc.data().participants;

			// Fetch display names for each participant
			const participantsWithNames = await Promise.all(
				participants.map(async (uid: string) => {
					const profileDoc = await adminDb.collection('profiles').doc(uid).get();
					const displayName = profileDoc.exists ? profileDoc.data()?.displayName : null;
					return { uid, displayName };
				})
			);

			return {
				id: groupDoc.id,
				number: groupDoc.data().number,
				participants: participantsWithNames
			};
		})
	);
	console.log(groups[0].participants);

	return {
		groups
	};
};
