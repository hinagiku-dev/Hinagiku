import { getConversationsData, getConversationsRef } from '$lib/server/firebase';
import { requestLLM, summarizeConcepts } from '$lib/server/gemini';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { Conversation } from '$lib/schema/conversation';

export async function GET() {
	// 這裡可改為從 query 取得參數，暫時寫死
	const sessionId = 'V5J7eTOAihp3hNazbxTl';
	const groupId = 'DO1nAnON7EBqvmhULLKc';

	const conversations_ref = getConversationsRef(sessionId, groupId);
	const conversation = await getConversationsData(conversations_ref);

	const { similar_view_points, different_view_points, students_summary } = await summarizeConcepts(
		conversation.map((conv: Conversation) => ({
			summary: conv.summary as string,
			keyPoints: conv.keyPoints as string[]
		}))
	);

	const prompt = '請檢查以下內容是否有使用「我們」、「大家」這類型的第一人稱作為主詞';
	const schema = z.object({ having: z.boolean() });

	const { result } = await requestLLM(
		prompt,
		[
			{
				role: 'user',
				content: students_summary
			}
		],
		schema
	);

	let message = '';
	if (result.having) {
		message = '有使用「我們」作為主詞';
	} else {
		message = '沒有使用「我們」作為主詞';
	}

	return json({
		similar_view_points,
		different_view_points,
		students_summary,
		pass: result.having,
		message
	});
}
