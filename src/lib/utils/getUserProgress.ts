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
	try {
		console.log(`Fetching progress for user ${userId} in group ${groupId}`);

		const conversationsRef = collection(
			db,
			'sessions',
			sessionId,
			'groups',
			groupId,
			'conversations'
		);

		const snapshot = await getDocs(conversationsRef);

		if (snapshot.empty) {
			console.log(`No conversations found for user ${userId}`);
			const userData = await getUser(userId);
			return {
				displayName: userData.displayName,
				progress: 0,
				completedTasks: []
			};
		}

		const conversations = snapshot.docs
			.map((doc) => doc.data() as Conversation)
			.filter((conv) => conv.userId === userId);

		if (conversations.length === 0) {
			console.log(`No matching conversations found for user ${userId}`);
			const userData = await getUser(userId);
			return {
				displayName: userData.displayName,
				progress: 0,
				completedTasks: []
			};
		}

		const conv = conversations[0];
		const userData = await getUser(userId);

		const subtaskCompleted = conv.subtaskCompleted || [];
		const totalTasks = subtaskCompleted.length;
		const completedCount = subtaskCompleted.filter(Boolean).length;
		const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

		const result = {
			displayName: userData.displayName,
			progress,
			completedTasks: subtaskCompleted
		};

		console.log(`Progress result for ${userId}:`, result);
		return result;
	} catch (error: unknown) {
		console.error('Error fetching user progress:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to fetch progress for user ${userId}: ${errorMessage}`);
	}
}
