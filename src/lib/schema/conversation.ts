import { z } from 'zod';
import { ResourceSchema } from './resource';

export const route = (session: string, group: string, conv: string) =>
	`/sessions/${session}/groups/${group}/conversations/${conv}`;

export const ConversationSchema = z.object({
	userId: z.string(),
	task: z.string().min(1).max(200),
	subtaskCompleted: z.array(z.boolean().default(false)),
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	resources: z.array(ResourceSchema).max(10),
	history: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string(),
			audio: z.string().nullable() // to find the raw file
		})
	),
	subtaskCompleted: z.array(z.boolean().default(false)),
	summary: z.string().nullable(),
	keyPoints: z.array(z.string()).nullable()
});

export type Conversation = z.infer<typeof ConversationSchema>;
