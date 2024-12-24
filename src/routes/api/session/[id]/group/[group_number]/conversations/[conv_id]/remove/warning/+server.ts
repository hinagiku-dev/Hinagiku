import { getConversationRef, getSessionData, getSessionRef } from '$lib/utils/firestore';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	console.log('GET request received', { params });
	try {
		if (!locals.user) {
			redirect(303, '/login');
		}

		const { id, group_number, conv_id } = params;
		if (!id || !group_number || !conv_id) {
			throw error(400, 'Missing parameters');
		}

		const conversation_ref = getConversationRef(id, group_number, conv_id);
		const session = getSessionRef(id);
		const sessionData = await getSessionData(session);

		if (sessionData.host !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		conversation_ref.update({
			warning: {
				moderation: false,
				offTopic: false
			}
		});

		return json({
			success: true
		});
	} catch (error) {
		console.error('Error removing moderation:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
