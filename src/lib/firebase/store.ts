import debug from 'debug';
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { writable, type Readable } from 'svelte/store';

const log = debug('app:store');

export type DocumentStore<T> = [
	Readable<T | null>,
	{
		unsubscribe: () => void;
	}
];

export function subscribeAll<T = unknown>(
	ref: Query,
	store = writable<[string, T][]>([])
): DocumentStore<[string, T][]> {
	log('subscribe', ref);

	const unsubscribe = onSnapshot(
		ref,
		(snapshot) => {
			const data = snapshot.docs.map((doc) => [doc.id, doc.data()] as [string, T]);
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
	store = writable<T | null>(null)
): DocumentStore<T> {
	log('subscribe', ref.path);

	const unsubscribe = onSnapshot(
		ref,
		(snapshot) => {
			const data = (snapshot.data() as T) ?? null;
			log('onSnapshot', ref.path, data);
			store.set(data);
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
