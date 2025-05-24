import { deploymentConfig } from '$lib/config/deployment';
import * as m from '$lib/paraglide/messages.js';
import { TemplateSchema, type Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const i18nServerCfg = { languageTag: deploymentConfig.defaultLanguage };

		const data = await request.json();
		const template: Template = {
			title: m.defaultTemplateTitle({}, i18nServerCfg),
			task: m.defaultTemplateTask({}, i18nServerCfg),
			subtasks: [
				m.defaultTemplateSubtask1({}, i18nServerCfg),
				m.defaultTemplateSubtask2({}, i18nServerCfg),
				m.defaultTemplateSubtask3({}, i18nServerCfg),
				m.defaultTemplateSubtask4({}, i18nServerCfg)
			],
			public: data.public ?? false,
			owner: locals.user.uid,
			labels: [],
			resources: [],
			backgroundImage: null,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		};

		const result = TemplateSchema.safeParse(template);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		const templateRef = adminDb.collection('templates').doc();
		await templateRef.set(result.data);

		return json({ id: templateRef.id });
	} catch (error) {
		console.error('Error creating template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
