import { getUser } from '$lib/utils/getUser';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const profile = await getUser(locals.user.uid);

	if (profile.studentId) {
		throw redirect(303, '/dashboard/student');
	}

	return {
		user: locals.user
	};
};
