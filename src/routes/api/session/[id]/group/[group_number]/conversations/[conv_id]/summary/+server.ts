import { summarizeConcepts, summarizeStudentChat } from '$lib/server/llm';
import {
	getConversationData,
	getConversationRef,
	getConversationsData,
	getConversationsRef,
	getGroupRef
} from '$lib/utils/firestore';
import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';

// Endpoint for summarizing a student chat
// GET /api/session/[id]/group/[group_number]/conversations/[conv_id]/summary/+server

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const { id, group_number, conv_id } = params;
		if (!id || !group_number || !conv_id) {
			throw error(400, 'Missing parameters');
		}

		const conversation_ref = await getConversationRef(id, group_number, conv_id);
		const { userId, history } = await getConversationData(conversation_ref);

		if (userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		const response = await summarizeStudentChat(history);
		if (!response.success) {
			throw error(500, response.error);
		}
		const { summary, key_points } = response;

		await conversation_ref.update({
			summary: summary,
			keyPoints: key_points
		});

		const conversations_ref = getConversationsRef(id, group_number);
		const conversations = await getConversationsData(conversations_ref);

		if (!(await isAllSummarized(conversations))) {
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}
		console.log('all summarized');

		const { similar_view_points, different_view_points, students_summary } =
			await summarizeConcepts(
				conversations.map((conversation) => ({
					summary: conversation.summary as string,
					keyPoints: conversation.keyPoints as string[]
				}))
			);

		const groupRef = getGroupRef(id, group_number);
		await groupRef.update({
			similar_view_points: similar_view_points,
			different_view_points: different_view_points,
			students_summary: students_summary
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error('Error creating session:', error);
		return new Response(JSON.stringify({ success: false, error: error }), { status: 500 });
	}
};

async function isAllSummarized(conversations: FirebaseFirestore.DocumentData[]) {
	return conversations.every((conversation) => conversation.summary && conversation.keyPoints);
}
