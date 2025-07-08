/**
 * User Settings Store
 * 
 * This module manages user-specific settings for the Hinagiku educational platform.
 * It provides real-time synchronization with Firebase Firestore and automatic
 * subscription management based on authentication state.
 * 
 * Current Settings:
 * - enableVADIndividual: Voice Activity Detection in individual sessions
 * - enableVADGroup: Voice Activity Detection in group sessions
 * - updatedAt: Timestamp tracking for settings synchronization
 * 
 * Features:
 * - Real-time Firestore synchronization
 * - Automatic subscription lifecycle management
 * - Default settings initialization for new users
 * - Authentication-aware store updates
 * 
 * @fileoverview User settings management with Firebase synchronization
 */

import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import { SettingSchema } from '$lib/schema/setting';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

/**
 * Reactive user settings store.
 * Contains current user settings or null if user is not authenticated.
 * Automatically syncs with Firestore when user is logged in.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { setting } from '$lib/stores/setting';
 *   
 *   $: if ($setting) {
 *     console.log('VAD enabled for groups:', $setting.enableVADGroup);
 *   }
 * </script>
 * ```
 */
export const setting = writable<z.infer<typeof SettingSchema> | null>(null);

/** Firestore unsubscribe function for cleanup */
let unsubscribe: () => void | undefined;

/**
 * Authentication-aware settings subscription.
 * Automatically subscribes to user settings when authenticated and
 * cleans up subscriptions when user logs out.
 */
user.subscribe((user) => {
	if (user) {
		console.log('subscribing to settings for user:', user.uid);
		
		// Create reference to user's settings document
		const ref = doc(collection(db, 'settings'), user.uid);
		
		// Subscribe to real-time updates with default values for new users
		unsubscribe = subscribe(ref, setting, SettingSchema, {
			enableVADIndividual: false,  // VAD disabled by default for individual sessions
			enableVADGroup: true,        // VAD enabled by default for group sessions
			updatedAt: Timestamp.now()   // Current timestamp for new settings
		})[1].unsubscribe;
	} else {
		console.log('unsubscribing from settings');
		// Clean up subscription and reset store when user logs out
		unsubscribe?.();
		setting.set(null);
	}
});
