import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const route = (uid: string) => `/profiles/${uid}`;

export const ProfileSchema = z.object({
	uid: z.string().describe('User ID associated with auth'),
	displayName: z.string(),
	title: z.string().nullable(),
	bio: z.string().nullable(),
	updatedAt: z.instanceof(Timestamp),
	createdAt: z.instanceof(Timestamp)
});

export type Profile = z.infer<typeof ProfileSchema>;
