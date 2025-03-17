import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		if (url.searchParams.has('then')) {
			const then = url.searchParams.get('then') || '';
			if (then.startsWith('/')) {
				throw redirect(303, then);
			}
		}
		throw redirect(303, '/dashboard');
	}

	return {};
};
