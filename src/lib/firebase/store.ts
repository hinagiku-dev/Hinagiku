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

export type DocumentStore<T> = [
	Readable<T | null>,
	{
		unsubscribe: () => void;
	}
];

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

export function subscribe<T = unknown>(
	ref: DocumentReference,
	store = writable<T | null>(null),
	schema?: z.ZodType<T>
): DocumentStore<T> {
	log('subscribe', ref.path);

	const unsubscribe = onSnapshot(
		ref,
		(snapshot) => {
			const data = (snapshot.data() as T) ?? null;
			log('onSnapshot', ref.path, data);
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
