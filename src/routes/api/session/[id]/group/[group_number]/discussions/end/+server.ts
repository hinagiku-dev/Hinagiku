import { adminDb } from '$lib/server/firebase';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, '未經授權');
	}

	if (!params.id || !params.group_number) {
		throw error(400, '缺少參數');
	}

	try {
		const groupRef = adminDb
			.collection('sessions')
			.doc(params.id)
			.collection('groups')
			.doc(params.group_number);

		await groupRef.update({
			status: 'end'
		});

		return json({ status: 'success' });
	} catch (e) {
		console.error('Error ending group summarize phase:', e);
		return json({ error: '無法結束群組總結階段' }, { status: 500 });
	}
};
