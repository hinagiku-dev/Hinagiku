/**
 * @fileoverview
 * Session creation API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles the creation of new learning sessions from existing templates.
 * It provides the core functionality for teachers to initiate structured educational
 * activities with students. 
 * 
 * Features:
 * - Template-based session creation with inheritance of resources and tasks
 * - Class association for organized student management
 * - Automatic session configuration with default settings
 * - Schema validation for data integrity
 * - Proper error handling for missing templates or authorization issues
 * 
 * The endpoint creates sessions in "preparing" status, allowing teachers to
 * configure settings and organize students before starting the actual learning
 * activity.
 * 
 * @route POST /api/session
 * @param {string} templateId - Template ID to create session from
 * @param {string} [classId] - Optional class ID to associate with session
 * @returns {Object} Success status with new session ID or error details
 */

import { SessionSchema, type Session } from '$lib/schema/session';
import type { Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

/**
 * Creates a new learning session from an existing template.
 * 
 * Validates user authentication, retrieves the specified template,
 * and creates a new session with inherited template properties.
 * The session is initialized in "preparing" status for teacher setup.
 * 
 * @param request - SvelteKit request containing template and class IDs
 * @param locals - SvelteKit locals containing authenticated user context
 * @returns JSON response with success status and session ID or error details
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify user authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { templateId, classId } = await request.json();

		// Retrieve template data for session creation
		const templateRef = adminDb.collection('templates').doc(templateId);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;

		// Create new session with template inheritance
		const sessionData: Session = {
			title: templateData.title,
			host: locals.user.uid,
			classId: classId || null,
			resources: templateData.resources,
			task: templateData.task,
			subtasks: templateData.subtasks,
			backgroundImage: templateData.backgroundImage || null,
			reflectionQuestion: templateData.reflectionQuestion || '',
			createdAt: Timestamp.now(),
			active_status: 'active',
			status: 'preparing', // Initial status for teacher setup
			labels: [],
			waitlist: [],
			timing: {
				individual: {
					start: null,
					end: null
				},
				group: {
					start: null,
					end: null
				}
			},
			settings: {
				groupingMode: 'auto' // Default to automatic grouping
			}
		};

		// Validate session data against schema
		const result = SessionSchema.safeParse(sessionData);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		// Create session document in Firestore
		const sessionRef = adminDb.collection('sessions').doc();
		await sessionRef.set(result.data);

		return json({
			success: true,
			sessionId: sessionRef.id
		});
	} catch (error) {
		console.error('Error creating session:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
