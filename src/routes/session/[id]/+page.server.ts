import { adminDb } from '$lib/server/firebase';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login?then=' + encodeURIComponent(url.pathname));
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
