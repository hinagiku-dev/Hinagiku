import { ClassSchema, type Class } from '$lib/schema/class';
import { adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 檢查用戶是否已登入
	if (!locals.user) {
		throw error(401, '需要登入才能創建班級');
	}

	try {
		const body = await request.json();

		// 生成唯一的班級代碼（6位數字或字母組合）
		const generateClassCode = (): string => {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let result = '';
			for (let i = 0; i < 6; i++) {
				result += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return result;
		};

		let classCode: string;
		let isCodeUnique = false;

		// 確保班級代碼是唯一的
		while (!isCodeUnique) {
			classCode = generateClassCode();
			const existingClass = await adminDb
				.collection('classes')
				.where('code', '==', classCode)
				.limit(1)
				.get();

			if (existingClass.empty) {
				isCodeUnique = true;
			}
		}

		const now = FieldValue.serverTimestamp();

		// 準備班級資料
		const classData = {
			code: classCode!,
			teacherId: locals.user.uid,
			schoolName: body.schoolName,
			academicYear: body.academicYear,
			className: body.className,
			students: [],
			groups: [],
			createdAt: now,
			updatedAt: now
		};

		// 驗證資料格式
		ClassSchema.parse({
			...classData,
			createdAt: new Date(), // 用於驗證，實際儲存時會用 FieldValue.serverTimestamp()
			updatedAt: new Date()
		});

		// 儲存到 Firebase
		const classRef = adminDb.collection('classes').doc();
		await classRef.set(classData);

		// 讀取伺服器生成的時間戳
		const savedClassDoc = await classRef.get();
		const serverTimestamps = savedClassDoc.exists ? savedClassDoc.data() : {};

		// 回傳創建的班級資料（包含 ID）
		const createdClass = {
			id: classRef.id,
			...classData,
			createdAt: serverTimestamps.createdAt,
			updatedAt: serverTimestamps.updatedAt
		};

		return json(createdClass, { status: 201 });
	} catch (err: unknown) {
		console.error('創建班級時發生錯誤:', err);

		// 處理 Zod 驗證錯誤
		if (err && typeof err === 'object' && 'issues' in err) {
			return json({ error: '資料格式不正確', details: err }, { status: 400 });
		}

		// 處理 Firebase 錯誤
		if (err && typeof err === 'object' && 'code' in err) {
			if (err.code === 'PERMISSION_DENIED') {
				throw error(403, '沒有創建班級的權限');
			}
		}

		throw error(500, '創建班級失敗，請檢查伺服器日誌');
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	// 檢查用戶是否已登入
	if (!locals.user) {
		throw error(401, '需要登入才能查看班級列表');
	}

	try {
		// 查詢該用戶創建的所有班級
		const classesRef = adminDb.collection('classes');
		const snapshot = await classesRef
			.where('teacherId', '==', locals.user.uid)
			.orderBy('createdAt', 'desc')
			.get();

		const classes: (Class & { id: string })[] = [];
		snapshot.forEach((doc) => {
			const data = doc.data() as Class;
			classes.push({
				id: doc.id,
				...data
			});
		});

		return json(classes, { status: 200 });
	} catch (err: unknown) {
		console.error('獲取班級列表時發生錯誤:', err);

		// 處理 Firebase 權限錯誤
		if (err && typeof err === 'object' && 'code' in err && err.code === 'PERMISSION_DENIED') {
			throw error(403, '沒有查看班級列表的權限');
		}

		throw error(500, '獲取班級列表失敗，請檢查伺服器日誌');
	}
};
