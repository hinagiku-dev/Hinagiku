import { adminDb } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';

export async function POST({ params, locals }) {
	if (!locals.user) {
		throw error(401, '未經授權');
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
		throw error(500, '無法結束群組總結階段');
	}
}
