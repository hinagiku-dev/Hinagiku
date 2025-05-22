import { env } from '$env/dynamic/private';
import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import type { Session } from '$lib/schema/session';
import type { LLMChatMessage } from '$lib/server/types';
import { error } from '@sveltejs/kit';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized.
// This ensures that Firebase services can be used server-side.
if (!getApps().length) {
	let serviceAccountPathOrObject: string | ServiceAccount;
	try {
		// Attempt to parse GOOGLE_APPLICATION_CREDENTIALS as a JSON object (service account key).
		// This is useful if the credentials are provided as a JSON string in the environment.
		const tmp = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS);
		if (typeof tmp === 'object') {
			serviceAccountPathOrObject = tmp;
		} else {
			// If parsing succeeds but it's not an object, it's an invalid format.
			throw new Error('Parsed GOOGLE_APPLICATION_CREDENTIALS is not an object.');
		}
	} catch (e) {
		// If parsing fails, assume GOOGLE_APPLICATION_CREDENTIALS is a file path.
		// This is the standard way to provide credentials in some environments.
		serviceAccountPathOrObject = env.GOOGLE_APPLICATION_CREDENTIALS;
	}
	initializeApp({
		credential: cert(serviceAccountPathOrObject) // Use cert() to load the service account.
	});
}

// Export Firebase Admin services for use in other server-side modules.
export const adminAuth = getAuth(); // Firebase Authentication service
export const adminDb = getFirestore(); // Firestore service

/**
 * Creates a new conversation document in Firestore if one doesn't already exist for the user in the group.
 * If a conversation already exists for the user, its ID is returned.
 *
 * @param id The session ID.
 * @param group_number The group number (as a string).
 * @param userId The ID of the user for whom the conversation is being created.
 * @param task The task description for the conversation.
 * @param subtasks An array of subtasks.
 * @param history Initial chat history for the conversation.
 * @param resources An array of resources (documents) relevant to the conversation.
 * @returns The ID of the created or existing conversation.
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
	// Path to the 'conversations' subcollection for a specific group within a session.
	const conversationsRef = adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations');

	// Check if a conversation for this user already exists in this group.
	// The comment "檢查是否已存在該使用者的對話" means "Check if a conversation for this user already exists".
	const existingConversations = await conversationsRef.where('userId', '==', userId).get();
	if (!existingConversations.empty) {
		// If a conversation exists, return its ID.
		return existingConversations.docs[0].id;
	}

	// If no conversation exists, create a new one.
	const conversationRef = conversationsRef.doc(); // Create a new document reference.
	await conversationRef.set({
		userId: userId,
		task: task,
		subtasks: subtasks,
		resources: resources,
		history: history,
		subtaskCompleted: new Array(subtasks.length).fill(false), // Initialize all subtasks as not completed.
		warning: { moderation: false, offTopic: 0 } // Initialize warning flags.
	});

	return conversationRef.id; // Return the ID of the new conversation.
}

/**
 * Gets a Firestore document reference to a specific conversation.
 *
 * @param id The session ID.
 * @param group_number The group number.
 * @param conv_id The conversation ID.
 * @returns A Firestore DocumentReference.
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
 * Gets a Firestore collection reference to all conversations within a specific group.
 *
 * @param id The session ID.
 * @param group_number The group number.
 * @returns A Firestore CollectionReference.
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
 * Retrieves the data for a specific conversation.
 * Throws a 404 error if the conversation is not found.
 *
 * @param conversation_ref A Firestore document reference to the conversation.
 * @returns A Promise resolving to the Conversation data.
 */
