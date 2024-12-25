import { getGroupsData, getGroupsRef } from '$lib/utils/firestore';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const groupsRef = getGroupsRef(params.id);
		const groups = await getGroupsData(groupsRef);

		// 建立關鍵字頻率統計
		const keywordFrequency: Record<string, number> = {};

		// 遍歷所有群組的關鍵字
		groups.forEach((group) => {
			if (group.keywords) {
				Object.entries(group.keywords).forEach(([, count]) => {
					keywordFrequency[count] = (keywordFrequency[count] || 0) + 1;
				});
			}
		});

		return json(keywordFrequency);
	} catch (err) {
		console.error('Error fetching data:', err);
		throw error(500, '無法獲取資料');
	}
};
