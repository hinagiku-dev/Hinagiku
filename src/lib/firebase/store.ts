/**
 * @fileoverview
 * Firebase Firestore reactive store utilities for the Hinagiku educational platform.
 * 
 * This module provides Svelte store wrappers for Firebase Firestore real-time
 * subscriptions, enabling reactive UI updates when database documents change.
 * The utilities support both single document and collection query subscriptions
 * with proper error handling and debugging.
 * 
 * Features:
 * - Reactive Svelte stores that update automatically on Firestore changes
 * - Type-safe document subscriptions with Zod schema validation
 * - Collection query subscriptions with document metadata
 * - Automatic subscription management and cleanup
 * - Debug logging for development and troubleshooting
 * - Error handling for network issues and validation failures
 * 
 * The stores maintain real-time synchronization between Firestore and the UI,
 * ensuring users always see the latest data without manual refreshes.
 * 
 * @example
 * ```ts
 * import { subscribe, subscribeAll } from '$lib/firebase/store';
 * import { doc, collection } from 'firebase/firestore';
 * import { db } from '$lib/firebase';
 * import { UserSchema } from '$lib/schema/user';
 * 
 * // Subscribe to a single document with validation
 * const [userStore, userControls] = subscribe(
 *   doc(db, 'users', userId), 
 *   writable(null), 
 *   UserSchema
 * );
 * 
 * // Subscribe to a collection query
 * const [sessionsStore, sessionsControls] = subscribeAll(
 *   collection(db, 'sessions')
 * );
 * 
 * // Cleanup when component unmounts
 * onDestroy(() => {
 *   userControls.unsubscribe();
 *   sessionsControls.unsubscribe();
 * });
 * ```
 */

import debug from 'debug';
import {
	onSnapshot,
	type DocumentReference,
	type Query,
	type QueryDocumentSnapshot
} from 'firebase/firestore';
import { writable, type Readable } from 'svelte/store';
import type { z } from 'zod';

const log = debug('app:store');

/**
 * Type definition for Firestore document store with subscription controls.
 * Provides both the reactive store and unsubscribe functionality.
 */
export type DocumentStore<T> = [
	Readable<T | null>,
	{
		unsubscribe: () => void;
	}
];

/**
 * Creates a reactive store for Firestore collection queries.
 * 
 * Subscribes to a Firestore query and returns a store containing an array
 * of document snapshots with their data. The store updates automatically
 * when documents in the query result change.
 * 
 * @param ref - Firestore query to subscribe to
 * @param store - Optional existing writable store to use
 * @returns Tuple of [store, controls] for reading data and managing subscription
 * 
 * @example
 * ```ts
 * const [sessionsStore] = subscribeAll(
 *   query(collection(db, 'sessions'), where('active', '==', true))
 * );
 * ```
 */
export function subscribeAll<T = unknown>(
	ref: Query,
	store = writable<[QueryDocumentSnapshot, T][]>([])
): DocumentStore<[QueryDocumentSnapshot, T][]> {
	log('subscribe', ref);

	const unsubscribe = onSnapshot(
		ref,
		(snapshot) => {
			const data = snapshot.docs.map((doc) => [doc, doc.data()] as [QueryDocumentSnapshot, T]);
			log('onSnapshot', ref, data);
			store.set(data);
		},
		(error) => {
			log('onSnapshot:error', ref, error);
		}
	);

	return [
		store,
		{
			unsubscribe: () => {
				log('unsubscribe', ref);
				unsubscribe();
			}
		}
	];
}

/**
 * Creates a reactive store for a single Firestore document.
 * 
 * Subscribes to a Firestore document reference and returns a store containing
 * the document data. The store updates automatically when the document changes.
 * Optionally validates data using a Zod schema for type safety.
 * 
 * @param ref - Firestore document reference to subscribe to
 * @param store - Optional existing writable store to use
 * @param schema - Optional Zod schema for data validation
 * @param fallback - Fallback value when document doesn't exist
 * @returns Tuple of [store, controls] for reading data and managing subscription
 * 
 * @example
 * ```ts
 * const [userStore] = subscribe(
 *   doc(db, 'users', userId),
 *   writable(null),
 *   UserSchema,
 *   { name: 'Anonymous' }
 * );
 * ```
 */
export function subscribe<T = unknown>(
	ref: DocumentReference,
	store = writable<T | null>(null),
	schema?: z.ZodType<T>,
	fallback: T | null = null
): DocumentStore<T> {
	log('subscribe', ref.path);

	const unsubscribe = onSnapshot(
		ref,
		(snapshot) => {
			const data = (snapshot.data() as T) ?? fallback;
			log('onSnapshot', ref.path, data);
			
			// Validate data with schema if provided
			if (schema) {
				const parseResult = schema.safeParse(data);
				if (!parseResult.success) {
					log('onSnapshot:error', ref.path, parseResult.error);
					store.set(null);
					return;
				}
				store.set(parseResult.data);
			} else {
				store.set(data);
			}
		},
		(error) => {
			log('onSnapshot:error', ref.path, error);
		}
	);

	return [
		store,
		{
			unsubscribe: () => {
				log('unsubscribe', ref);
				unsubscribe();
			}
		}
	];
}
