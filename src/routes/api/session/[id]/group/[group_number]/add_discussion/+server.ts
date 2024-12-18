import { getGroupData, getGroupRef } from '$lib/utils/firestore';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Endpoint for adding a discussion in a group
// POST /api/session/[id]/group/[group_number]/add_discussion/+server
// Request data format
const requestDataFormat = z.object({
	content: z.string(),
	speaker: z.string()
});

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const { id, group_number } = params;
		if (!id || !group_number) {
			throw error(400, 'Missing parameters');
		}

		const group_ref = getGroupRef(id, group_number);
		const { discussions } = await getGroupData(group_ref);

		const { content, speaker } = await getRequestData(request);

		await group_ref.update({
			discussions: [
				...discussions,
				{
					id: locals.user.uid,
					content: content,
					speaker: speaker
				}
			]
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error adding discussion:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const result = requestDataFormat.parse(data);
	if (!result.content || !result.speaker) {
		throw error(400, 'Missing parameters');
	}
	return result;
}
