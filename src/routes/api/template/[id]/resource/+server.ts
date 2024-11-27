import type { Resource } from '$lib/schema/resource';
import { ResourceSchema } from '$lib/schema/resource';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

// Add resource
export const POST: RequestHandler = async ({ params, request, locals }) => {
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

		const { name, content, type = 'text' } = await request.json();

		// Create new resource with UUID
		const newResource: Resource = {
			id: uuidv4(),
			type,
			name,
			content,
			createdAt: Timestamp.now(),
			ref: null,
			metadata: {}
		};

		const result = ResourceSchema.safeParse(newResource);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		const currentResources = template.data()?.resources || [];
		if (currentResources.length >= 10) {
			return json({ error: 'Maximum resources limit reached' }, { status: 400 });
		}

		await templateRef.update({
			resources: [...currentResources, result.data],
			updatedAt: Timestamp.now()
		});

		return json({ success: true, resource: result.data });
	} catch (error) {
		console.error('Error adding resource:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
