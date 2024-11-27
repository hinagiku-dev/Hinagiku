import { TemplateSchema, type Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

// Update template fields
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;

		if (templateData.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const updates = await request.json();
		const updatedTemplate: Template = {
			...templateData,
			...updates,
			updatedAt: Timestamp.now()
		};

		const result = TemplateSchema.safeParse(updatedTemplate);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		await templateRef.update(result.data);
		return json({ success: true });
	} catch (error) {
		console.error('Error updating template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// Delete template
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		if (template.data()?.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		await templateRef.delete();
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// Add this to the existing file, before the PATCH handler

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;

		// Check if the user is authorized to view this template
		if (!templateData.public && templateData.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		return json({ ...templateData, id: template.id });
	} catch (error) {
		console.error('Error fetching template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
