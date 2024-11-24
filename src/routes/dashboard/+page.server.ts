import { adminDb } from '$lib/server/firebase';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// find user's joined sessions
	const joinedSessionsQuery = await adminDb
		.collection('sessions')
		.where(`participants.${locals.user.uid}`, '!=', null)
		.get();

	const joinedSessions = joinedSessionsQuery.docs.map((doc) => {
		const data = doc.data();
		const id = doc.id;
		return {
			...convertTimestamps(data),
			id
		};
	});

	// find user's created sessions
	const createdSessionsQuery = await adminDb
		.collection('sessions')
		.where('hostId', '==', locals.user.uid)
		.get();

	const createdSessions = createdSessionsQuery.docs.map((doc) => {
		const data = doc.data();
		const id = doc.id;
		return {
			...convertTimestamps(data),
			id
		};
	});

	return {
		user: locals.user,
		createdSessions: createdSessions,
		joinedSessions: joinedSessions
	};
};

function convertTimestamps(obj: FirebaseFirestore.DocumentData): FirebaseFirestore.DocumentData {
	if (obj !== null && typeof obj === 'object') {
		for (const key in obj) {
			if (obj[key] && typeof obj[key].toDate === 'function') {
				obj[key] = obj[key].toMillis();
			} else if (obj[key] !== null && typeof obj[key] === 'object') {
				obj[key] = convertTimestamps(obj[key]);
			}
		}
	}
	return obj;
}
