import { TemplateSchema } from '$lib/schema/template';
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
		const template = {
			...data,
			owner: locals.user.uid,
			resources: [],
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
