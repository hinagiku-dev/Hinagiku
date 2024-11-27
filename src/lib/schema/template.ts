import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ResourceSchema } from './resource';

export const route = (id: string) => `/templates/${id}`;

export const TemplateSchema = z.object({
	title: z.string().min(1).max(200),
	owner: z.string(),
	public: z.boolean(),
	resources: z.array(ResourceSchema).max(10),
	task: z.string().min(1).max(200),
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	timing: z.object({
		self: z
			.number()
			.int()
			.min(1)
			.max(60 * 24 * 7),
		group: z
			.number()
			.int()
			.min(1)
			.max(60 * 8)
	}),
	createdAt: z.instanceof(Timestamp),
	updatedAt: z.instanceof(Timestamp)
});

export type Template = z.infer<typeof TemplateSchema>;
