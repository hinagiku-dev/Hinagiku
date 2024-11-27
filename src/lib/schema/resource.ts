import { z } from 'zod';
import { Timestamp } from './utils';

export const ResourceTypeSchema = z.enum(['text', 'file', 'link']);

export const ResourceSchema = z.object({
	id: z.string().uuid(),
	type: ResourceTypeSchema,
	name: z.string().min(1).max(200),
	content: z.string().min(1).max(100_000),
	createdAt: Timestamp,
	ref: z.string().nullable(), // to find the raw file
	metadata: z.record(z.string(), z.any()).optional() // for storing file-specific metadata
});

export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
