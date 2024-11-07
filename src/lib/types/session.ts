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
	resources: {
		[id: string]: {
			type: 'link' | 'text' | 'file';
			content: string;
			addedAt: Timestamp;
		};
	};
	participants: {
		[userId: string]: {
			name: string;
			joinedAt: Timestamp;
		};
	};
	stage: 'grouping' | 'individual' | 'group' | 'ended';
	groups: {
		[groupId: string]: {
			name: string;
			leaderId: string;
			members: {
				[userId: string]: {
					name: string;
					joinedAt: Timestamp;
				};
			};
			individualDiscussions?: {
				[userId: string]: {
					transcript: string;
					analysis: {
						keyPoints: string[];
						sentiment: string;
					};
				};
			};
			groupDiscussion?: {
				transcript: string;
				analysis: {
					keyPoints: string[];
					commonThemes: string[];
					disagreements: string[];
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
	status: 'draft' | 'waiting' | 'active' | 'ended';
	tempIdExpiry: string | null;
	resources: {
		[id: string]: {
			type: 'link' | 'text' | 'file';
			content: string;
			addedAt: string;
		};
	};
	participants: {
		[userId: string]: {
			name: string;
			joinedAt: string;
		};
	};
	stage: 'grouping' | 'individual' | 'group' | 'ended';
	groups: {
		[groupId: string]: {
			name: string;
			leaderId: string;
			members: {
				[userId: string]: {
					name: string;
					joinedAt: string;
				};
			};
			individualDiscussions?: {
				[userId: string]: {
					transcript: string;
					analysis: {
						keyPoints: string[];
						sentiment: string;
					};
				};
			};
			groupDiscussion?: {
				transcript: string;
				analysis: {
					keyPoints: string[];
					commonThemes: string[];
					disagreements: string[];
				};
			};
		};
	};
}

// Helper function to convert Firestore data to client data
export function convertFirestoreSession(data: FirestoreSession): Session {
	return {
		...data,
		createdAt: data.createdAt.toDate().toISOString(),
		tempIdExpiry: data.tempIdExpiry?.toDate()?.toISOString() || null,
		resources: Object.fromEntries(
			Object.entries(data.resources || {}).map(([key, resource]) => [
				key,
				{
					...resource,
					addedAt: resource.addedAt.toDate().toISOString()
				}
			])
		),
		participants: Object.fromEntries(
			Object.entries(data.participants || {}).map(([key, participant]) => [
				key,
				{
					...participant,
					joinedAt: participant.joinedAt.toDate().toISOString()
				}
			])
		),
		groups: Object.fromEntries(
			Object.entries(data.groups || {}).map(([groupId, group]) => [
				groupId,
				{
					...group,
					members: Object.fromEntries(
						Object.entries(group.members).map(([userId, member]) => [
							userId,
							{
								...member,
								joinedAt: member.joinedAt.toDate().toISOString()
							}
						])
					)
				}
			])
		)
	};
}
