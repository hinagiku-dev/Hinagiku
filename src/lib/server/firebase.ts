import { env } from '$env/dynamic/private';
import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import type { Session } from '$lib/schema/session';
import type { LLMChatMessage } from '$lib/server/types';
import { error } from '@sveltejs/kit';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
	let serviceAccountPathOrObject: string | ServiceAccount;
	try {
		const tmp = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS);
		if (typeof tmp === 'object') {
			serviceAccountPathOrObject = tmp;
		} else {
			throw new Error();
		}
	} catch {
		serviceAccountPathOrObject = env.GOOGLE_APPLICATION_CREDENTIALS;
	}
	initializeApp({
		credential: cert(serviceAccountPathOrObject)
	});
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();

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

	// 檢查是否已存在該使用者的對話
	const existingConversations = await conversationsRef.where('userId', '==', userId).get();
	if (!existingConversations.empty) {
		return existingConversations.docs[0].id;
	}

	const conversationRef = conversationsRef.doc();
	await conversationRef.set({
		userId: userId,
		task: task,
		subtasks: subtasks,
		resources: resources,
		history: history,
		subtaskCompleted: new Array(subtasks.length).fill(false),
		warning: { moderation: false, offTopic: 0 }
	});

	return conversationRef.id;
}
export function getConversationRef(id: string, group_number: string, conv_id: string) {
	return adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations')
		.doc(conv_id);
}

export function getConversationsRef(id: string, group_number: string) {
	return adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations');
}

export async function getConversationData(
	conversation_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Conversation> {
	const conversation = await conversation_ref.get();
	if (!conversation.exists) {
		throw error(404, 'Conversation not found');
	}

	return conversation.data() as Conversation;
}

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

export function getGroupRef(id: string, group_number: string) {
	return adminDb.collection('sessions').doc(id).collection('groups').doc(group_number);
}

export function getGroupsRef(id: string) {
	return adminDb.collection('sessions').doc(id).collection('groups');
}

export async function getGroupData(
	group_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Group> {
	const group = await group_ref.get();
	if (!group.exists) {
		throw error(404, 'Group not found');
	}

	return group.data() as Group;
}

export async function getGroupsData(
	groups_ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
): Promise<Group[]> {
	const groups = await groups_ref.get();
	if (groups.empty) {
		throw error(404, 'Groups not found');
	}

	return groups.docs.map((doc) => doc.data() as Group);
}

export function getSessionRef(id: string) {
	return adminDb.collection('sessions').doc(id);
}

export async function getSessionData(
	session_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Session> {
	const session = await session_ref.get();
	if (!session.exists) {
		throw error(404, 'Session not found');
	}

	return session.data() as Session;
}

export async function getConversationsFromAllParticipantsData(
	id: string
): Promise<Array<Conversation & { groupId: string; conversationId: string }>> {
	// 先獲取所有小組
	const groupsRef = getGroupsRef(id);
	const groups = await groupsRef.get();

	if (groups.empty) {
		throw error(404, 'No groups found');
	}

	// 獲取每個小組中的所有對話
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

export async function checkRemoveParticipantPermission(
	sessionId: string,
	userId: string,
	participantToRemove: string
): Promise<boolean> {
	const sessionRef = getSessionRef(sessionId);
	const session = await getSessionData(sessionRef);

	// 檢查是否為 session host 或是要被移除的參與者本人
	return session.host === userId || userId === participantToRemove;
}
