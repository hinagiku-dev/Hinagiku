/**
 * @fileoverview
 * User profile store for the Hinagiku educational platform.
 * 
 * This module provides reactive access to the current user's profile data
 * through a Svelte store that automatically synchronizes with Firestore.
 * The store updates in real-time when profile data changes and properly
 * manages subscription lifecycle based on authentication state.
 * 
 * Features:
 * - Automatic profile loading when user signs in
 * - Real-time synchronization with Firestore profile documents
 * - Proper cleanup when user signs out
 * - Type-safe profile data with schema validation
 * - Seamless integration with authentication state
 * 
 * The profile store is null when no user is authenticated and contains
 * validated profile data when a user is signed in. Components can
 * reactively subscribe to profile changes for UI updates.
 * 
 * @example
 * ```ts
 * import { profile } from '$lib/stores/profile';
 * 
 * // Reactive access in Svelte components
 * $: if ($profile) {
 *   console.log('User display name:', $profile.displayName);
 * }
 * 
 * // Subscribe in JavaScript
 * profile.subscribe(profileData => {
 *   if (profileData) {
 *     updateUI(profileData);
 *   }
 * });
 * ```
 */

import { db } from '$lib/firebase';
import { subscribe } from '$lib/firebase/store';
import type { ProfileSchema } from '$lib/schema/profile';
import { collection, doc } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { z } from 'zod';
import { user } from './auth';

/**
 * Reactive store containing the current user's profile data.
 * 
 * The store value is:
 * - null when no user is authenticated
 * - ProfileSchema object when user is authenticated and profile exists
 * - Updates automatically when profile data changes in Firestore
 */
export const profile = writable<z.infer<typeof ProfileSchema> | null>(null);

/** Firestore subscription unsubscribe function for cleanup */
let unsubscribe: () => void | undefined;

/**
 * Automatically manage profile subscription based on authentication state.
 * 
 * When a user signs in, establishes a real-time subscription to their profile
 * document in Firestore. When user signs out, cleans up the subscription
 * and resets the profile store to null.
 */
user.subscribe((user) => {
	if (user) {
		// User is authenticated - subscribe to their profile
		const ref = doc(collection(db, 'profiles'), user.uid);
		unsubscribe = subscribe(ref, profile)[1].unsubscribe;
	} else {
		// User signed out - cleanup subscription and reset profile
		unsubscribe?.();
		profile.set(null);
	}
});
