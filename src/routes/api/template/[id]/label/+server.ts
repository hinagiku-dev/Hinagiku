import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const requestDataFormat = z.object({
	labels: z.array(z.string()).max(10)
});

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const { id } = params;
		if (!id) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const templateRef = adminDb.collection('templates').doc(id);
		const templateSnap = await templateRef.get();
		if (!templateSnap.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}
		const templateData = templateSnap.data();
		if (templateData?.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { labels } = await getRequestData(request);
		labels.sort();
		await templateRef.update({ labels: [...new Set(labels)] });

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error('Error updating template labels:', err);
		return json({ error: 'Error updating template labels' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const result = requestDataFormat.parse(data);
	if (!result.labels) {
		throw error(400, 'Missing parameters');
	}
	return result;
}
