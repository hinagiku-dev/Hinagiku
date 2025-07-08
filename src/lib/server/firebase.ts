/**
 * Firebase Server Integration Module
 * 
 * This module provides server-side Firebase Admin SDK integration for the Hinagiku educational platform.
 * It handles initialization of Firebase Admin services and provides data access functions for managing
 * sessions, groups, conversations, and user interactions in the collaborative learning environment.
 * 
 * Key Features:
 * - Firebase Admin SDK initialization with service account authentication
 * - Database operations for sessions, groups, and conversations
 * - Real-time conversation management in group-based learning contexts
 * - Permission checking for user actions and data access
 * - Centralized error handling for Firebase operations
 * 
 * Architecture:
 * - Sessions contain multiple Groups
 * - Groups contain multiple Conversations (one per participant)
 * - Each conversation tracks individual student progress and interactions
 * 
 * @fileoverview Core Firebase server-side integration for educational session management
 */

import { env } from '$env/dynamic/private';
import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import type { Session } from '$lib/schema/session';
import type { LLMChatMessage } from '$lib/server/types';
import { error } from '@sveltejs/kit';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
// Supports both service account file path and direct JSON object configuration
if (!getApps().length) {
	let serviceAccountPathOrObject: string | ServiceAccount;
	try {
		// Try parsing as JSON object first (for direct service account object)
		const tmp = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS);
		if (typeof tmp === 'object') {
			serviceAccountPathOrObject = tmp;
		} else {
			throw new Error();
		}
	} catch {
		// Fall back to file path if JSON parsing fails
		serviceAccountPathOrObject = env.GOOGLE_APPLICATION_CREDENTIALS;
	}
	initializeApp({
		credential: cert(serviceAccountPathOrObject)
	});
}

/** Firebase Admin Auth instance for server-side authentication operations */
export const adminAuth = getAuth();

/** Firebase Admin Firestore instance for database operations */
export const adminDb = getFirestore();

/**
 * Creates a new conversation for a specific user within a group.
 * Each conversation represents an individual student's interaction with the AI assistant
 * within a collaborative learning session. The conversation includes the learning task,
 * subtasks, resources, and tracks completion progress.
 * 
 * @param id - Session ID where the conversation belongs
 * @param group_number - Group identifier within the session
 * @param userId - Unique identifier for the user/student
 * @param task - Main learning task description
 * @param subtasks - Array of subtask descriptions to be completed
 * @param history - Initial conversation history with the AI assistant
 * @param resources - Educational resources available for the conversation
 * @returns The conversation document ID
 * 
 * @example
 * ```ts
 * const convId = await createConversation(
 *   "session123", 
 *   "group1", 
 *   "user456", 
 *   "Discuss climate change impacts",
 *   ["Define greenhouse effect", "List solutions"],
 *   [],
 *   [{ name: "Climate Article", content: "..." }]
 * );
 * ```
 */
export async function createConversation(
	id: string,
	group_number: string,
	userId: string,
	task: string,
	subtasks: string[],
	history: LLMChatMessage[],
	resources: { name: string; content: string }[]
) {
	const conversationsRef = adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations');

	// Check if a conversation already exists for this user to prevent duplicates
	const existingConversations = await conversationsRef.where('userId', '==', userId).get();
	if (!existingConversations.empty) {
		return existingConversations.docs[0].id;
	}

	// Create new conversation with initial state
	const conversationRef = conversationsRef.doc();
	await conversationRef.set({
		userId: userId,
		task: task,
		subtasks: subtasks,
		resources: resources,
		history: history,
		subtaskCompleted: new Array(subtasks.length).fill(false), // Track completion status
		warning: { moderation: false, offTopic: 0 } // Initialize safety flags
	});

	return conversationRef.id;
}
/**
 * Gets a reference to a specific conversation document within a group.
 * This is used for real-time updates and targeted operations on individual conversations.
 * 
 * @param id - Session ID
 * @param group_number - Group identifier
 * @param conv_id - Conversation document ID
 * @returns Firestore document reference for the conversation
 */
