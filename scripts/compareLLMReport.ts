import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

import { requestLLM, summarizeConcepts } from '../src/lib/server/gemini';

import { getConversationData, getConversationRef } from '../src/lib/server/firebase';

async function checkCroupConceptUseWe(sessionId: string, groupId: string, conversationId: string) {
	const conversations_ref = getConversationRef(sessionId, groupId, conversationId);
	const conversations = await getConversationData(conversations_ref);

	const { similar_view_points, different_view_points, students_summary } = await summarizeConcepts(
		conversations.map((conversation) => ({
			summary: conversation.summary as string,
			keyPoints: conversation.keyPoints as string[]
		}))
	);

	console.log('summarized concepts', similar_view_points, different_view_points, students_summary);

	const prompt = '請檢查以下內容是否有使用「我們」作為主詞';
	const schema = z.object({ having: z.boolean() });

	const { result } = await requestLLM(
		prompt,
		[
			{
				role: 'user',
				content: students_summary
			}
		],
		{
			schema
		}
	);

	if (result.having) {
		console.log('有使用「我們」作為主詞');
	} else {
		console.log('沒有使用「我們」作為主詞');
	}
}

async function main() {
	checkCroupConceptUseWe('V5J7eTOAihp3hNazbxTl', 'DO1nAnON7EBqvmhULLKc', 'jlTkN3xaaYWpvYI2D9Wu');
}

main();
