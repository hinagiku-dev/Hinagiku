import { LearningRecordSchema } from '$lib/schema/learningRecord';
import { adminDb } from '$lib/server/firebase';
import { json, type RequestHandler } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { id: sessionId, group_number: groupId } = params;
		if (!sessionId || !groupId) {
			return json({ error: 'Missing session or group ID' }, { status: 400 });
		}
		const { uid: userId } = locals.user;

		const recordRef = adminDb
			.collection('sessions')
			.doc(sessionId)
			.collection('groups')
			.doc(groupId)
			.collection('learningRecords')
			.doc(userId);

		const recordDoc = await recordRef.get();

		if (!recordDoc.exists) {
			return json({ error: 'Learning record not found' }, { status: 404 });
		}

		return json(recordDoc.data());
	} catch (error) {
		console.error('Error fetching learning record:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { id: sessionId, group_number: groupId } = params;
		if (!sessionId || !groupId) {
			return json({ error: 'Missing session or group ID' }, { status: 400 });
		}
		const { uid: userId } = locals.user;
		const { answer } = await request.json();

		const recordRef = adminDb
			.collection('sessions')
			.doc(sessionId)
			.collection('groups')
			.doc(groupId)
			.collection('learningRecords')
			.doc(userId);

		const data = {
			userId,
			answer,
			updatedAt: Timestamp.now()
		};

		const recordDoc = await recordRef.get();

		if (recordDoc.exists) {
			await recordRef.update(data);
		} else {
			await recordRef.set({
				...data,
				createdAt: Timestamp.now()
			});
		}

		// Validate with schema before sending back
		const finalDoc = await recordRef.get();
		const finalData = finalDoc.data();

		const validation = LearningRecordSchema.safeParse(finalData);
		if (!validation.success) {
			// This case should ideally not happen if logic is correct
			console.error('Learning record validation error:', validation.error);
			return json({ error: 'Invalid data after save' }, { status: 500 });
		}

		return json({ success: true, record: validation.data });
	} catch (error) {
		console.error('Error saving learning record:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
