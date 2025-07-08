/**
 * @fileoverview
 * Template creation API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles the creation of new learning activity templates that
 * teachers can use to structure educational sessions. Templates serve as
 * reusable blueprints containing:
 * - Learning objectives and tasks
 * - Structured subtasks for guided learning
 * - Resource attachments and materials
 * - Internationalized default content
 * 
 * Features:
 * - Automatic internationalization using deployment language settings
 * - Schema validation for template data integrity
 * - Public/private template visibility control
 * - Default template structure with educational best practices
 * - Proper ownership assignment for access control
 * 
 * Templates created through this endpoint are initially populated with
 * localized default content that teachers can customize for their specific
 * educational needs.
 * 
 * @route POST /api/template
 * @param {boolean} [public] - Whether template should be publicly visible
 * @returns {Object} Template ID for the newly created template
 */

import { deploymentConfig } from '$lib/config/deployment';
import * as m from '$lib/paraglide/messages.js';
import { TemplateSchema, type Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

/**
 * Creates a new educational activity template with default structure.
 * 
 * Generates a template with internationalized default content based on
 * deployment language settings. The template includes educational best
 * practices with structured subtasks and proper ownership assignment.
 * 
 * @param request - SvelteKit request containing template configuration
 * @param locals - SvelteKit locals containing authenticated user context
 * @returns JSON response with new template ID or error details
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify user authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Configure internationalization based on deployment settings
		const i18nServerCfg = { languageTag: deploymentConfig.defaultLanguage };

		const data = await request.json();
		
		// Create template with localized default content
		const template: Template = {
			title: m.defaultTemplateTitle({}, i18nServerCfg),
			task: m.defaultTemplateTask({}, i18nServerCfg),
			subtasks: [
				m.defaultTemplateSubtask1({}, i18nServerCfg),
				m.defaultTemplateSubtask2({}, i18nServerCfg),
				m.defaultTemplateSubtask3({}, i18nServerCfg),
				m.defaultTemplateSubtask4({}, i18nServerCfg)
			],
			public: data.public ?? false, // Default to private template
			owner: locals.user.uid,
			labels: [],
			resources: [],
			backgroundImage: null,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
			active_status: 'active'
		};

		// Validate template data against schema
		const result = TemplateSchema.safeParse(template);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		// Create template document in Firestore
		const templateRef = adminDb.collection('templates').doc();
		await templateRef.set(result.data);

		return json({ id: templateRef.id });
	} catch (error) {
		console.error('Error creating template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
