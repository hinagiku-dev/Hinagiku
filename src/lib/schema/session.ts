import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ResourceSchema } from './resource';

export const route = (id: string) => `/sessions/${id}`;

export const SessionSchema = z.object({
	title: z.string().min(1).max(200), // frozen, from template
	host: z.string(),
	resources: z.array(ResourceSchema).max(10), // frozen, from template
	task: z.string().min(1).max(200), // frozen, from template
	subtasks: z.array(z.string().min(1).max(200)).max(10), // frozen, from template
	createdAt: z.instanceof(Timestamp),
	status: z.enum(['preparing', 'individual', 'group', 'ended']),
	end: z.object({
		self: z.instanceof(Timestamp).nullable(), // must be non-null before started this stage
		group: z.instanceof(Timestamp).nullable() // must be non-null before started this stage
	})
});

export type Session = z.infer<typeof SessionSchema>;
