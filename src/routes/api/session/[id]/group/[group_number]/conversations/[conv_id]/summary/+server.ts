import {
	getConversationData,
	getConversationRef,
	getConversationsData,
	getConversationsRef,
	getGroupRef
} from '$lib/server/firebase';
import { summarizeConcepts, summarizeStudentChat } from '$lib/server/gemini';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json, redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Endpoint for summarizing a student chat
// GET /api/session/[id]/group/[group_number]/conversations/[conv_id]/summary/+server

export const GET: RequestHandler = async ({ params, locals, url }) => {
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

		// Loop and filter the list of messages from the history if the message is offTopic or the role is assistant
		const filteredHistory = history.filter(
			(message) => !message.warning?.offTopic && message.role !== 'assistant'
		);
		if (filteredHistory.length === 0) {
			// If there are no messages to summarize, return a success response
			console.log('No messages to summarize');
			await conversation_ref.update({
				summary: 'No messages to summarize',
				keyPoints: []
			});
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		} else {
			console.log('History:', history);
			console.log('Filtered history:', filteredHistory);
		}

		// Extract presentation and textStyle from query parameters
		const presentationParam = url.searchParams.get('presentation') || 'paragraph';
		const textStyleParam = url.searchParams.get('textStyle') || 'default';
		const response = await summarizeStudentChat(filteredHistory, presentationParam, textStyleParam);
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
						`\n\n**以上是大家各自想法的統整，請你們根據這些資料進行討論吧！\n如果有任何問題，你可以呼喊「哈囉小菊」來尋求協助！**`,
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

// Update the conversation summary
// PUT /api/session/[id]/group/[group_number]/conversations/[conv_id]/summary/+server
// Request data format
const requestDataFormat = z.object({
	updated_summary: z.string(),
	key_points: z.array(z.string())
});

export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, group_number, conv_id } = params;
		if (!id || !group_number || !conv_id) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const conversation_ref = getConversationRef(id, group_number, conv_id);
		const { userId } = await getConversationData(conversation_ref);

		if (userId !== locals.user.uid) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const { updated_summary, key_points } = await getRequestData(request);
		console.log('Updating conversation summary...', updated_summary, key_points);

		await conversation_ref.update({
			summary: updated_summary,
			keyPoints: key_points
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error updating conversation summary:', error);
		return json({ error: 'Error updating conversation summary' }, { status: 500 });
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

async function isAllSummarized(conversations: FirebaseFirestore.DocumentData[]) {
	return conversations.every((conversation) => conversation.summary && conversation.keyPoints);
}
