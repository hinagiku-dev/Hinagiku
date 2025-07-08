/**
 * User Profile Utility
 * 
 * This module provides functions for retrieving user profile information from
 * Firebase Firestore with caching for performance optimization. It handles
 * user data fetching with fallback defaults for missing profiles.
 * 
 * Features:
 * - In-memory caching to reduce database requests
 * - Fallback profile generation for missing user data
 * - Schema validation for data integrity
 * - Debug logging for troubleshooting
 * - Promise-based async interface
 * 
 * Caching Strategy:
 * User profiles are cached in memory to reduce repeated Firestore queries
 * within the same application session, improving performance for frequently
 * accessed user data.
 * 
 * @fileoverview User profile retrieval with caching and fallback handling
 */

import { db } from '$lib/firebase';
import { ProfileSchema, type Profile } from '$lib/schema/profile';
import debug from 'debug';
import { doc, getDoc } from 'firebase/firestore';

/** Debug logger for user retrieval operations */
const log = debug('app:utils:getUser');

/** In-memory cache for user profiles to reduce database requests */
const cache = new Map<string, Promise<Profile>>();

/**
 * Retrieves a user profile by UID with caching and fallback handling.
 * 
 * This function implements a caching strategy to minimize database requests
 * for frequently accessed user profiles. If a profile doesn't exist in the
 * database, it generates a fallback profile with basic information.
 * 
 * Caching Behavior:
 * - First request: Fetches from Firestore and caches the Promise
 * - Subsequent requests: Returns the cached Promise immediately
 * - Cache persists for the application session lifetime
 * 
 * Fallback Handling:
 * - Missing profiles generate a basic profile using the UID as display name
 * - Ensures consistent data structure even for incomplete user data
 * 
 * @param uid - Firebase user identifier
 * @returns Promise resolving to the user profile data
 * 
 * @example
 * ```ts
 * // Get user profile for display
 * const userProfile = await getUser("user123");
 * console.log(userProfile.displayName); // "John Doe" or "user123" if missing
 * 
 * // Multiple calls use cached data
 * const sameUser = await getUser("user123"); // Returns cached promise
 * ```
 */
export function getUser(uid: string): Promise<Profile> {
	// Return cached promise if available
	if (cache.has(uid)) {
		return cache.get(uid)!;
	}
	
	// Create new promise for database fetch
	const user = (async () => {
		const docRef = doc(db, 'profiles', uid);
		const docSnap = await getDoc(docRef);
		const data = docSnap.data();
		
		// Handle missing user profile with fallback
		if (!data) {
			log(`User profile not found for UID: ${uid}, creating fallback profile`);
			return {
				uid,
				displayName: uid, // Use UID as fallback display name
				title: null,
				bio: null
			};
		}
		
		log(`Retrieved user profile: ${JSON.stringify(data)}`);
		
		// Validate and parse the profile data, excluding timestamp fields
		return ProfileSchema.omit({ updatedAt: true, createdAt: true }).parse(data);
	})();
	
	// Cache the promise for future requests
	cache.set(uid, user);
	return user;
}
