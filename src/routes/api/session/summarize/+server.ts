import { getConversationsFromAllParticipantsData, getSessionRef } from '$lib/server/firebase';
import { summarizeSession } from '$lib/server/llm';
import type { LLMChatMessage } from '$lib/server/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { sessionId } = await request.json();

	if (!sessionId) {
		return json({ success: false, error: 'Session ID is required' }, { status: 400 });
	}

	try {
		const conversations = await getConversationsFromAllParticipantsData(sessionId);
		if (!conversations || conversations.length === 0) {
			return json(
				{ success: false, error: 'No conversations found for this session' },
				{ status: 404 }
			);
		}

		const history: LLMChatMessage[] = conversations.flatMap((c) => c.history);

		// Filter out any empty messages, just in case
		const filteredHistory = history.filter((h) => h.content.trim() !== '');

		if (filteredHistory.length === 0) {
			return json(
				{ success: false, error: 'No content in conversations to summarize' },
				{ status: 400 }
			);
		}

		const result = await summarizeSession(filteredHistory);

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
