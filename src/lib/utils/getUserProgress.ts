import { db } from '$lib/firebase';
import type { Conversation } from '$lib/schema/conversation';
import { collection, getDocs } from 'firebase/firestore';
import { getUser } from './getUser';

export type ParticipantProgress = {
	displayName: string;
	progress: number;
	completedTasks: boolean[];
};

export async function getUserProgress(
	sessionId: string,
	groupId: string,
	userId: string
): Promise<ParticipantProgress> {
	console.log(`Fetching progress for user ${userId} in group ${groupId}`);

	const conversationsRef = collection(db, `sessions/${sessionId}/groups/${groupId}/conversations`);

	const snapshot = await getDocs(conversationsRef);
	const conversations = snapshot.docs
		.map((doc) => doc.data() as Conversation)
		.filter((conv) => conv.userId === userId);

	if (conversations.length === 0) {
		const userData = await getUser(userId);
		return {
			displayName: userData.displayName,
			progress: 0,
			completedTasks: []
		};
	}

	const conv = conversations[0];
	const userData = await getUser(userId);
	const totalTasks = conv.subtaskCompleted.length;
	const completedCount = conv.subtaskCompleted.filter(Boolean).length;
	const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

	const result = {
		displayName: userData.displayName,
		progress,
		completedTasks: conv.subtaskCompleted
	};

	console.log(`Progress result for ${userId}:`, result);
	return result;
}
