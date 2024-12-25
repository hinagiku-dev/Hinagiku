import { adminDb } from '$lib/server/firebase';
import { checkRemoveParticipantPermission } from '$lib/utils/firestore';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { id, group_number, participant } = params;
		const userId = locals.user?.uid;
		if (!userId) {
			throw error(401, '未登入');
		}

		if (!participant) {
			throw error(400, '缺少參與者ID');
		}

		// 檢查權限
		const hasPermission = await checkRemoveParticipantPermission(id, userId, participant);

		if (!hasPermission) {
			throw error(403, '您沒有權限移除此參與者');
		}

		// 找到群組
		const groupsRef = adminDb.collection('sessions').doc(id).collection('groups');
		const groupDoc = await groupsRef.doc(group_number).get();

		if (!groupDoc.exists) {
			throw error(404, '找不到群組');
		}

		const groupData = groupDoc.data();
		if (!groupData) {
			throw error(404, '找不到群組資料');
		}

		// 確認參與者在群組中
		if (!groupData.participants.includes(participant)) {
			throw error(400, '參與者不在此群組中');
		}

		// 計算移除參與者後的新參與者列表
		const updatedParticipants = groupData.participants.filter((p: string) => p !== participant);

		if (updatedParticipants.length === 0) {
			// 如果群組將變成空的，直接刪除整個群組
			await groupDoc.ref.delete();
		} else {
			// 否則只更新參與者列表
			await groupDoc.ref.update({
				participants: updatedParticipants
			});
		}

		// 刪除參與者的對話記錄
		const conversationsRef = groupDoc.ref.collection('conversations');
		const conversationQuery = await conversationsRef.where('userId', '==', participant).get();

		const deletePromises = conversationQuery.docs.map((doc) => doc.ref.delete());
		await Promise.all(deletePromises);

		return json({ success: true });
	} catch (e) {
		console.error('移除參與者時發生錯誤:', e);
		throw error(500, '無法移除參與者');
	}
};
