import dotenv from 'dotenv';
dotenv.config();

import { Timestamp } from 'firebase-admin/firestore';
import { GroupSchema } from '../src/lib/schema/group';
import { ProfileSchema } from '../src/lib/schema/profile';
import { adminDb } from '../src/lib/server/firebase'; // 假設有一個 Firebase store 模組

const sessionId = 'HtxeyVYERenrLEjfyo5D';
const numberOfStudents = 40;
const numberOfGroups = 8;

async function createTestStudents() {
	const students: string[] = [];
	for (let i = 0; i < numberOfStudents; i++) {
		const uid = `student${i}`;
		const profile = {
			uid,
			displayName: `Student ${i}`,
			title: null,
			bio: null,
			updatedAt: Timestamp.now(),
			createdAt: Timestamp.now()
		};

		// 驗證 profile 是否符合 schema
		ProfileSchema.parse(profile);

		// 將 profile 儲存到資料庫
		await adminDb.collection('profiles').doc(uid).set(profile);
		students.push(uid);
	}

	// 將學生平均分配到組別中
	const groups = Array.from({ length: numberOfGroups }, (_, i) => ({
		number: i + 1,
		participants: students.slice(
			i * (numberOfStudents / numberOfGroups),
			(i + 1) * (numberOfStudents / numberOfGroups)
		),
		concept: null,
		discussions: [],
		summary: null,
		keywords: {} as Record<string, number>
	}));

	// 驗證每個 group 是否符合 schema 並儲存到資料庫
	for (const group of groups) {
		GroupSchema.parse(group);
		await adminDb.collection('sessions').doc(sessionId).collection('groups').add(group);
	}

	console.log('Test students and groups created successfully.');
}

createTestStudents().catch(console.error);
