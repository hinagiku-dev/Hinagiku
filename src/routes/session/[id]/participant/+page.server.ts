import { SessionSchema } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { error, redirect } from '@sveltejs/kit';
import type { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const sessionRef = adminDb.collection('sessions').doc(params.id);
	const session = (await sessionRef.get()).data() as z.infer<typeof SessionSchema>;
	if (!session) {
		throw error(404, 'Session not found');
	}

	const groupRef = sessionRef
		.collection('groups')
		.where('participants', 'array-contains', locals.user.uid);
	if ((await groupRef.get()).empty) {
		throw error(401, 'Unauthorized');
	}

	if (session.status === 'individual') {
		const conversationRef = adminDb.collection('conversation').doc();
		await conversationRef.set({
			sessionId: params.id,
			userId: locals.user.uid,
			role: 'user',
			content: '',
			timestamp: new Date().toISOString()
		});
		throw redirect(303, `/session/${params.id}/conversation/${conversationRef.id}`);
	}

	const sessionId = params.id;
	const groupsRef = adminDb.collection('sessions').doc(sessionId).collection('groups');
	const groupsSnapshot = await groupsRef.get();

	const groups = await Promise.all(
		groupsSnapshot.docs.map(async (groupDoc) => {
			const participantsRef = groupDoc.ref.collection('participants');
			const participantsSnapshot = await participantsRef.get();
			const participants = participantsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			return {
				id: groupDoc.id,
				number: groupDoc.data().number,
				participants
			};
		})
	);

	return {
		user: locals.user,
		groups
	};
};
export const actions = {
	// startIndividualStage: async ({ locals, params }) => {
	// 	const sessionId = params.id;
	// 	const sessionRef = adminDb.collection('sessions').doc(sessionId);
	// 	const sessionData = (await sessionRef.get()).data() as FirestoreSession;
	// 	if (sessionData.hostId != locals.user?.uid) {
	// 		throw redirect(401, 'Unauthorized');
	// 	}
	// 	const resourcesTexts = [];
	// 	// parse pdf files to text
	// 	for (const resourceId of sessionData.resourceIds) {
	// 		const resourceRef = adminDb.collection('resources').doc(resourceId);
	// 		const resourceData = (await resourceRef.get()).data();
	// 		const text = await parsePdf2Text(resourceData?.fileId);
	// 		resourcesTexts.push(text);
	// 	}
	// 	// create conversation for each participants
	// 	for (const participantId in sessionData.participants) {
	// 		const individualDiscussionRef = adminDb.collection('individualDiscussion').doc();
	// 		await individualDiscussionRef.set({
	// 			userId: participantId,
	// 			sessionId: sessionId,
	// 			groupId: sessionData.participants[participantId].groupId,
	// 			goal: sessionData.goal,
	// 			subQuestions: sessionData.subQuestions,
	// 			resourcesTexts: resourcesTexts,
	// 			history: [],
	// 			summary: ''
	// 		});
	// 	}
	// 	// set session stage to individual
	// 	await sessionRef.update({ stage: 'individual' });
	// 	return { success: true };
	// },
	// sendConversation: async ({ request, locals, params }) => {
	// 	if (!locals.user) {
	// 		throw error(401, 'Unauthorized');
	// 	}
	// 	const { speech } = await request.json();
	// 	const userId = locals.user.uid;
	// 	const sessionId = params.id;
	// 	const fileId = 'Unknown file id'; // TODO: get file id from the file upload
	// 	const text = await transcribe(speech, env.HUGGINGFACE_TOKEN);
	// 	const individualDiscussionRef = adminDb
	// 		.collection('individualDiscussion')
	// 		.where('userId', '==', userId)
	// 		.where('sessionId', '==', sessionId);
	// 	const individualDiscussionData = (
	// 		await individualDiscussionRef.get()
	// 	).docs[0].data() as FirestoreIndividualDiscussion;
	// 	if (!individualDiscussionData) {
	// 		throw error(404, 'Individual discussion not found');
	// 	}
	// 	const { history, goal, subQuestions, resourcesTexts } =
	// 		convertFirestoreIndividualDiscussion(individualDiscussionData);
	// 	history.push({
	// 		role: 'user',
	// 		fileId: fileId,
	// 		content: text,
	// 		timestamp: new Date().toISOString()
	// 	});
	// 	const response = await chatWithLLMByDocs(history, goal, subQuestions, resourcesTexts);
	// 	if (!response.success) {
	// 		throw error(500, response.error);
	// 	}
	// 	history.push({
	// 		role: 'user',
	// 		fileId: null,
	// 		content: response.message,
	// 		timestamp: new Date().toISOString()
	// 	});
	// 	return { success: true };
	// }
} satisfies Actions;
