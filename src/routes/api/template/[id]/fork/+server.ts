import { TemplateSchema, type Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sourceTemplateRef = adminDb.collection('templates').doc(params.id);
		const sourceTemplate = await sourceTemplateRef.get();

		if (!sourceTemplate.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const sourceData = sourceTemplate.data() as Template;

		// Create new template with copied data
		const forkedTemplate: Template = {
			...sourceData,
			title: `${sourceData.title} (Fork)`,
			owner: locals.user.uid,
			public: false, // Set forked template as private by default
			backgroundImage: sourceData.backgroundImage || null, // Preserve background image
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		};

		const result = TemplateSchema.safeParse(forkedTemplate);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		const newTemplateRef = adminDb.collection('templates').doc();
		await newTemplateRef.set(result.data);

		return json({ id: newTemplateRef.id });
	} catch (error) {
		console.error('Error forking template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
