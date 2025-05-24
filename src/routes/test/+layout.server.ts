import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function load() {
	if (!dev) {
		throw redirect(302, '/');
	}
}
