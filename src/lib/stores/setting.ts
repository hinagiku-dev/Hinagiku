import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import { SettingSchema } from '$lib/schema/setting';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

export const setting = writable<z.infer<typeof SettingSchema> | null>(null);
let unsubscribe: () => void | undefined;

user.subscribe((user) => {
	if (user) {
		console.log('subscribing to settings for user:', user.uid);
		const ref = doc(collection(db, 'settings'), user.uid);
		unsubscribe = subscribe(ref, setting, SettingSchema, {
			enableVADIndividual: false,
			enableVADGroup: true,
			updatedAt: Timestamp.now()
		})[1].unsubscribe;
	} else {
		console.log('unsubscribing from settings');
		unsubscribe?.();
		setting.set(null);
	}
});
