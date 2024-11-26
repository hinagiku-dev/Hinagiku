import { adminDb } from '$lib/server/firebase';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const sessionRef = adminDb.collection('discussion').doc(params.id);
	console.log(sessionRef);
	//const sessionDoc = await sessionRef.get();

	/*
	if (!sessionDoc.exists) {
		throw error(404, 'User is not in the session');
	}
		*/

	return {};
};

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}
		//send message to the server
	}
} satisfies Actions;
