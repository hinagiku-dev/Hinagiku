import {
	getConversationData,
	getConversationRef,
	getConversationsData,
	getConversationsRef,
	getGroupRef
} from '$lib/server/firebase';
import { summarizeConcepts, summarizeStudentChat } from '$lib/server/gemini';
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

		const conversation_ref = getConversationRef(id, group_number, conv_id);
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
		console.log(
			'summarized concepts',
			similar_view_points,
			different_view_points,
			students_summary
		);

		const groupRef = getGroupRef(id, group_number);
		await groupRef.update({
			similar_view_points: similar_view_points,
			different_view_points: different_view_points,
			students_summary: students_summary,
			discussions: [
				{
					content:
						`**📝 討論總結：**\n\n${students_summary}\n\n` +
						`**🤝 相似觀點：**\n\n${similar_view_points.map((point) => `• ${point}\n`).join('\n')}\n\n` +
						`**💭 不同觀點：**\n\n${different_view_points.map((point) => `• ${point}\n`).join('\n')}\n\n` +
						`\n\n**以上是大家各自想法的統整，請你們根據這些資料進行討論吧！\n如果有任何問題，你可以呼喊「嘿小菊」來尋求協助！**`,
					id: '小菊',
					speaker: '小菊'
				}
			]
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
