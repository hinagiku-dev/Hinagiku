import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import { adminDb } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';

export async function createConversation(
	id: string,
	group_number: string,
	userId: string,
	task: string,
	subtasks: string[],
	resources: string[]
) {
	const conversationRef = adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations')
		.doc();

	await conversationRef.set({
		userId: userId,
		task: task,
		subtasks: subtasks,
		resources: resources,
		history: [],
		subtaskCompleted: new Array(subtasks.length).fill(false)
	});

	return conversationRef.id;
}
export async function getConversationRef(id: string, group_number: string, conv_id: string) {
	return adminDb
		.collection('sessions')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations')
		.doc(conv_id);
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

export function getConversationsRef(id: string, group_number: string) {
	return adminDb
		.collection('session')
		.doc(id)
		.collection('groups')
		.doc(group_number)
		.collection('conversations');
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

export async function getGroupData(
	group_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
): Promise<Group> {
	const group = await group_ref.get();
	if (!group.exists) {
		throw error(404, 'Group not found');
	}

	return group.data() as Group;
}
