import { z } from 'zod';
import { Timestamp } from './utils';

export const route = (uid: string) => `/profiles/${uid}`;

export const ProfileSchema = z.object({
	uid: z.string().describe('User ID associated with auth'),
	displayName: z.string().min(1).max(100),
	title: z.string().max(100).nullable(),
	bio: z.string().min(1).max(1000).nullable(),
	updatedAt: Timestamp,
	createdAt: Timestamp
});

export type Profile = z.infer<typeof ProfileSchema>;
