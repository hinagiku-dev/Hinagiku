import type { Resource } from '$lib/schema/resource';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

// Delete resource by UUID
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { id: templateId, resourceId } = params;
		const templateRef = adminDb.collection('templates').doc(templateId);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		if (template.data()?.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const currentResources = (template.data()?.resources as Resource[]) || [];
		const resourceToDelete = currentResources.find((r) => r.id === resourceId);

		if (!resourceToDelete) {
			return json({ error: 'Resource not found' }, { status: 404 });
		}

		// If resource has a file reference, we might want to delete it from storage too?
		// if (resourceToDelete.ref) {
		// }

		const updatedResources = currentResources.filter((r) => r.id !== resourceId);

		await templateRef.update({
			resources: updatedResources,
			updatedAt: Timestamp.now()
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting resource:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
