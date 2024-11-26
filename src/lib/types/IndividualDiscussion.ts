import type { Timestamp } from 'firebase-admin/firestore';

// Firestore data structure
export interface FirestoreIndividualDiscussion {
	userId: string;
	sessionId: string;
	groupId: string;
	goal: string;
	subQuestions: string[];
	resourcesTexts: {
		name: string;
		text: string;
	}[];
	history: {
		role: 'system' | 'assistant' | 'user';
		fileId: string | null;
		content: string;
		timestamp: Timestamp;
	}[];
	summary: string;
}

// Client-side data structure (serializable)
export interface IndividualDiscussion {
	userId: string;
	sessionId: string;
	groupId: string;
	goal: string;
	subQuestions: string[];
	resourcesTexts: {
		name: string;
		text: string;
	}[];
	history: {
		role: 'system' | 'assistant' | 'user';
		fileId: string | null;
		content: string;
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
		goal: data.goal,
		subQuestions: data.subQuestions,
		resourcesTexts: data.resourcesTexts,
		history: data.history.map((history) => ({
			role: history.role,
			fileId: history.fileId,
			content: history.content,
			timestamp: history.timestamp.toDate().toISOString()
		})),
		summary: data.summary
	};
}
