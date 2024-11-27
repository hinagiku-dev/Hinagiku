import { SessionSchema, type Session } from '$lib/schema/session';
import { adminDb } from '$lib/server/firebase';
import { fail, redirect } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();

		const formData: Session = {
			title: data.get('title')?.toString() || '',
			host: locals.user.uid,
			status: 'draft',
			participants: [],
			group: {},
			resources: [],
			timing: {
				self: Number(data.get('selfTime')) || 5,
				group: Number(data.get('groupTime')) || 10
			},
			task: data.get('task')?.toString() || '',
			subtasks: [],
			createdAt: Timestamp.now()
		};

		const result = SessionSchema.safeParse(formData);

		if (!result.success) {
			return fail(400, {
				data: formData,
				errors: result.error.flatten().fieldErrors
			});
		}

		const sessionRef = adminDb.collection('sessions').doc();
		await sessionRef.set(result.data);

		throw redirect(303, `/session/${sessionRef.id}`);
	}
} satisfies Actions;
