import type { Timestamp } from 'firebase/firestore';

// Firestore data structure
export interface FirestoreSession {
	id: string;
	tempId: string | null;
	hostId: string;
	hostName: string;
	title: string;
	createdAt: Timestamp;
	status: 'draft' | 'waiting' | 'active' | 'ended';
	tempIdExpiry: Timestamp | null;
	goal: string;
	subQuestions: string[];
	resourcesIds: string[];
	participants: {
		[userId: string]: {
			name: string;
			groupId: string | null;
			joinedAt: Timestamp;
		};
	};
	stage: 'grouping' | 'individual' | 'group' | 'ended';
}

// Client-side data structure (serializable)
export interface Session {
	id: string;
	tempId: string | null;
	hostId: string;
	hostName: string;
	title: string;
	createdAt: string;
	status: 'draft' | 'waiting' | 'active' | 'ended';
	tempIdExpiry: string | null;
	goal: string;
	subQuestions: string[];
	resourcesIds: string[];
	participants: {
		[userId: string]: {
			name: string;
			groupId: string | null;
			joinedAt: string;
		};
	};
	stage: 'grouping' | 'individual' | 'group' | 'ended';
}

// convert Firestore data to client-side data
export function convertFirestoreSession(data: FirestoreSession): Session {
	return {
		id: data.id,
		tempId: data.tempId,
		hostId: data.hostId,
		hostName: data.hostName,
		title: data.title,
		createdAt: data.createdAt.toDate().toISOString(),
		status: data.status,
		tempIdExpiry: data.tempIdExpiry ? data.tempIdExpiry.toDate().toISOString() : null,
		goal: data.goal,
		subQuestions: data.subQuestions,
		resourcesIds: data.resourcesIds,
		participants: Object.fromEntries(
			Object.entries(data.participants).map(([userId, participant]) => [
				userId,
				{
					name: participant.name,
					groupId: participant.groupId,
					joinedAt: participant.joinedAt.toDate().toISOString()
				}
			])
		),
		stage: data.stage
	};
}
