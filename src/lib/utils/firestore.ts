import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import type { LLMChatMessage } from './types';

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

	const existingConversations = await conversationsRef.get();
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
		warning: { moderation: false, off_topic: 0 }
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
