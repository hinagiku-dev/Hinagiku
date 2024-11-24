import { db } from '$lib/firebase';
import type { FirestoreSession, Session } from '$lib/types/session';
import { convertFirestoreSession } from '$lib/types/session';
import { redirect } from '@sveltejs/kit';
import { collection, getDocs } from 'firebase/firestore';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const sessions: Session[] = [];
	const query = await getDocs(collection(db, 'sessions'));
	query.forEach((doc) => {
		if (doc.get('hostId') === locals.user?.uid) {
			sessions.push(convertFirestoreSession(doc.data() as FirestoreSession));
			//console.log(`${doc.id} => ${doc.data()}`);
		}
	});
	sessions.sort(function (a, b) {
		const keyA = a.createdAt,
			keyB = b.createdAt;
		// Compare the 2 dates
		if (keyA < keyB) return 1;
		if (keyA > keyB) return -1;
		return 0;
	});

	return {
		sessions: sessions,
		user: locals.user
	};
};
