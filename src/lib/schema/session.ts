import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const SessionSchema = z.object({
	title: z.string().min(1).max(200),
	status: z.enum(['draft', 'waiting', 'active', 'ended']),
	stage: z.enum(['preparing', 'individual', 'group', 'ended']),
	host: z.string(),
	participants: z.array(z.string()),
	group: z.record(z.string(), z.string()),
	resources: z
		.array(
			z.object({
				name: z.string(),
				content: z.string().min(1),
				createdAt: z.instanceof(Timestamp),
				id: z.string().nullable()
			})
		)
		.max(10),
	task: z.string().min(1).max(200),
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	timing: z.object({
		self: z.number().int().min(1),
		group: z.number().int().min(1)
	}),
	createdAt: z.instanceof(Timestamp)
});

export type Session = z.infer<typeof SessionSchema>;
