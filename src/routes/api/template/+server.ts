import { TemplateSchema, type Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();
		const template: Template = {
			title: 'New Discussion Template',
			task: 'Discuss about the origin of the universe.',
			subtasks: [
				'Explain your understanding of the Big Bang theory',
				'Share your thoughts on alternative theories',
				'Discuss the role of scientific evidence',
				'Consider philosophical implications'
			],
			public: data.public ?? false,
			owner: locals.user.uid,
			labels: [],
			resources: [],
			backgroundImage: null,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		};

		const result = TemplateSchema.safeParse(template);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		const templateRef = adminDb.collection('templates').doc();
		await templateRef.set(result.data);

		return json({ id: templateRef.id });
	} catch (error) {
		console.error('Error creating template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
