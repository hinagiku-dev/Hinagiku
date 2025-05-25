import { ProfileSchema, type Profile } from '$lib/schema/profile';
import { adminAuth, adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// 學生資料格式
const StudentSchema = z.object({
	displayName: z.string().min(1).max(100),
	studentId: z.string().min(1).max(20).describe('學號'),
	title: z.string().max(100).nullable().optional(),
	bio: z.string().max(1000).nullable().optional()
});

const CreateStudentsRequestSchema = z.object({
	students: z.array(StudentSchema).min(1).max(50)
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { classId } = params;

	if (!classId) {
		throw error(400, '需要提供班級 ID');
	}

	// 檢查用戶是否已登入
	if (!locals.user) {
		throw error(401, '需要登入才能創建學生帳號');
	}

	try {
		// 驗證請求資料
		const body = await request.json();
		const validatedData = CreateStudentsRequestSchema.parse(body);
		const { students } = validatedData;

		// 檢查班級是否存在且用戶有權限
		const classRef = adminDb.collection('classes').doc(classId);
		const classDoc = await classRef.get();

		if (!classDoc.exists) {
			throw error(404, `找不到 ID 為 '${classId}' 的班級`);
		}

		const classData = classDoc.data();
		if (classData?.teacherId !== locals.user.uid) {
			throw error(403, '您沒有權限為此班級創建學生帳號');
		}

		// 獲取班級代碼用於生成電子郵件
		const classCode = classData.code;
		if (!classCode) {
			throw error(500, '班級代碼不存在，無法創建學生帳號');
		}

		// 批量創建學生帳號
		const batch = adminDb.batch();
		const now = FieldValue.serverTimestamp();

		// 並行處理所有學生帳號創建
		const studentPromises = students.map(async (student) => {
			const email = `${student.studentId}@${classCode}.hinagiku.dev`;

			try {
				// 1. 在 Firebase Auth 中創建用戶
				const userRecord = await adminAuth.createUser({
					email: email,
					password: student.studentId,
					displayName: student.displayName,
					emailVerified: true // 預設為已驗證
				});

				// 2. 準備 Profile 資料
				const profileData: Omit<Profile, 'createdAt' | 'updatedAt'> = {
					uid: userRecord.uid,
					displayName: student.displayName,
					title: student.title || null,
					bio: student.bio || null
				};

				// 驗證 Profile 資料格式
				ProfileSchema.omit({ createdAt: true, updatedAt: true }).parse(profileData);

				// 3. 添加到 batch 操作
				const profileRef = adminDb.collection('profiles').doc(userRecord.uid);
				batch.set(profileRef, {
					...profileData,
					createdAt: now,
					updatedAt: now
				});

				return {
					uid: userRecord.uid,
					email: email,
					studentId: student.studentId,
					displayName: student.displayName,
					success: true
				};
			} catch (err) {
				console.error(`創建學生帳號失敗 (${email}):`, err);

				let errorMessage = '創建帳號時發生未知錯誤';
				if (err && typeof err === 'object' && 'code' in err) {
					switch (err.code) {
						case 'auth/email-already-exists':
							errorMessage = '此學號已被使用';
							break;
						case 'auth/invalid-email':
							errorMessage = '學號格式不正確';
							break;
						case 'auth/weak-password':
							errorMessage = '密碼強度不足';
							break;
						default:
							errorMessage = `Firebase 錯誤: ${err.code}`;
					}
				}

				return {
					uid: '',
					email: email,
					studentId: student.studentId,
					displayName: student.displayName,
					success: false,
					error: errorMessage
				};
			}
		});

		// 等待所有學生帳號創建完成
		const createdStudents = await Promise.all(studentPromises);

		// 執行批量寫入操作
		try {
			// 只有當有成功創建的學生時才執行 batch
			const hasSuccessfulStudents = createdStudents.some((student) => student.success);
			if (hasSuccessfulStudents) {
				await batch.commit();
				console.log('批量寫入 Profile 資料完成');
			}
		} catch (err) {
			console.error('批量寫入 Profile 資料失敗:', err);
			throw error(500, '儲存學生資料失敗');
		}

		// 4. 將成功創建的學生添加到班級中
		const successfulStudentUids = createdStudents
			.filter((student) => student.success)
			.map((student) => student.uid);

		if (successfulStudentUids.length > 0) {
			try {
				await classRef.update({
					students: FieldValue.arrayUnion(...successfulStudentUids),
					updatedAt: now
				});
				console.log(`已將 ${successfulStudentUids.length} 位學生添加到班級`);
			} catch (err) {
				console.error('添加學生到班級失敗:', err);
				// 這個錯誤不會中斷流程，因為學生帳號已經創建成功
			}
		}

		// 統計結果
		const successCount = createdStudents.filter((s) => s.success).length;
		const failureCount = createdStudents.filter((s) => !s.success).length;

		return json(
			{
				success: true,
				message: `成功創建 ${successCount} 個學生帳號${failureCount > 0 ? `，${failureCount} 個失敗` : ''}`,
				results: createdStudents,
				summary: {
					total: students.length,
					successful: successCount,
					failed: failureCount
				}
			},
			{ status: 201 }
		);
	} catch (err: unknown) {
		console.error('批量創建學生帳號時發生錯誤:', err);

		// 處理 Zod 驗證錯誤
		if (err && typeof err === 'object' && 'issues' in err) {
			return json(
				{
					success: false,
					error: '資料格式不正確',
					details: err
				},
				{ status: 400 }
			);
		}

		// 處理 SvelteKit 錯誤
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// 處理 Firebase 錯誤
		if (err && typeof err === 'object' && 'code' in err) {
			if (err.code === 'PERMISSION_DENIED') {
				throw error(403, '沒有創建學生帳號的權限');
			}
		}

		throw error(500, '批量創建學生帳號失敗，請檢查伺服器日誌');
	}
};
