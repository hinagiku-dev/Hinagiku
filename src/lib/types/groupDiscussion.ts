import type { Timestamp } from 'firebase-admin/firestore';

// Firestore data structure
export interface FirestoreGroupDiscussion {
	sessionId: string;
	groupId: string;
	history: {
		name: string;
		content: string;
		speechId: string | null;
		timestamp: Timestamp;
	}[];
	analysis: {
		summary: string;
		keywords: string[];
	};
}

// Client-side data structure (serializable)
export interface GroupDiscussion {
	sessionId: string;
	groupId: string;
	history: {
		name: string;
		content: string;
		speechId: string | null;
		timestamp: string;
	}[];
	analysis: {
		summary: string;
		keywords: string[];
	};
}

// convert Firestore data to client-side data
export function convertFirestoreGroupDiscussion(data: FirestoreGroupDiscussion): GroupDiscussion {
	return {
		sessionId: data.sessionId,
		groupId: data.groupId,
		history: data.history.map((history) => ({
			name: history.name,
			content: history.content,
			speechId: history.speechId,
			timestamp: history.timestamp.toDate().toISOString()
		})),
		analysis: {
			summary: data.analysis.summary,
			keywords: data.analysis.keywords
		}
	};
}
