import type { Group } from '$lib/schema/group';
import { adminDb, getGroupRef } from '$lib/server/firebase';
import { isHarmfulContent } from '$lib/server/gemini';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Endpoint for adding a discussion in a group
// POST /api/session/[id]/group/[group_number]/discussions/add/+server
// Request data format
const requestDataFormat = z.object({
	content: z.string(),
	speaker: z.string(),
	audio: z.string().nullable()
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

		const { content, speaker, audio } = await getRequestData(request);
		const { harmfulContent } = await isHarmfulContent(content);

		const group_ref = getGroupRef(id, group_number);
		await adminDb.runTransaction(async (t) => {
			const doc = await t.get(group_ref);
			const data = doc.data() as Group;
			if (!data || !data.discussions) {
				throw error(400, 'Discussions not found');
			}
			const { discussions } = data;

			t.update(group_ref, {
				discussions: [
					...discussions,
					{
						id: locals.user?.uid,
						content: content,
						speaker: speaker,
						audio: audio,
						moderation: harmfulContent || data.moderation
					}
				],
				updatedAt: new Date(),
				moderation: harmfulContent || data.moderation
			});
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error adding discussion:', error);
		return json({ error: 'Error adding discussion' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const result = requestDataFormat.parse(data);
	if (!result) {
		throw error(400, 'Missing parameters');
	}
	if (typeof result.content !== 'string' || typeof result.speaker !== 'string') {
		throw error(400, 'Invalid parameters');
	}
	return result;
}
