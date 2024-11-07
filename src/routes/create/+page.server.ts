import { adminDb } from '$lib/server/firebase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { title, missing: true });
		}

		// Process resources
		const resources: Record<string, { type: string; content: string; addedAt: Date }> = {};
		let i = 0;
		while (data.has(`resourceType${i}`)) {
			const type = data.get(`resourceType${i}`)?.toString();
			const content = data.get(`resourceContent${i}`)?.toString();

			if (type && content) {
				resources[`resource${i}`] = {
					type: type as 'text' | 'link',
					content,
					addedAt: new Date()
				};
			}
			i++;
		}

		const sessionRef = adminDb.collection('sessions').doc();

		await sessionRef.set({
			id: sessionRef.id,
			tempId: null,
			tempIdExpiry: null,
			hostId: locals.user.uid,
			hostName: locals.user.name,
			title,
			createdAt: new Date(),
			status: 'draft',
			resources,
			participants: {}
		});

		return { success: true, sessionId: sessionRef.id };
	}
} satisfies Actions;
