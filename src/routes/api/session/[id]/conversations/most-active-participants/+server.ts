import { getConversationsFromAllParticipantsData } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const conversations = await getConversationsFromAllParticipantsData(params.id);
		return json(conversations);
	} catch (err) {
		console.error('Error fetching data:', err);
		throw error(500, '無法獲取資料');
	}
};
