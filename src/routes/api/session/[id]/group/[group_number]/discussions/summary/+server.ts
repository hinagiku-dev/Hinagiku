import { getGroupData, getGroupRef } from '$lib/server/firebase';
import { summarizeGroupOpinions } from '$lib/server/gemini';
import type { Discussion } from '$lib/server/types';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

// Summary the group discussions
// GET /api/session/[id]/group/[group_number]/discussions/summary/+server

export const GET: RequestHandler = async ({ params, locals, url }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, group_number } = params;
		if (!id || !group_number) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const group_ref = getGroupRef(id, group_number);
		const { discussions } = await getGroupData(group_ref);

		group_ref.update({
			status: 'summarize'
		});

		const student_opinions = discussions.map((discussion) => {
			discussion.speaker = discussion.speaker ? discussion.speaker : 'student';
			return discussion as Discussion;
		});

		// Extract presentation and textStyle from query parameters
		const presentationParam = url.searchParams.get('presentation') || 'paragraph';
		const textStyleParam = url.searchParams.get('textStyle') || 'default';

		const response = await summarizeGroupOpinions(
			student_opinions,
			presentationParam,
			textStyleParam
		);
		if (!response.success) {
			return json({ error: response.error }, { status: 500 });
		}

		group_ref.update({
			summary: response.summary,
			keywords: response.keywords
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error summary discussion:', error);
		return json({ error: 'Error summary discussion' }, { status: 500 });
	}
};

// Update the group discussions summary
// PUT /api/session/[id]/group/[group_number]/discussions/summary/+server
// Request data format
const requestDataFormat = z.object({
	updated_summary: z.string(),
	keywords: z.record(z.string(), z.number())
});

export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, group_number } = params;
		if (!id || !group_number) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const { updated_summary, keywords } = await getRequestData(request);
		const group_ref = getGroupRef(id, group_number);
		console.log('Updating group summary...', updated_summary, keywords);
		group_ref.update({
			summary: updated_summary,
			keywords: keywords
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error updating discussion summary:', error);
		return json({ error: 'Error updating discussion summary' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const result = requestDataFormat.parse(data);
	if (!result.updated_summary) {
		throw error(400, 'Missing parameters');
	}
	if (typeof result.updated_summary !== 'string') {
		throw error(400, 'Invalid parameters');
	}
	return result;
}
