import {
	getConversationsFromAllParticipantsData,
	getDiscussionsFromAllGroupsData,
	getSessionRef
} from '$lib/server/firebase';
import { summarizeSession } from '$lib/server/llm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { sessionId } = await request.json();

	if (!sessionId) {
		return json({ success: false, error: 'Session ID is required' }, { status: 400 });
	}

	try {
		const [conversations, discussions] = await Promise.all([
			getConversationsFromAllParticipantsData(sessionId),
			getDiscussionsFromAllGroupsData(sessionId)
		]);

		const individualRecords = conversations.map((c) => ({
			studentId: c.userId,
			history: c.history
		}));

		const groupRecords = discussions.map((d) => ({
			groupId: d.groupId,
			discussion: d.discussion
		}));

		const result = await summarizeSession(individualRecords, groupRecords);

		if (result.success) {
			const sessionRef = getSessionRef(sessionId);
			const { summary } = result;
			await sessionRef.update({ summary: summary });
			return json({ success: true, summary: summary });
		} else {
			return json({ success: false, error: result.error }, { status: 500 });
		}
	} catch (e) {
		console.error('Error summarizing session:', e);
		const errorMessage = e instanceof Error ? e.message : 'Failed to summarize session';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
