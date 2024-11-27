import { db } from '$lib/firebase';
import type { Template } from '$lib/schema/template';
import { error } from '@sveltejs/kit';
import type { Timestamp } from 'firebase-admin/firestore';
import { doc, getDoc } from 'firebase/firestore';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const templateDoc = await getDoc(doc(db, 'templates', params.id));

	if (!templateDoc.exists()) {
		throw error(404, 'Template not found');
	}

	const template = templateDoc.data() as Template;

	if (!template.public) {
		throw error(403, 'This template is private');
	}

	return {
		template: {
			id: templateDoc.id,
			...template,
			resources: template.resources.map((r) => ({ ...r, createdAt: null })),
			createdAt: (template.createdAt as Timestamp).toDate(),
			updatedAt: (template.updatedAt as Timestamp).toDate()
		}
	};
};
