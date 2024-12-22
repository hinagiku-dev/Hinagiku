import { ProfileSchema } from '$lib/schema/profile';
import { adminDb } from '$lib/server/firebase';
import { fail, redirect } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
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
		const title = data.get('title')?.toString() || null;
		const bio = data.get('bio')?.toString() || null;

		const profile = ProfileSchema.omit({
			updatedAt: true,
			createdAt: true
		}).safeParse({
			uid: locals.user.uid,
			displayName,
			title,
			bio
		});

		if (!profile.success) {
			return fail(400, { missing: true });
		}

		try {
			// Update profile in Firestore
			await adminDb
				.collection('profiles')
				.doc(locals.user.uid)
				.set(
					{
						...profile.data,
						updatedAt: FieldValue.serverTimestamp()
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
