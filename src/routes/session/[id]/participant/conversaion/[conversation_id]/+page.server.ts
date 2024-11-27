import { ConversationSchema } from '$lib/schema/conversation';
import { adminDb } from '$lib/server/firebase';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// load conversation
	const conversationRef = adminDb.collection('conversation').doc(params.conversation_id);
	const conversation = (await conversationRef.get()).data() as z.infer<typeof ConversationSchema>;
	if (!conversation) {
		throw error(404, 'Conversation not found');
	}
	if (conversation.userId !== locals.user?.uid) {
		throw redirect(303, '/session');
	}

	return {
		user: locals.user,
		history: conversation.history
	};
};
