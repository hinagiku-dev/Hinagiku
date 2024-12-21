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

async function createTestConversations() {
	try {
		// 為每個組別建立對話
		for (const [groupNumber, students] of Object.entries(groupStudents)) {
			// 為每個學生建立一個對話
			for (const userId of students) {
				// 隨機生成 5 個 true/false 值
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

				// 將 conversation 儲存到資料庫
				await adminDb
					.collection('sessions')
					.doc(sessionId)
					.collection('groups')
					.doc(groupNumber)
					.collection('conversations')
					.add(conversation);

				console.log(`已為 ${userId} (組別 ${groupNumber}) 建立測試對話`);
			}
		}

		console.log('所有測試對話建立成功');
	} catch (error) {
		console.error('建立測試對話時發生錯誤:', error);
	}
}

createTestConversations().catch(console.error);
