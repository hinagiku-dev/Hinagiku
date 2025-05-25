import { adminDb } from '$lib/server/firebase';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const sessionRef = adminDb.collection('sessions').doc(params.id);
	const sessionDoc = await sessionRef.get();

	if (!locals.user) {
		const classId = sessionDoc.data()?.classId;
		if (!classId) {
			throw redirect(303, '/login?then=' + encodeURIComponent(url.pathname));
		}
		let classCode = '';
		const classRef = adminDb.collection('classes').doc(classId);
		const classDoc = await classRef.get();
		if (!classDoc.exists) {
			throw error(404, 'Class not found');
		}
		classCode = classDoc.data()?.code || '';
		if (!classCode || classCode === '') {
			throw redirect(303, '/login?then=' + encodeURIComponent(url.pathname));
		}
		throw redirect(
			303,
			'/login?then=' + encodeURIComponent(url.pathname) + '&classCode=' + classCode
		);
	}

	if (!sessionDoc.exists) {
		throw error(404, 'Session not found');
	}

	return {
		user: locals.user
	};
};
