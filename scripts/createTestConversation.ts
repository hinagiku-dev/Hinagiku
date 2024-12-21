import dotenv from 'dotenv';
dotenv.config();

import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';
import { ConversationSchema } from '../src/lib/schema/conversation';
import { adminDb } from '../src/lib/server/firebase';

const sessionId = 'HtxeyVYERenrLEjfyo5D';

// 定義每個組別的學生
const groupStudents = {
	EgiswFBA0SYcoKIs5Gfj: ['student20', 'student21', 'student22', 'student23', 'student24'],
	M0eISsjk1gCdW5bQv9bB: ['student15', 'student16', 'student17', 'student18', 'student19'],
	N4ewFkq1qcVEQRMAyx2V: ['student5', 'student6', 'student7', 'student8', 'student9'],
	QPNsmpjOY789zFW57sh9: ['student30', 'student31', 'student32', 'student33', 'student34'],
	XMbXxl7QbuSGfhMDtwHt: ['student10', 'student11', 'student12', 'student13', 'student14'],
	Zx7H7fsko7JZxX9WTY3w: ['student35', 'student36', 'student37', 'student38', 'student39'],
	erbsXRbyjfiYQZJVRGaI: ['student0', 'student1', 'student2', 'student3', 'student4'],
	f9U4yziIjCQ1R0jJYM7V: ['student25', 'student26', 'student27', 'student28', 'student29']
} as const;

// 添加這個新的函數來生成測試對話史
async function createTestHistory(conversationRef: FirebaseFirestore.DocumentReference) {
	const sampleHistories = [
		[
			{
				role: 'system',
				content: '我是一個AI助手，可以幫助你完成任務。',
				audio: null
			},
			{
				role: 'user',
				content: '你好，我需要幫助理解這篇文章。',
				audio: null
			},
			{
				role: 'assistant',
				content: '當然可以，讓我們一步一步來分析這篇文章。首先，你覺得文章的主旨是什麼？',
				audio: null
			},
			{
				role: 'user',
				content: '我覺得文章主要在討論環境保護的重要性。',
				audio: null
			},
			{
				role: 'assistant',
				content: '很好的觀察！作者確實強調了環境保護的迫切性。你能指出文章中提到的具體環境問題嗎？',
				audio: null
			}
		],
		[
			{
				role: 'system',
				content: '我是一個AI助手，可以幫助你完成任務。',
				audio: null
			},
			{
				role: 'user',
				content: '這篇文章的寫作手法有什麼特別之處？',
				audio: null
			},
			{
				role: 'assistant',
				content: '這篇文章運用了很多比喻和類比的修辭手法，讓抽象的概念更容易理解。',
				audio: null
			},
			{
				role: 'user',
				content: '能舉個例子嗎？',
				audio: null
			},
			{
				role: 'assistant',
				content:
					'比如作者將地球比喻為一個生病的病人，環境污染就像是各種疾病，而我們人類就是醫生，需要及時治療。',
				audio: null
			}
		],
		[
			{
				role: 'system',
				content: '我是一個AI助手，可以幫助你完成任務。',
				audio: null
			},
			{
				role: 'user',
				content: '我想討論文章中的論點結構。',
				audio: null
			},
			{
				role: 'assistant',
				content: '好的，這篇文章的論點結構很清晰。作者先提出問題，然後分析原因，最後給出解決方案。',
				audio: null
			},
			{
				role: 'user',
				content: '你覺得哪個論點最有說服力？',
				audio: null
			},
			{
				role: 'assistant',
				content:
					'我認為作者用具體數據支持環境污染造成的經濟損失這個論點最有說服力，因為它提供了實際的證據。',
				audio: null
			}
		]
	];

	// 隨機選擇一個對話歷史
	const history = sampleHistories[Math.floor(Math.random() * sampleHistories.length)];

	// 直接更新資料庫中的 conversation
	await conversationRef.update({
		history,
		summary: '這是一個測試用的總結。',
		keyPoints: ['關鍵點1', '關鍵點2', '關鍵點3']
	});
}

async function createTestConversations() {
	try {
		for (const [groupNumber, students] of Object.entries(groupStudents)) {
			for (const userId of students) {
				const subtaskCompleted = Array.from({ length: 5 }, () => Math.random() > 0.5);

				const conversation = {
					userId,
					task: `測試任務 - 組別 ${groupNumber}`,
					subtaskCompleted,
					subtasks: [
						'閱讀並理解文章主旨',
						'找出文章中的關鍵論點',
						'分析作者的寫作手法',
						'評估文章的可信度',
						'提出個人見解'
					],
					resources: [
						{
							id: uuid(),
							type: 'text',
							name: '測試資源',
							content: '這是測試用的資源內容',
							createdAt: Timestamp.now(),
							ref: null
						}
					],
					history: [],
					summary: null,
					keyPoints: null
				};

				// 驗證 conversation 是否符合 schema
				ConversationSchema.parse(conversation);

				// 將 conversation 儲存到資料庫並獲取參考
				const conversationRef = await adminDb
					.collection('sessions')
					.doc(sessionId)
					.collection('groups')
					.doc(groupNumber)
					.collection('conversations')
					.add(conversation);

				// 為新建立的 conversation 添加歷史記錄
				await createTestHistory(conversationRef);

				console.log(`已為 ${userId} (組別 ${groupNumber}) 建立測試對話和歷史記錄`);
			}
		}

		console.log('所有測試對話建立成功');
	} catch (error) {
		console.error('建立測試對話時發生錯誤:', error);
	}
}

async function deleteAllConversations() {
	try {
		// 遍歷每個組別
		for (const groupNumber of Object.keys(groupStudents)) {
			// 獲取該組別下所有的對話
			const conversationsSnapshot = await adminDb
				.collection('sessions')
				.doc(sessionId)
				.collection('groups')
				.doc(groupNumber)
				.collection('conversations')
				.get();

			// 刪除每個對話
			const deletePromises = conversationsSnapshot.docs.map(async (doc) => {
				await doc.ref.delete();
				console.log(`已刪除對話: ${doc.id} (組別 ${groupNumber})`);
			});

			// 等待該組別的所有刪除操作完成
			await Promise.all(deletePromises);
			console.log(`組別 ${groupNumber} 的所有對話已刪除`);
		}

		console.log('所有對話刪除成功');
	} catch (error) {
		console.error('刪除對話時發生錯誤:', error);
	}
}

// 如果你想同時執行刪除和創建，可以這樣寫：
async function resetConversations() {
	await deleteAllConversations();
	await createTestConversations();
}

//deleteAllConversations().catch(console.error);
resetConversations().catch(console.error);

// createTestConversations().catch(console.error);
