import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

export const profileSchema = z.object({
	uid: z.string(),
	displayName: z.string(),
	title: z.string().nullable(),
	bio: z.string().nullable(),
	updatedAt: z.instanceof(Timestamp)
});

export const profile = writable<z.infer<typeof profileSchema> | null>(null);
let unsubscribe: () => void | undefined;

user.subscribe((user) => {
	if (user) {
		const ref = doc(collection(db, 'profiles'), user.uid);
		unsubscribe = subscribe(ref, profile).unsubscribe;
	} else {
		unsubscribe?.();
		profile.set(null);
	}
});
