import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase';
import { chatWithLLMByDocs } from '$lib/server/llm';
import { parsePdf2Text } from '$lib/server/parse';
import { transcribe } from '$lib/stt/core';
import type {
	FirestoreIndividualDiscussion
} from '$lib/types/IndividualDiscussion';
import type { FirestoreSession } from '$lib/types/session';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const sessionRef = adminDb.collection('sessions').doc(params.id);
	const sessionDoc = await sessionRef.get();
	const session = sessionDoc.data();

	if (!session) {
		throw error(404, 'Session not found');
	}

	if (!(locals.user.uid in session.participants)) {
		throw error(403, 'Not a participant in this session');
	}

	return {
		user: locals.user
	};
};

export const actions = {
	createGroup: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const data = await request.formData();
		const groupName = data.get('groupName')?.toString();

		if (!groupName) {
			return fail(400, { missing: true });
		}

		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const groupId = crypto.randomUUID();

		await sessionRef.update({
			[`groups.${groupId}`]: {
				name: groupName,
				leaderId: locals.user.uid,
				members: {
					[locals.user.uid]: {
						name: locals.user.name,
						joinedAt: new Date()
					}
				}
			}
		});

		return { success: true, groupId };
	},

	startIndividualStage: async ({ locals, params }) => {
		const sessionId = params.id;
		const sessionRef = adminDb.collection('sessions').doc(sessionId);
		const sessionData = (await sessionRef.get()).data() as FirestoreSession;
		if (sessionData.hostId != locals.user?.uid) {
			throw redirect(401, 'Unauthorized');
		}

		const resourcesTexts = [];
		// parse pdf files to text
		for (const resourceId of sessionData.resourceIds) {
			const resourceRef = adminDb.collection('resources').doc(resourceId);
			const resourceData = (await resourceRef.get()).data();
			const text = await parsePdf2Text(resourceData?.fileId);
			resourcesTexts.push(text);
		}

		// create conversation for each participants
		for (const participantId in sessionData.participants) {
			const individualDiscussionRef = adminDb.collection('individualDiscussion').doc();
			await individualDiscussionRef.set({
				userId: participantId,
				sessionId: sessionId,
				groupId: sessionData.participants[participantId].groupId,
				goal: sessionData.goal,
				subQuestions: sessionData.subQuestions,
				resourcesTexts: resourcesTexts,
				history: [],
				summary: ''
			});
		}

		// set session stage to individual
		await sessionRef.update({ stage: 'individual' });

		return { success: true };
	},

	sendConversation: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}
		const { speech } = await request.json();
		const userId = locals.user.uid;
		const sessionId = params.id;

		const fileId = 'Unknown file id'; // TODO: get file id from the file upload
		const text = await transcribe(speech, env.HUGGINGFACE_TOKEN);

		const individualDiscussionRef = adminDb
			.collection('individualDiscussion')
			.where('userId', '==', userId)
			.where('sessionId', '==', sessionId);
		const individualDiscussionData = (
			await individualDiscussionRef.get()
		).docs[0].data() as FirestoreIndividualDiscussion;

		if (!individualDiscussionData) {
			throw error(404, 'Individual discussion not found');
		}

		const { history, goal, subQuestions, resourcesTexts } =
			convertFirestoreIndividualDiscussion(individualDiscussionData);

		history.push({
			role: 'user',
			fileId: fileId,
			content: text,
			timestamp: new Date().toISOString()
		});

		const response = await chatWithLLMByDocs(history, goal, subQuestions, resourcesTexts);
		if (!response.success) {
			throw error(500, response.error);
		}

		history.push({
			role: 'user',
			fileId: null,
			content: response.message,
			timestamp: new Date().toISOString()
		});

		return { success: true };
	}
} satisfies Actions;
