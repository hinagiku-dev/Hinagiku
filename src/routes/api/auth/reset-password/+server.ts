import { env as publicEnv } from '$env/dynamic/public';
import { adminAuth, adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// 密碼重設請求格式
const ResetPasswordRequestSchema = z.object({
	// 老師重設學生密碼
	classId: z.string().optional(),
	studentId: z.string().optional(), // 學號

	// 學生自己重設密碼
	currentPassword: z.string().optional(),
	newPasswordSelf: z.string().min(6).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// 檢查用戶是否已登入
	if (!locals.user) {
		throw error(401, '需要登入才能重設密碼');
	}

	try {
		// 驗證請求資料
		const body = await request.json();
		const validatedData = ResetPasswordRequestSchema.parse(body);
		const { classId, studentId, currentPassword, newPasswordSelf } = validatedData;

		const userUid = locals.user.uid;

		// 情況1: 老師為學生重設密碼
		if (classId && studentId) {
			return await handleTeacherResetStudentPassword(userUid, classId, studentId);
		}

		// 情況2: 學生自己重設密碼
		if (currentPassword && newPasswordSelf) {
			return await handleStudentResetOwnPassword(userUid, currentPassword, newPasswordSelf);
		}

		// 無效的請求參數
		throw error(400, '請求參數不正確。請提供有效的重設密碼參數。');
	} catch (err: unknown) {
		console.error('密碼重設時發生錯誤:', err);

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
			let errorMessage = '重設密碼時發生錯誤';
			switch (err.code) {
				case 'auth/user-not-found':
					errorMessage = '找不到此用戶';
					break;
				case 'auth/weak-password':
					errorMessage = '密碼強度不足，請使用至少6個字符的密碼';
					break;
				case 'auth/invalid-password':
					errorMessage = '原密碼不正確';
					break;
				default:
					errorMessage = `Firebase 錯誤: ${err.code}`;
			}
			throw error(400, errorMessage);
		}

		throw error(500, '重設密碼失敗，請稍後再試');
	}
};

// 老師為學生重設密碼
async function handleTeacherResetStudentPassword(
	teacherUid: string,
	classId: string,
	studentId: string
) {
	// 1. 檢查班級是否存在且用戶是該班級的老師
	const classRef = adminDb.collection('classes').doc(classId);
	const classDoc = await classRef.get();

	if (!classDoc.exists) {
		throw error(404, `找不到 ID 為 '${classId}' 的班級`);
	}

	const classData = classDoc.data();
	if (classData?.teacherId !== teacherUid) {
		throw error(403, '您沒有權限為此班級的學生重設密碼');
	}

	// 2. 獲取班級代碼來構建學生的電子郵件
	const classCode = classData.code;
	if (!classCode) {
		throw error(500, '班級代碼不存在，無法重設學生密碼');
	}

	// 3. 構建學生的電子郵件地址
	const studentEmail = `${studentId}@${classCode}.hinagiku.dev`;

	try {
		// 4. 通過電子郵件查找用戶
		const userRecord = await adminAuth.getUserByEmail(studentEmail);

		// 5. 檢查該學生是否屬於這個班級
		if (!classData.students || !classData.students.includes(userRecord.uid)) {
			throw error(403, '該學生不屬於此班級');
		}

		// 6. 更新學生密碼
		await adminAuth.updateUser(userRecord.uid, {
			password: studentId
		});

		return json({
			success: true,
			message: `成功重設學生 ${studentId} 的密碼`,
			studentId: studentId,
			email: studentEmail
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'code' in err) {
			switch (err.code) {
				case 'auth/user-not-found':
					throw error(404, `找不到學號為 '${studentId}' 的學生`);
				case 'auth/weak-password':
					throw error(400, '密碼強度不足，請使用至少6個字符的密碼');
				default:
					console.error('Firebase 錯誤:', err);
					throw error(500, `重設學生密碼失敗: ${err.code}`);
			}
		}
		throw err;
	}
}

// 學生自己重設密碼
async function handleStudentResetOwnPassword(
	userUid: string,
	currentPassword: string,
	newPassword: string
) {
	try {
		// 1. 獲取用戶的當前資料
		const userRecord = await adminAuth.getUser(userUid);

		if (!userRecord.email) {
			throw error(400, '用戶沒有電子郵件地址，無法重設密碼');
		}

		// 2. 驗證當前密碼
		const isPasswordValid = await verifyUserPassword(userRecord.email, currentPassword);
		if (!isPasswordValid) {
			throw error(400, '當前密碼不正確');
		}

		// 3. 更新密碼
		await adminAuth.updateUser(userUid, {
			password: newPassword
		});

		return json({
			success: true,
			message: '密碼重設成功',
			email: userRecord.email
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'code' in err) {
			switch (err.code) {
				case 'auth/user-not-found':
					throw error(404, '找不到用戶');
				case 'auth/weak-password':
					throw error(400, '密碼強度不足，請使用至少6個字符的密碼');
				default:
					console.error('Firebase 錯誤:', err);
					throw error(500, `重設密碼失敗: ${err.code}`);
			}
		}
		throw err;
	}
}

// 使用 Firebase Auth REST API 驗證用戶密碼
async function verifyUserPassword(email: string, password: string): Promise<boolean> {
	try {
		// Firebase Auth REST API 端點
		const apiKey = publicEnv.PUBLIC_FIREBASE_API_KEY;
		if (!apiKey) {
			console.error('Firebase API Key 未設定');
			return false;
		}

		const response = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					password,
					returnSecureToken: true
				})
			}
		);

		// 如果登入成功，表示密碼正確
		return response.ok;
	} catch (error) {
		console.error('驗證密碼時發生錯誤:', error);
		return false;
	}
}
