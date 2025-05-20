import { env } from '$env/dynamic/private';
import type { Conversation } from '$lib/schema/conversation';
import type { Group } from '$lib/schema/group';
import type { Session } from '$lib/schema/session';
import type { LLMChatMessage } from '$lib/server/types';
import { error } from '@sveltejs/kit';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

class FirebaseService {
	readonly adminAuth;
	readonly adminDb;

	constructor() {
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

		this.adminAuth = getAuth();
		this.adminDb = getFirestore();
	}

	async createConversation(
		id: string,
		group_number: string,
		userId: string,
		task: string,
		subtasks: string[],
		history: LLMChatMessage[],
		resources: { name: string; content: string }[]
	) {
		const conversationsRef = this.adminDb
			.collection('sessions')
			.doc(id)
			.collection('groups')
			.doc(group_number)
			.collection('conversations');

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

	getConversationRef(id: string, group_number: string, conv_id: string) {
		return this.adminDb
			.collection('sessions')
			.doc(id)
			.collection('groups')
			.doc(group_number)
			.collection('conversations')
			.doc(conv_id);
	}

	getConversationsRef(id: string, group_number: string) {
		return this.adminDb
			.collection('sessions')
			.doc(id)
			.collection('groups')
			.doc(group_number)
			.collection('conversations');
	}

	async getConversationData(
		conversation_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
	): Promise<Conversation> {
		const conversation = await conversation_ref.get();
		if (!conversation.exists) {
			throw error(404, 'Conversation not found');
		}

		return conversation.data() as Conversation;
	}

	async getConversationsData(
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

	getGroupRef(id: string, group_number: string) {
		return this.adminDb.collection('sessions').doc(id).collection('groups').doc(group_number);
	}

	getGroupsRef(id: string) {
		return this.adminDb.collection('sessions').doc(id).collection('groups');
	}

	async getGroupData(
		group_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
	): Promise<Group> {
		const group = await group_ref.get();
		if (!group.exists) {
			throw error(404, 'Group not found');
		}

		return group.data() as Group;
	}

	async getGroupsData(
		groups_ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
	): Promise<Group[]> {
		const groups = await groups_ref.get();
		if (groups.empty) {
			throw error(404, 'Groups not found');
		}

		return groups.docs.map((doc) => doc.data() as Group);
	}

	getSessionRef(id: string) {
		return this.adminDb.collection('sessions').doc(id);
	}

	async getSessionData(
		session_ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
	): Promise<Session> {
		const session = await session_ref.get();
		if (!session.exists) {
			throw error(404, 'Session not found');
		}

		return session.data() as Session;
	}

	async getConversationsFromAllParticipantsData(
		id: string
	): Promise<Array<Conversation & { groupId: string; conversationId: string }>> {
		const groupsRef = this.getGroupsRef(id);
		const groups = await groupsRef.get();

		if (groups.empty) {
			throw error(404, 'No groups found');
		}

		const conversationsPromises = groups.docs.map(async (groupDoc) => {
			const conversationsRef = this.getConversationsRef(id, groupDoc.id);
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

	async checkRemoveParticipantPermission(
		sessionId: string,
		userId: string,
		participantToRemove: string
	): Promise<boolean> {
		const sessionRef = this.getSessionRef(sessionId);
		const session = await this.getSessionData(sessionRef);

		return session.host === userId || userId === participantToRemove;
	}
}

export const firebaseService = new FirebaseService();
export const adminAuth = firebaseService.adminAuth;
export const adminDb = firebaseService.adminDb;

export const createConversation = firebaseService.createConversation.bind(firebaseService);
export const getConversationRef = firebaseService.getConversationRef.bind(firebaseService);
export const getConversationsRef = firebaseService.getConversationsRef.bind(firebaseService);
export const getConversationData = firebaseService.getConversationData.bind(firebaseService);
export const getConversationsData = firebaseService.getConversationsData.bind(firebaseService);
export const getGroupRef = firebaseService.getGroupRef.bind(firebaseService);
export const getGroupsRef = firebaseService.getGroupsRef.bind(firebaseService);
export const getGroupData = firebaseService.getGroupData.bind(firebaseService);
export const getGroupsData = firebaseService.getGroupsData.bind(firebaseService);
export const getSessionRef = firebaseService.getSessionRef.bind(firebaseService);
export const getSessionData = firebaseService.getSessionData.bind(firebaseService);
export const getConversationsFromAllParticipantsData =
	firebaseService.getConversationsFromAllParticipantsData.bind(firebaseService);
export const checkRemoveParticipantPermission =
	firebaseService.checkRemoveParticipantPermission.bind(firebaseService);
