import { z } from 'zod';

export const ConversationSchema = z.object({
	history: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string()
		})
	)
});

export type Conversation = z.infer<typeof ConversationSchema>;
