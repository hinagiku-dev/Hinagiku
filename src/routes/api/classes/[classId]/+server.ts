import { type Class } from '$lib/schema/class';
import { adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	const { classId } = params;
	if (!classId) {
		throw error(400, '需要提供班級 ID');
	}

	// 檢查用戶是否已登入
	if (!locals.user) {
		throw error(401, '需要登入才能查看班級資料');
	}

	try {
		const classRef = adminDb.collection('classes').doc(classId);
		const classDoc = await classRef.get();

		if (!classDoc.exists) {
			throw error(404, `找不到 ID 為 '${classId}' 的班級`);
		}

		const classData = classDoc.data() as Class;

		// Convert Firestore Timestamp fields to ISO strings
		const convertTimestamps = (data: Record<string, unknown>): Record<string, unknown> => {
			if (data && typeof data === 'object') {
				for (const key in data) {
					const value = data[key];
					if (
						value &&
						typeof value === 'object' &&
						'toDate' in value &&
						typeof (value as { toDate: () => Date }).toDate === 'function'
					) {
						data[key] = (value as { toDate: () => Date }).toDate().toISOString();
					} else if (typeof value === 'object' && value !== null) {
						data[key] = convertTimestamps(value as Record<string, unknown>);
					}
				}
			}
			return data;
		};

		const sanitizedClassData = convertTimestamps(classData);

		// 檢查用戶是否為該班級的教師
		if (sanitizedClassData.teacherId !== locals.user.uid) {
			throw error(403, '您沒有權限查看此班級資料');
		}

		return json(sanitizedClassData, { status: 200 });
	} catch (err: unknown) {
		console.error(`獲取班級 '${classId}' 時發生錯誤:`, err);

		// 處理 SvelteKit 錯誤
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// 處理 Firebase 權限錯誤
		if (err && typeof err === 'object' && 'code' in err && err.code === 'PERMISSION_DENIED') {
			throw error(403, '沒有讀取班級資料的權限');
		}

		throw error(500, '獲取班級資料失敗，請檢查伺服器日誌');
	}
};
