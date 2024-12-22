import dotenv from 'dotenv';
dotenv.config();

import { adminDb } from '../src/lib/server/firebase';

async function deleteAllConversationsInSession(sessionId: string) {
	try {
		// 1. 獲取所有群組
		const groupsSnapshot = await adminDb
			.collection('sessions')
			.doc(sessionId)
			.collection('groups')
			.get();

		// 2. 遍歷每個群組
		for (const groupDoc of groupsSnapshot.docs) {
			// 3. 獲取該群組下所有的對話
			const conversationsSnapshot = await groupDoc.ref.collection('conversations').get();

			// 4. 刪除每個對話
			const deletePromises = conversationsSnapshot.docs.map(async (doc) => {
				await doc.ref.delete();
				console.log(`已刪除對話: ${doc.id} (群組 ${groupDoc.id})`);
			});

			// 5. 等待該群組的所有刪除操作完成
			await Promise.all(deletePromises);
			console.log(`群組 ${groupDoc.id} 的所有對話已刪除`);
		}

		console.log(`Session ${sessionId} 的所有對話刪除成功`);
	} catch (error) {
		console.error('刪除對話時發生錯誤:', error);
	}
}

// 使用方式：傳入要刪除的 session ID
const sessionId = 'VJgvzmbRuWwqR8kH4MMz'; // 替換成要刪除的 session ID
deleteAllConversationsInSession(sessionId).catch(console.error);
