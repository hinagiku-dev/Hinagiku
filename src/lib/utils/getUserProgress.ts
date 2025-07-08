/**
 * User Progress Tracking Utility
 * 
 * This module provides functions for retrieving and calculating user learning
 * progress within collaborative sessions in the Hinagiku educational platform.
 * It analyzes conversation data to determine task completion rates and learning
 * advancement for individual participants.
 * 
 * Features:
 * - Subtask completion tracking and progress calculation
 * - User profile integration for display names
 * - Comprehensive error handling with detailed messaging
 * - Support for empty or missing conversation data
 * - Progress percentage calculation for visual indicators
 * 
 * Educational Context:
 * Progress tracking helps educators monitor individual student advancement
 * through structured learning objectives and provides data for adaptive
 * instruction and intervention strategies.
 * 
 * @fileoverview User learning progress calculation and tracking utilities
 */

import { db } from '$lib/firebase';
import type { Conversation } from '$lib/schema/conversation';
import { collection, getDocs } from 'firebase/firestore';
import { getUser } from './getUser';

/**
 * Represents a participant's learning progress data within a group context.
 * Contains both quantitative progress metrics and qualitative completion status.
 */
export type ParticipantProgress = {
	/** Human-readable display name for the participant */
	displayName: string;
	/** Progress percentage (0-100) based on completed subtasks */
	progress: number;
	/** Boolean array indicating completion status of each subtask */
	completedTasks: boolean[];
};

/**
 * Retrieves and calculates learning progress for a specific user within a group session.
 * 
 * This function analyzes conversation data to determine how many subtasks a student
 * has completed and calculates their overall learning progress as a percentage.
 * It handles various edge cases including missing conversations and incomplete data.
 * 
 * Progress Calculation:
 * - Examines subtaskCompleted array from user's conversation
 * - Calculates percentage: (completed tasks / total tasks) * 100
 * - Returns 0% progress if no tasks exist or conversation is missing
 * 
 * Error Handling:
 * - Gracefully handles missing conversations or user data
 * - Provides detailed error messages for troubleshooting
 * - Returns zero progress rather than failing for missing data
 * 
 * @param sessionId - Unique identifier for the learning session
 * @param groupId - Identifier for the group within the session
 * @param userId - Unique identifier for the user/participant
 * @returns Promise resolving to the participant's progress data
 * 
 * @example
 * ```ts
 * // Get progress for a student in a specific group
 * const progress = await getUserProgress("session123", "group1", "user456");
 * console.log(`${progress.displayName}: ${progress.progress}% complete`);
 * console.log(`Tasks completed: ${progress.completedTasks.filter(Boolean).length}`);
 * ```
 * 
 * @throws Error when database access fails or critical errors occur
 */
export async function getUserProgress(
	sessionId: string,
	groupId: string,
	userId: string
): Promise<ParticipantProgress> {
	try {
		console.log(`Fetching progress for user ${userId} in group ${groupId}`);

		// Reference to the conversations collection for this group
		const conversationsRef = collection(
			db,
			'sessions',
			sessionId,
			'groups',
			groupId,
			'conversations'
		);

		const snapshot = await getDocs(conversationsRef);

		// Handle case where no conversations exist in the group
		if (snapshot.empty) {
			console.log(`No conversations found for user ${userId}`);
			const userData = await getUser(userId);
			return {
				displayName: userData.displayName,
				progress: 0,
				completedTasks: []
			};
		}

		// Filter conversations to find the one belonging to this specific user
		const conversations = snapshot.docs
			.map((doc) => doc.data() as Conversation)
			.filter((conv) => conv.userId === userId);

		// Handle case where user has no conversations in this group
		if (conversations.length === 0) {
			console.log(`No matching conversations found for user ${userId}`);
			const userData = await getUser(userId);
			return {
				displayName: userData.displayName,
				progress: 0,
				completedTasks: []
			};
		}

		// Use the first (and typically only) conversation for this user
		const conv = conversations[0];
		const userData = await getUser(userId);

		// Extract subtask completion data with fallback to empty array
		const subtaskCompleted = conv.subtaskCompleted || [];
		const totalTasks = subtaskCompleted.length;
		const completedCount = subtaskCompleted.filter(Boolean).length;
		
		// Calculate progress percentage (0-100)
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
		
		// Provide detailed error message for debugging
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to fetch progress for user ${userId}: ${errorMessage}`);
	}
}
