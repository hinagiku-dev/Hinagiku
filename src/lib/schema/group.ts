import { z } from 'zod';

export const route = (session: string, group: string) => `/sessions/${session}/groups/${group}`;

export const GroupSchema = z.object({
	number: z.number(),
	participants: z.array(z.string()),
	concept: z.string().min(1).nullable(), // lock on stage 1 -> stage 2 transaction
	discussions: z.array(
		z.object({
			content: z.string(),
			id: z.string().nullable(),
			speaker: z.string(),
			audio: z.string().nullable(), // to find the raw file
			moderation: z.boolean().default(false)
		})
	),
	updatedAt: z.date().nullable(),
	status: z.enum(['discussion', 'summarize', 'end']).default('discussion'),
	summary: z.string().nullable(), // lock on stage 2 finalize transaction
	keywords: z.record(z.string(), z.number().min(1).max(5)),
	moderation: z.boolean().default(false),
	presentation: z.enum(['paragraph', 'list2', 'list3', 'list4', 'list5']).default('paragraph'),
	textStyle: z.enum(['default', 'humor', 'serious', 'casual', 'cute']).default('default')
});

export interface GroupDiscussionMessage {
	userId: string;
	role: 'user' | 'assistant';
	content: string;
	audio?: string | null;
	timestamp: Date;
}

export type Group = z.infer<typeof GroupSchema>;
