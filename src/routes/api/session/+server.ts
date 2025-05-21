import { SessionSchema, type Session } from '$lib/schema/session';
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
		const { templateId, classId } = await request.json();

		// Get template
		const templateRef = adminDb.collection('templates').doc(templateId);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;

		// Create new session from template
		const sessionData: Session = {
			title: templateData.title,
			host: locals.user.uid,
			classId: classId || null,
			resources: templateData.resources,
			task: templateData.task,
			subtasks: templateData.subtasks,
			backgroundImage: templateData.backgroundImage || null,
			createdAt: Timestamp.now(),
			status: 'preparing',
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
				autoGroup: true
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
