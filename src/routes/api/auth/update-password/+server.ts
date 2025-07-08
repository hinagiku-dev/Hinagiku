/**
 * @fileoverview
 * Password update API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles two types of password reset operations:
 * 1. Teacher-initiated password reset for students in their classes
 * 2. Student self-service password changes with current password verification
 * 
 * Features:
 * - Secure password validation using Firebase Auth REST API
 * - Role-based access control (teachers can reset student passwords)
 * - Automatic password change requirement flags for security
 * - Comprehensive error handling for various authentication scenarios
 * - Session invalidation after password changes
 * 
 * Security measures:
 * - Validates teacher ownership of classes before student password resets
 * - Verifies current passwords before allowing changes
 * - Enforces minimum password requirements (6+ characters)
 * - Sets security flags requiring password changes when reset by teachers
 * 
 * @route POST /api/auth/update-password
 * @param {string} [classId] - Class ID for teacher-initiated resets
 * @param {string} [studentId] - Student ID for teacher-initiated resets  
 * @param {string} newPassword - New password (minimum 6 characters)
 * @param {string} [currentPassword] - Current password for self-service changes
 * @returns {Object} Success status with operation details or error message
 */

import { env as publicEnv } from '$env/dynamic/public';
import { adminAuth, adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

/**
 * Schema for password reset request validation.
 * Supports both teacher-initiated and self-service password changes.
 */
const ResetPasswordRequestSchema = z.object({
	/** Class ID for teacher-initiated student password resets */
	classId: z.string().optional(),
	/** Student ID for teacher-initiated password resets */
	studentId: z.string().optional(),
	/** New password with minimum 6 character requirement */
	newPassword: z.string().min(6),
	/** Current password for self-service password changes */
	currentPassword: z.string().optional()
});

/**
 * Handles password update requests for both teachers and students.
 * 
 * Processes two distinct workflows:
 * - Teachers resetting passwords for students in their classes
 * - Students changing their own passwords with current password verification
 * 
 * @param request - SvelteKit request containing password update data
 * @param locals - SvelteKit locals containing authenticated user context
 * @param cookies - SvelteKit cookies interface for session management
 * @returns JSON response with success status or error details
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Verify user authentication
	if (!locals.user) {
		throw error(401, '需要登入才能重設密碼');
	}

	try {
		// Validate request data
		const body = await request.json();
		const validatedData = ResetPasswordRequestSchema.parse(body);
		const { classId, studentId, currentPassword, newPassword } = validatedData;

		const userUid = locals.user.uid;

		// Scenario 1: Teacher resetting student password
		if (classId && studentId && newPassword) {
			return await handleTeacherResetStudentPassword(userUid, classId, studentId, newPassword);
		}

		// Scenario 2: Student self-service password change
		if (currentPassword && newPassword) {
			const res = await handleStudentResetOwnPassword(userUid, currentPassword, newPassword);
			cookies.delete('session', { path: '/' }); // Force re-authentication
			return res;
		}

		// Invalid request parameters
		throw error(400, '請求參數不正確。請提供有效的重設密碼參數。');
	} catch (err: unknown) {
		console.error('密碼重設時發生錯誤:', err);

		// Handle Zod validation errors
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

		// Handle SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle Firebase errors
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

/**
 * Handles teacher-initiated password reset for students in their classes.
 * 
 * Validates teacher permissions, constructs student email from class code,
 * and updates the student's password while setting security flags.
 * 
 * @param teacherUid - Teacher's Firebase UID
 * @param classId - Class ID to validate teacher ownership
 * @param studentId - Student ID for password reset
 * @param newPassword - New password to set (defaults to studentId)
 * @returns JSON response with success status and student details
 */
async function handleTeacherResetStudentPassword(
	teacherUid: string,
	classId: string,
	studentId: string,
	newPassword: string = studentId
) {
	// 1. Verify class exists and user is the teacher
	const classRef = adminDb.collection('classes').doc(classId);
	const classDoc = await classRef.get();

	if (!classDoc.exists) {
		throw error(404, `找不到 ID 為 '${classId}' 的班級`);
	}

	const classData = classDoc.data();
	if (classData?.teacherId !== teacherUid) {
		throw error(403, '您沒有權限為此班級的學生重設密碼');
	}

	// 2. Get class code to construct student email
	const classCode = classData.code;
	if (!classCode) {
		throw error(500, '班級代碼不存在，無法重設學生密碼');
	}

	// 3. Construct student email address
	const studentEmail = `${studentId}@${classCode}.student-account.hinagiku.dev`;

	try {
		// 4. Find user by email
		const userRecord = await adminAuth.getUserByEmail(studentEmail);

		// 5. Verify student belongs to this class
		if (!classData.students || !classData.students.includes(userRecord.uid)) {
			throw error(403, '該學生不屬於此班級');
		}

		// 6. Update student password
		await adminAuth.updateUser(userRecord.uid, {
			password: newPassword
		});
		
		// Force password change on next login for security
		await adminAuth.setCustomUserClaims(userRecord.uid, {
			requiresPasswordChange: true
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

/**
 * Handles student self-service password changes with current password verification.
 * 
 * Verifies the current password using Firebase Auth REST API before allowing
 * the password change, ensuring security for self-service operations.
 * 
 * @param userUid - Student's Firebase UID
 * @param currentPassword - Current password for verification
 * @param newPassword - New password to set
 * @returns JSON response with success status and user email
 */
async function handleStudentResetOwnPassword(
	userUid: string,
	currentPassword: string,
	newPassword: string
) {
	try {
		// 1. Get current user data
		const userRecord = await adminAuth.getUser(userUid);

		if (!userRecord.email) {
			throw error(400, '用戶沒有電子郵件地址，無法重設密碼');
		}

		// 2. Verify current password
		const isPasswordValid = await verifyUserPassword(userRecord.email, currentPassword);
		if (!isPasswordValid) {
			throw error(400, '當前密碼不正確');
		}

		// 3. Update password
		await adminAuth.updateUser(userUid, {
			password: newPassword
		});

		// Clear password change requirement flag
		await adminAuth.setCustomUserClaims(userUid, {
			requiresPasswordChange: false
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

/**
 * Verifies user password using Firebase Auth REST API.
 * 
 * Uses the Firebase Authentication REST API to validate credentials
 * without maintaining long-lived tokens or sessions.
 * 
 * @param email - User's email address
 * @param password - Password to verify
 * @returns Promise resolving to true if password is valid, false otherwise
 */
async function verifyUserPassword(email: string, password: string): Promise<boolean> {
	try {
		// Firebase Auth REST API endpoint
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

		// Successful login indicates correct password
		return response.ok;
	} catch (error) {
		console.error('驗證密碼時發生錯誤:', error);
		return false;
	}
}
