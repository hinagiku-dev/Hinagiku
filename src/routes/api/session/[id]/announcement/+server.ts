import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

/**
 * PUT handler - RESTful method for updating an announcement
 * Updates the announcement for a session. Only the host can update announcements.
 * Since the announcement data is stored in the session document, clients can
 * access it directly from their session subscription without needing a GET endpoint.
 */
export const PUT: RequestHandler = async ({ request, params, locals }) => {
	// Authentication check
	if (!locals.user) {
		return json(
			{ error: 'Unauthorized', message: 'You must be logged in to update announcements' },
			{ status: 401 }
		);
	}

	try {
		const { message, active } = await request.json();
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();

		// Existence check
		if (!sessionDoc.exists) {
			return json(
				{
					error: 'Not Found',
					message: 'Session not found'
				},
				{ status: 404 }
			);
		}

		// Authorization check
		const sessionData = sessionDoc.data();
		if (sessionData?.host !== locals.user.uid) {
			return json(
				{
					error: 'Forbidden',
					message: 'Only the host can broadcast announcements'
				},
				{ status: 403 }
			);
		}

		// Update the announcement based on active state
		await sessionRef.update({
			announcement: {
				message: active ? message : '',
				active: !!active,
				timestamp: Timestamp.fromDate(new Date())
			}
		});

		// Return success with 200 OK for update
		return json(
			{
				success: true,
				message: active
					? 'Announcement broadcast successfully'
					: 'Announcement cancelled successfully'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error updating announcement:', error);
		return json(
			{
				error: 'Internal Server Error',
				message: 'An error occurred while updating the announcement'
			},
			{ status: 500 }
		);
	}
};
