import { z } from 'zod';

export const GroupSchema = z.object({
	concept: z.string().min(1),
	discussions: z.array(
		z.object({
			content: z.string(),
			id: z.string().nullable()
		})
	),
	summary: z.string().nullable(),
	keywords: z.record(z.string(), z.number())
});

export type Group = z.infer<typeof GroupSchema>;
