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
			speaker: z.string() // i am not sure if this is going to be used
		})
	),
	summary: z.string().nullable(), // lock on stage 2 finalize transaction
	keywords: z.record(z.string(), z.number().min(1).max(5))
});

export type Group = z.infer<typeof GroupSchema>;
