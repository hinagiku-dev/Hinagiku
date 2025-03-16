import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import type { SettingSchema } from '$lib/schema/setting';
import { collection, doc } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

export const setting = writable<z.infer<typeof SettingSchema> | null>(null);
let unsubscribe: () => void | undefined;

user.subscribe((user) => {
	if (user) {
		console.log('subscribing to settings for user:', user.uid);
		const ref = doc(collection(db, 'settings'), user.uid);
		unsubscribe = subscribe(ref, setting)[1].unsubscribe;
	} else {
		console.log('unsubscribing from settings');
		unsubscribe?.();
		setting.set(null);
	}
});
