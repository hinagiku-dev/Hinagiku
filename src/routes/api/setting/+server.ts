/**
 * @fileoverview
 * User settings management API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles updating user-specific configuration settings that
 * control platform behavior and features. Settings are validated against
 * the SettingSchema and stored per-user for personalized experiences.
 * 
 * Features:
 * - User-specific settings persistence in Firestore
 * - Schema validation for data integrity
 * - Automatic timestamp tracking for update history
 * - Merge-based updates to preserve existing settings
 * - Authentication verification for security
 * 
 * Current settings include:
 * - Voice Activity Detection (VAD) preferences for individual and group activities
 * - Future platform customization options
 * 
 * Settings are stored per user and persist across sessions, allowing
 * personalized educational experiences based on user preferences.
 * 
 * @route PUT /api/setting
 * @param {boolean} [enableVADIndividual] - Enable VAD during individual activities
 * @param {boolean} [enableVADGroup] - Enable VAD during group activities
 * @returns {Object} Success status or error details
 */

import { SettingSchema } from '$lib/schema/setting';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

/**
 * Updates user settings with validation and timestamp tracking.
 * 
 * Validates incoming settings data against the SettingSchema,
 * then updates the user's settings document in Firestore with
 * merge behavior to preserve existing settings not included
 * in the update request.
 * 
 * @param request - SvelteKit request containing settings update data
 * @param locals - SvelteKit locals containing authenticated user context
 * @returns JSON response with success status or error details
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
	// Verify user authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Parse request body for settings data
		const requestData = await request.json();

		// Validate settings data excluding server-managed timestamp
		const settingResult = SettingSchema.omit({
			updatedAt: true
		}).safeParse(requestData);

		if (!settingResult.success) {
			return json(
				{ error: 'Invalid data', details: settingResult.error.format() },
				{ status: 400 }
			);
		}

		// Update user settings with merge to preserve existing data
		await adminDb
			.collection('settings')
			.doc(locals.user.uid)
			.set(
				{
					...settingResult.data,
					updatedAt: FieldValue.serverTimestamp()
				},
				{ merge: true } // Preserve existing settings not in update
			);

		return json({ success: true });
	} catch (error) {
		console.error('Error updating settings:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
