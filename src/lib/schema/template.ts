import { z } from 'zod';
import { ResourceSchema } from './resource';
import { Timestamp } from './utils';

export const route = (id: string) => `/templates/${id}`;

export const TemplateSchema = z.object({
	title: z.string().min(1).max(200),
	owner: z.string(),
	public: z.boolean(),
	labels: z.array(z.string()).optional().default([]),
	resources: z.array(ResourceSchema).max(10),
	task: z.string().min(1).max(200),
	active_status: z.enum(['active', 'archived', 'deleted']).default('active'),
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	backgroundImage: z.string().nullable().optional(),
	createdAt: Timestamp,
	updatedAt: Timestamp
});

export type Template = z.infer<typeof TemplateSchema>;
