import type { Timestamp } from 'firebase-admin/firestore';

// Firestore data structure
export interface FirestoreIndividualDiscussion {
	userId: string;
	sessionId: string;
	groupId: string;
	history: {
		role: 'system' | 'assistant' | 'user';
		content: string;
		speechId: string | null;
		timestamp: Timestamp;
	}[];
	summary: string;
}

// Client-side data structure (serializable)
export interface IndividualDiscussion {
	userId: string;
	sessionId: string;
	groupId: string;
	history: {
		role: 'system' | 'assistant' | 'user';
		content: string;
		speechId: string | null;
		timestamp: string;
	}[];
	summary: string;
}

// convert Firestore data to client-side data
export function convertFirestoreIndividualDiscussion(
	data: FirestoreIndividualDiscussion
): IndividualDiscussion {
	return {
		userId: data.userId,
		sessionId: data.sessionId,
		groupId: data.groupId,
		history: data.history.map((history) => ({
			role: history.role,
			content: history.content,
			speechId: history.speechId,
			timestamp: history.timestamp.toDate().toISOString()
		})),
		summary: data.summary
	};
}
