import {
	createConversation,
	getGroupData,
	getGroupRef,
	getSessionData,
	getSessionRef
} from '$lib/server/firebase';
import { generateIntroduction } from '$lib/server/llm';
import type { LLMChatMessage } from '$lib/server/types';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const { id, group_number } = params;
		if (!id || !group_number) {
			throw error(400, 'Missing parameters');
		}

		const session_ref = getSessionRef(id);
		const { task, subtasks, resources } = await getSessionData(session_ref);
		const group_ref = getGroupRef(id, group_number);
		const group_data = await getGroupData(group_ref);

		const { response } = await generateIntroduction(task, subtasks, resources);

		if (!response) {
			throw error(500, 'Error generating intro message');
		}
		const history: LLMChatMessage[] = [{ role: 'assistant', content: response }];

		await Promise.all(
			group_data.participants.map(async (participant) =>
				createConversation(id, group_number, participant, task, subtasks, history, resources)
			)
		);

		return json({
			success: true
		});
	} catch (error) {
		console.error('Error creating conversation:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
