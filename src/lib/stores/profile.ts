import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import type { ProfileSchema } from '$lib/schema/profile';
import { collection, doc } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

export const profile = writable<z.infer<typeof ProfileSchema> | null>(null);
let unsubscribe: () => void | undefined;

user.subscribe((user) => {
	if (user) {
		const ref = doc(collection(db, 'profiles'), user.uid);
		unsubscribe = subscribe(ref, profile)[1].unsubscribe;
	} else {
		unsubscribe?.();
		profile.set(null);
	}
});
