import { createConversation } from '$lib/utils/firestore';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

// 更新請求數據格式
const requestDataFormat = z.object({
	task: z.string(),
	subtasks: z.array(z.string()),
	resources: z.array(z.string()),
	participant: z.string()
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

		const { task, subtasks, resources, participant } = await getRequestData(request);

		const conv_id = await createConversation(
			id,
			group_number,
			participant,
			task,
			subtasks,
			resources
		);

		return json({
			success: true,
			conversationId: conv_id
		});
	} catch (error) {
		console.error('Error creating conversation:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

async function getRequestData(request: Request): Promise<z.infer<typeof requestDataFormat>> {
	const data = await request.json();
	const result = requestDataFormat.parse(data);
	if (!result.task || !result.subtasks || !result.resources || !result.participant) {
		throw error(
			400,
			`Missing parameters: ${!result.task ? 'task ' : ''}${!result.subtasks ? 'subtasks ' : ''}${
				!result.resources ? 'resources ' : ''
			}${!result.participant ? 'participant' : ''}`.trim()
		);
	}
	return result;
}
