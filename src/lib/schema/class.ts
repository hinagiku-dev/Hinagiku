import { z } from 'zod';
import { Timestamp } from './utils';

export const route = (classId: string) => `/classes/${classId}`;

export const ClassSchema = z.object({
	id: z.string().describe('Unique class identifier'),
	code: z.string().describe('Random class code for students to join'),
	teacherId: z.string().describe('User ID of the teacher'),
	schoolName: z.string().min(1).max(100),
	academicYear: z.string().min(1).max(20),
	className: z.string().min(1).max(50),
	students: z.array(z.string()).describe('Array of student user IDs').default([]),
	groups: z
		.array(
			z.object({
				number: z.number(),
				students: z.array(z.string()).default([])
			})
		)
		.describe('Class group information')
		.default([]),
	updatedAt: Timestamp,
	createdAt: Timestamp
});

export type Class = z.infer<typeof ClassSchema>;