export function getConversationRef(id: string, group_number: string, conv_id: string) {
	return adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations')
		.doc(conv_id);
}

/**
 * Gets a reference to the conversations collection within a specific group.
 * Used for querying multiple conversations or creating new ones.
 * 
 * @param id - Session ID
 * @param group_number - Group identifier
 * @returns Firestore collection reference for conversations
 */
export function getConversationsRef(id: string, group_number: string) {
	return adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations');
}

/**
 * Retrieves conversation data from a document reference.
 * Includes error handling for non-existent conversations.
 * 
 * @param conversation_ref - Firestore document reference for the conversation
 * @returns Conversation data object
 * @throws {404} When conversation document doesn't exist
 */
export async function getConversationData(
	conversation_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Conversation> {
	const conversation = await conversation_ref.get();
	if (!conversation.exists) {
		throw error(404, 'Conversation not found');
	}

	return conversation.data() as Conversation;
}

/**
 * Retrieves all conversation data from a conversations collection.
 * Used for group-level analysis and reporting.
 * 
 * @param conversations_ref - Firestore collection reference for conversations
 * @returns Array of conversation data objects
 * @throws {404} When no conversations exist in the collection
 */
export async function getConversationsData(
	conversations_ref: FirebaseFirestore.CollectionReference<
		FirebaseFirestore.DocumentData,
		FirebaseFirestore.DocumentData
	>
) {
	const conversations = await conversations_ref.get();
	if (conversations.empty) {
		throw error(404, 'Conversations not found');
	}

	return conversations.docs.map((doc) => doc.data() as Conversation);
}

/**
 * Gets a reference to a specific group document within a session.
 * Groups organize participants for collaborative activities.
 * 
 * @param id - Session ID
 * @param group_number - Group identifier
 * @returns Firestore document reference for the group
 */
export function getGroupRef(id: string, group_number: string) {
	return adminDb.collection('sessions').doc(id).collection('groups').doc(group_number);
}

/**
 * Gets a reference to the groups collection within a session.
 * Used for managing multiple groups and their activities.
 * 
 * @param id - Session ID
 * @returns Firestore collection reference for groups
 */
export function getGroupsRef(id: string) {
	return adminDb.collection('sessions').doc(id).collection('groups');
}

/**
 * Retrieves group data from a document reference.
 * Groups contain participant lists, discussions, and activity metadata.
 * 
 * @param group_ref - Firestore document reference for the group
 * @returns Group data object
 * @throws {404} When group document doesn't exist
 */
export async function getGroupData(
	group_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Group> {
	const group = await group_ref.get();
	if (!group.exists) {
		throw error(404, 'Group not found');
	}

	return group.data() as Group;
}

/**
 * Retrieves all group data from a groups collection.
 * Used for session-wide group management and analysis.
 * 
 * @param groups_ref - Firestore collection reference for groups
 * @returns Array of group data objects
 * @throws {404} When no groups exist in the session
 */
export async function getGroupsData(
	groups_ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
): Promise<Group[]> {
	const groups = await groups_ref.get();
	if (groups.empty) {
		throw error(404, 'Groups not found');
	}

	return groups.docs.map((doc) => doc.data() as Group);
}

/**
 * Gets a reference to a specific session document.
 * Sessions are the top-level containers for collaborative learning activities.
 * 
 * @param id - Session ID
 * @returns Firestore document reference for the session
 */
export function getSessionRef(id: string) {
	return adminDb.collection('sessions').doc(id);
}

/**
 * Retrieves session data from a document reference.
 * Sessions contain configuration, timing, participants, and learning objectives.
 * 
 * @param session_ref - Firestore document reference for the session
 * @returns Session data object
 * @throws {404} When session document doesn't exist
 */
export async function getSessionData(
	session_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Session> {
	const session = await session_ref.get();
	if (!session.exists) {
		throw error(404, 'Session not found');
	}

	return session.data() as Session;
}

/**
 * Retrieves all conversations from all participants across all groups in a session.
 * This is used for comprehensive session analysis, progress tracking, and reporting.
 * Each conversation includes group and conversation IDs for cross-referencing.
 * 
 * @param id - Session ID
 * @returns Array of conversations with group and conversation identifiers
 * @throws {404} When no groups or conversations are found
 * 
 * @example
 * ```ts
 * const allConversations = await getConversationsFromAllParticipantsData("session123");
 * // Returns: [{ ...conversationData, groupId: "group1", conversationId: "conv1" }, ...]
 * ```
 */
export async function getConversationsFromAllParticipantsData(
	id: string
): Promise<Array<Conversation & { groupId: string; conversationId: string }>> {
	// First, get all groups in the session
	const groupsRef = getGroupsRef(id);
	const groups = await groupsRef.get();

	if (groups.empty) {
		throw error(404, 'No groups found');
	}

	// Get all conversations from each group
	const conversationsPromises = groups.docs.map(async (groupDoc) => {
		const conversationsRef = getConversationsRef(id, groupDoc.id);
		const conversations = await conversationsRef.get();

		return conversations.docs.map((doc) => ({
			...(doc.data() as Conversation),
			groupId: groupDoc.id,
			conversationId: doc.id
		}));
	});

	const allConversations = await Promise.all(conversationsPromises);
	const flattenedConversations = allConversations.flat();

	if (flattenedConversations.length === 0) {
		throw error(404, 'No conversations found');
	}

	return flattenedConversations;
}

/**
 * Retrieves group discussion data from all groups in a session.
 * Discussions represent collaborative conversations between group members,
 * distinct from individual AI conversations. Used for analyzing group dynamics
 * and collaborative learning patterns.
 * 
 * @param id - Session ID
 * @returns Array of group discussions with group identifiers
 * @returns Empty array if no groups or discussions are found (not considered an error)
 * 
 * @example
 * ```ts
 * const discussions = await getDiscussionsFromAllGroupsData("session123");
 * // Returns: [{ groupId: "group1", discussion: [...discussionMessages] }, ...]
 * ```
 */
export async function getDiscussionsFromAllGroupsData(
	id: string
): Promise<Array<{ groupId: string; discussion: Group['discussions'] }>> {
	const groupsRef = getGroupsRef(id);
	const groups = await groupsRef.get();

	if (groups.empty) {
		// Return empty array if no groups found, as it might not be an error condition
		return [];
	}

	const discussionsPromises = groups.docs.map(async (groupDoc) => {
		const groupData = (await groupDoc.ref.get()).data() as Group;
		return {
			groupId: groupDoc.id,
			discussion: groupData.discussions || [] // Ensure discussions is an array
		};
	});

	const allDiscussions = await Promise.all(discussionsPromises);

	// Filter out groups that have no discussion content
	return allDiscussions.filter((d) => d.discussion.length > 0);
}

/**
 * Checks if a user has permission to remove a participant from a session.
 * Permission is granted if the user is either:
 * 1. The session host (can remove any participant)
 * 2. The participant themselves (can remove themselves)
 * 
 * This implements basic access control for session management operations.
 * 
 * @param sessionId - Session ID to check permissions for
 * @param userId - ID of the user requesting the removal
 * @param participantToRemove - ID of the participant to be removed
 * @returns True if the user has permission, false otherwise
 * 
 * @example
 * ```ts
 * const canRemove = await checkRemoveParticipantPermission("session123", "user456", "user789");
 * if (canRemove) {
 *   // Proceed with removal
 * }
 * ```
 */
export async function checkRemoveParticipantPermission(
	sessionId: string,
	userId: string,
	participantToRemove: string
): Promise<boolean> {
	const sessionRef = getSessionRef(sessionId);
	const session = await getSessionData(sessionRef);

	// Check if user is the session host or the participant being removed
	return session.host === userId || userId === participantToRemove;
}
