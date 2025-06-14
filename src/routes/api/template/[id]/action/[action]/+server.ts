import type { Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;
		const action = params.action;

		if (action === 'archive') {
			if (templateData.owner !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
			await templateRef.update({
				active_status: 'archived'
			});
			return json({ success: true });
		}
		if (action === 'unarchive') {
			if (templateData.owner !== locals.user.uid) {
				return json({ error: 'Unauthorized' }, { status: 403 });
			}
			await templateRef.update({
				active_status: 'active'
			});
			return json({ success: true });
		}

		return json({
			success: true
		});
	} catch (error) {
		console.error('Error performing action:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
