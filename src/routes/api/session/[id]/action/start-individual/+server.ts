import type { Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST({ params }) {
	try {
		// 1. 獲取 session 資料
		const sessionRef = adminDb.collection('sessions').doc(params.id);
		const sessionDoc = await sessionRef.get();
		if (!sessionDoc.exists) {
			throw error(404, 'Session not found');
		}
		const session = sessionDoc.data() as Session;

		// 2. 獲取所有群組
		const groupsSnapshot = await adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.get();

		// 3. 為每個群組的每個參與者創建對話（如果不存在）
		for (const groupDoc of groupsSnapshot.docs) {
			const group = groupDoc.data();
			const conversationsRef = adminDb
				.collection('sessions')
				.doc(params.id)
				.collection('groups')
				.doc(groupDoc.id)
				.collection('conversations');

			// 為每個參與者檢查並創建對話
			for (const participant of group.participants) {
				// 檢查是否已存在對話
				const existingConvSnapshot = await conversationsRef
					.where('userId', '==', participant)
					.get();

				// 如果不存在對話，則創建新的
				if (existingConvSnapshot.empty) {
					await conversationsRef.add({
						userId: participant,
						history: [],
						subtasks: session.subtasks || [],
						subtaskCompleted: session.subtasks ? session.subtasks.map(() => false) : [],
						createdAt: new Date().toISOString()
					});
				}
			}
		}

		// 4. 更新 session 狀態
		await sessionRef.update({
			status: 'individual',
			'timing.individual.start': Timestamp.now()
		});

		return json({ success: true });
	} catch (err) {
		console.error('Error starting individual stage:', err);
		throw error(500, 'Failed to start individual stage');
	}
}
