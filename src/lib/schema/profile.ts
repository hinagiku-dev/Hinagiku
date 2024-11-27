import { z } from 'zod';
import { Timestamp } from './utils';

export const route = (uid: string) => `/profiles/${uid}`;

export const ProfileSchema = z.object({
	uid: z.string().describe('User ID associated with auth'),
	displayName: z.string(),
	title: z.string().nullable(),
	bio: z.string().nullable(),
	updatedAt: Timestamp,
	createdAt: Timestamp
});

export type Profile = z.infer<typeof ProfileSchema>;
