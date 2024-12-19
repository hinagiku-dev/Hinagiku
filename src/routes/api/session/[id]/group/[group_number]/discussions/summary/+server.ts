import { summarizeGroupOpinions } from '$lib/server/llm';
import { getGroupData, getGroupRef } from '$lib/utils/firestore';
import type { Discussion, StudentSpeak } from '$lib/utils/types';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, locals }) => {
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
		const student_opinions = discussion2StudentSpeak(discussions);

		const response = await summarizeGroupOpinions(student_opinions);
		if (!response.success) {
			return json({ error: response.error }, { status: 500 });
		}

		group_ref.update({
			group_summary: response.summary
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error summary discussion:', error);
		return json({ error: 'Error summary discussion' }, { status: 500 });
	}
};

function discussion2StudentSpeak(discussions: Discussion[]): StudentSpeak[] {
	return discussions.map((discussion) => ({
		role: discussion.speaker ? discussion.speaker : 'student',
		content: discussion.content
	}));
}
