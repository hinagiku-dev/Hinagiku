import { adminDb } from '$lib/server/firebase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		user: locals.user
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const displayName = data.get('displayName')?.toString();
		const title = data.get('title')?.toString();
		const bio = data.get('bio')?.toString();

		if (!displayName) {
			return fail(400, { missing: true });
		}

		try {
			// Update profile in Firestore
			await adminDb
				.collection('profiles')
				.doc(locals.user.uid)
				.set(
					{
						uid: locals.user.uid,
						displayName,
						title: title || null,
						bio: bio || null,
						updatedAt: new Date()
					},
					{ merge: true }
				);

			return { success: true };
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(500, { error: true });
		}
	}
} satisfies Actions;
