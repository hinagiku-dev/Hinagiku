import { getSessionData, getSessionRef } from '$lib/server/firebase';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

// update tags: z.array(z.string())
// PUT /api/session/[id]/label/+server
// Request data format
const requestDataFormat = z.object({
	labels: z.array(z.string())
});

export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const { id } = params;
		if (!id) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const session_ref = getSessionRef(id);
		const session = await getSessionData(session_ref);
		if (locals.user.uid != session.host) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { labels } = await getRequestData(request);
		await session_ref.update({
			labels: labels
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error updating session labels:', error);
		return json({ error: 'Error updating discussion summary' }, { status: 500 });
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
