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
	stage: 'grouping' | 'individual' | 'group' | 'ended';
	tempIdExpiry: Timestamp | null;
	goal: string;
	subQuestions: string[];
	resourceIds: string[];
	participants: {
		[userId: string]: {
			name: string;
			groupId: string | null;
			groupName: string | null;
			joinedAt: Timestamp;
		};
	};
	groups: {
		[groupId: string]: {
			groupName: string;
			members: {
				[userId: string]: {
					name: string;
				};
			};
		};
	};
}

// Client-side data structure (serializable)
export interface Session {
	id: string;
	tempId: string | null;
	hostId: string;
	hostName: string;
	title: string;
	createdAt: string;
	goal: string;
	subQuestions: string[];
	status: 'draft' | 'waiting' | 'active' | 'ended' | 'individual' | 'group';
	tempIdExpiry: string | null;
	resourceIds: string[];
	participants: {
		[userId: string]: {
			name: string;
			groupId: string | null;
			joinedAt: string;
		};
	};
	groups: {
		[groupId: string]: {
			groupName: string;
			members: {
				[userId: string]: {
					name: string;
				};
			};
		};
	};
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
		resourceIds: data.resourceIds,
		participants: Object.fromEntries(
			Object.entries(data.participants).map(([userId, participant]) => [
				userId,
				{
					name: participant.name,
					groupId: participant.groupId,
					groupName: participant.groupName,
					joinedAt: participant.joinedAt.toDate().toISOString()
				}
			])
		),
		groups: Object.fromEntries(
			Object.entries(data.groups).map(([groupId, group]) => [
				groupId,
				{
					groupName: group.groupName,
					members: Object.fromEntries(
						Object.entries(group.members).map(([userId, member]) => [
							userId,
							{
								name: member.name
							}
						])
					)
				}
			])
		)
	};
}
