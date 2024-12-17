import type { Conversation } from '$lib/schema/conversation';
import { adminDb } from '$lib/server/firebase';
import { summarizeConcepts, summarizeStudentChat } from '$lib/server/llm';
import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}
		if (!params.id || !params.group_number || !params.conv_id) {
			throw error(400, 'Missing parameters');
		}

		const conversationRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number)
			.collection('conversations')
			.doc(params.conv_id);

		const conversation = await conversationRef.get();
		if (!conversation.exists) {
			throw error(404, 'Conversation not found');
		}

		const conversationData = conversation.data() as Conversation;
		if (!conversationData) {
			throw error(404, 'Conversation not found');
		}

		const { userId } = conversationData;
		if (userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		const response = await summarizeStudentChat(conversationData.history);
		if (!response.success) {
			throw error(500, response.error);
		}
		await conversationRef.update({
			summary: response.summary,
			keyPoints: response.keyPoints
		});

		const conversationsRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number)
			.collection('conversations');
		const conversations = await conversationsRef.get();

		const allSummarized = conversations.docs.every((doc) => {
			const data = doc.data() as Conversation;
			return data.summary !== null;
		});

		if (!allSummarized) {
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		const result = await summarizeConcepts(
			conversations.docs.map((doc) => {
				const data = doc.data() as Conversation;
				return { student_summary: data.summary!, student_key_points: data.keyPoints! };
			})
		);

		const groupRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number);

		await groupRef.update({
			concept: `${result.students_summary}\n\nSimilar view points: ${result.similar_view_points}\n\nDifferent view points: ${result.different_view_points}`
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error('Error creating session:', error);
		return new Response(JSON.stringify({ success: false, error: error }), { status: 500 });
	}
};
