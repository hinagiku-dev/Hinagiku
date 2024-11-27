import { SessionSchema } from '$lib/schema/session';
import type { Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { templateId } = await request.json();

		// Get template
		const templateRef = adminDb.collection('templates').doc(templateId);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;

		// Create new session from template
		const sessionData = {
			title: templateData.title,
			host: locals.user.uid,
			resources: templateData.resources,
			task: templateData.task,
			subtasks: templateData.subtasks,
			createdAt: Timestamp.now(),
			status: 'preparing',
			end: {
				self: null,
				group: null
			}
		};

		const result = SessionSchema.safeParse(sessionData);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

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
