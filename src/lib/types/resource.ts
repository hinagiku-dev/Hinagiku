import type { Timestamp } from 'firebase-admin/firestore';

export interface FirestoreResource {
	name: string;
	fileId: string;
	text: string;
	addedAt: Timestamp;
}

export interface Resource {
	name: string;
	fileId: string;
	text: string;
	addedAt: string;
}

export function convertFirestoreResources(data: FirestoreResource): Resource {
	return {
		name: data.name,
		fileId: data.fileId,
		text: data.text,
		addedAt: data.addedAt.toDate().toISOString()
	};
}
