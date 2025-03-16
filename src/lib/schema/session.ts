import { z } from 'zod';
import { ResourceSchema } from './resource';
import { Timestamp } from './utils';

export const route = (id: string) => `/sessions/${id}`;

export const SessionSchema = z.object({
	title: z.string().min(1).max(200), // frozen, from template
	host: z.string(),
	resources: z.array(ResourceSchema).max(10), // frozen, from template
	task: z.string().min(1).max(200), // frozen, from template
	subtasks: z.array(z.string().min(1).max(200)).max(10), // frozen, from template
	createdAt: Timestamp,
	status: z.enum(['preparing', 'individual', 'before-group', 'group', 'ended']),
	labels: z.array(z.string()),
	timing: z.object({
		individual: z.object({
			start: Timestamp.nullable(),
			end: Timestamp.nullable()
		}),
		group: z.object({
			start: Timestamp.nullable(),
			end: Timestamp.nullable()
		})
	}),
	settings: z
		.object({
			autoGroup: z.boolean()
		})
		.optional()
		.default({ autoGroup: true })
});

export type Session = z.infer<typeof SessionSchema>;
