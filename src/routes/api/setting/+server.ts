import { SettingSchema } from '$lib/schema/setting';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, locals }) => {
	// Verify user is authenticated
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Parse request body
		const requestData = await request.json();

		// Validate the data with our schema (excluding updatedAt which we'll set server-side)
		const settingResult = SettingSchema.omit({
			updatedAt: true
		}).safeParse(requestData);

		if (!settingResult.success) {
			return json(
				{ error: 'Invalid data', details: settingResult.error.format() },
				{ status: 400 }
			);
		}

		// Update settings in Firestore
		await adminDb
			.collection('settings')
			.doc(locals.user.uid)
			.set(
				{
					...settingResult.data,
					updatedAt: FieldValue.serverTimestamp()
				},
				{ merge: true }
			);

		return json({ success: true });
	} catch (error) {
		console.error('Error updating settings:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
