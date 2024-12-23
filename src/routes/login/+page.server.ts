import { signOut } from '$lib/stores/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (locals.user) {
		throw redirect(303, '/dashboard');
	} else {
		signOut(fetch);
	}

	return {};
};
