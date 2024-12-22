import { z } from 'zod';
import { ResourceSchema } from './resource';

export const route = (session: string, group: string, conv: string) =>
	`/sessions/${session}/groups/${group}/conversations/${conv}`;

export const ConversationSchema = z.object({
	userId: z.string(),
	task: z.string().min(1).max(200),
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	resources: z.array(ResourceSchema).max(10),
	history: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string(),
			audio: z.string().nullable(), // to find the raw file
			warning: z
				.object({
					moderation: z.boolean(), // True if the message was flagged for moderation
					inappropriate_content: z.number().min(1).max(10),
					stealing_llm_info: z.number().min(1).max(10),
					off_topic: z.number().min(1).max(10)
				})
				.nullable()
		})
	),
	completed: z.array(z.boolean()).nullable(),
	summary: z.string().nullable(),
	keyPoints: z.array(z.string()).nullable()
});

export type Conversation = z.infer<typeof ConversationSchema>;