export async function getConversationData(
	conversation_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Conversation> {
	const conversation = await conversation_ref.get();
	if (!conversation.exists) {
		throw error(404, `Conversation at path '${conversation_ref.path}' not found.`);
	}
	return conversation.data() as Conversation;
}

/**
 * Retrieves data for all conversations within a specific group.
 * Throws a 404 error if no conversations are found.
 *
 * @param conversations_ref A Firestore collection reference to the conversations.
 * @returns A Promise resolving to an array of Conversation data.
 */
export async function getConversationsData(
	conversations_ref: FirebaseFirestore.CollectionReference<
		FirebaseFirestore.DocumentData,
		FirebaseFirestore.DocumentData
	>
) {
	const conversations = await conversations_ref.get();
	if (conversations.empty) {
		throw error(404, `No conversations found under path '${conversations_ref.path}'.`);
	}
	return conversations.docs.map((doc) => doc.data() as Conversation);
}

/**
 * Gets a Firestore document reference to a specific group.
 *
 * @param id The session ID.
 * @param group_number The group number.
 * @returns A Firestore DocumentReference.
 */
export function getGroupRef(id: string, group_number: string) {
	return adminDb.collection('sessions').doc(id).collection('groups').doc(group_number);
}

/**
 * Gets a Firestore collection reference to all groups within a specific session.
 *
 * @param id The session ID.
 * @returns A Firestore CollectionReference.
 */
export function getGroupsRef(id: string) {
	return adminDb.collection('sessions').doc(id).collection('groups');
}

/**
 * Retrieves the data for a specific group.
 * Throws a 404 error if the group is not found.
 *
 * @param group_ref A Firestore document reference to the group.
 * @returns A Promise resolving to the Group data.
 */
export async function getGroupData(
	group_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Group> {
	const group = await group_ref.get();
	if (!group.exists) {
		throw error(404, `Group at path '${group_ref.path}' not found.`);
	}
	return group.data() as Group;
}

/**
 * Retrieves data for all groups within a specific session.
 * Throws a 404 error if no groups are found.
 *
 * @param groups_ref A Firestore collection reference to the groups.
 * @returns A Promise resolving to an array of Group data.
 */
export async function getGroupsData(
	groups_ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
): Promise<Group[]> {
	const groups = await groups_ref.get();
	if (groups.empty) {
		throw error(404, `No groups found under path '${groups_ref.path}'.`);
	}
	return groups.docs.map((doc) => doc.data() as Group);
}

/**
 * Gets a Firestore document reference to a specific session.
 *
 * @param id The session ID.
 * @returns A Firestore DocumentReference.
 */
export function getSessionRef(id: string) {
	return adminDb.collection('sessions').doc(id);
}

/**
 * Retrieves the data for a specific session.
 * Throws a 404 error if the session is not found.
 *
 * @param session_ref A Firestore document reference to the session.
 * @returns A Promise resolving to the Session data.
 */
export async function getSessionData(
	session_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Session> {
	const session = await session_ref.get();
	if (!session.exists) {
		throw error(404, `Session at path '${session_ref.path}' not found.`);
	}
	return session.data() as Session;
}

/**
 * Retrieves all conversations from all groups within a given session.
 * Each conversation object is augmented with `groupId` and `conversationId`.
 * Throws a 404 error if no groups or no conversations are found.
 *
 * @param id The session ID.
 * @returns A Promise resolving to an array of Conversation data, each including groupId and conversationId.
 */
export async function getConversationsFromAllParticipantsData(
	id: string
): Promise<Array<Conversation & { groupId: string; conversationId: string }>> {
	// Get references to all groups in the session.
	// The comment "先獲取所有小組" means "First, get all groups".
	const groupsRef = getGroupsRef(id);
	const groups = await groupsRef.get();

	if (groups.empty) {
		throw error(404, `No groups found for session '${id}'.`);
	}

	// For each group, fetch all its conversations.
	// The comment "獲取每個小組中的所有對話" means "Get all conversations in each group".
	const conversationsPromises = groups.docs.map(async (groupDoc) => {
		const conversationsRef = getConversationsRef(id, groupDoc.id);
		const conversations = await conversationsRef.get();

		// Map conversation data and add groupId and conversationId.
		return conversations.docs.map((doc) => ({
			...(doc.data() as Conversation),
			groupId: groupDoc.id,
			conversationId: doc.id
		}));
	});

	// Wait for all conversation fetching promises to resolve.
	const allConversations = await Promise.all(conversationsPromises);
	const flattenedConversations = allConversations.flat(); // Flatten the array of arrays.

	if (flattenedConversations.length === 0) {
		throw error(404, `No conversations found in any group for session '${id}'.`);
	}

	return flattenedConversations;
}

/**
 * Checks if a user has permission to remove another participant from a session.
 * Permission is granted if the user is the session host or if the user is removing themselves.
 *
 * @param sessionId The ID of the session.
 * @param userId The ID of the user attempting the removal.
 * @param participantToRemove The ID of the participant to be removed.
 * @returns A Promise resolving to true if permission is granted, false otherwise.
 */
export async function checkRemoveParticipantPermission(
	sessionId: string,
	userId: string,
	participantToRemove: string
): Promise<boolean> {
	const sessionRef = getSessionRef(sessionId);
	const session = await getSessionData(sessionRef);

	// Check if the user is the session host or the participant being removed.
	// The comment "檢查是否為 session host 或是要被移除的參與者本人" means
	// "Check if it is the session host or the participant to be removed themselves".
	return session.host === userId || userId === participantToRemove;
}
