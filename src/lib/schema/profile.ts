import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const ProfileSchema = z.object({
	uid: z.string(),
	displayName: z.string(),
	title: z.string().nullable(),
	bio: z.string().nullable(),
	updatedAt: z.instanceof(Timestamp)
});

export type Profile = z.infer<typeof ProfileSchema>;
