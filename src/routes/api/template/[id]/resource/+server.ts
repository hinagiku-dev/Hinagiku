import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

import type { Resource } from '$lib/schema/resource';
import { ResourceSchema } from '$lib/schema/resource';
import { adminDb } from '$lib/server/firebase';
import { upload_object } from '$lib/server/object-storage';
import { pdf2Text } from '$lib/server/pdf';

const MAX_RESOURCES = 10;
const PDF_CONTENT_LENGTH_LIMIT = 10000;

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const startTime = Date.now();
	// Authorization check
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Template validation
		const templateValidationStart = Date.now();
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();
		console.log(`Template validation took ${Date.now() - templateValidationStart}ms`);

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		if (template.data()?.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Resource limit check
		const currentResources = template.data()?.resources || [];
		if (currentResources.length >= MAX_RESOURCES) {
			return json({ error: 'Maximum resources limit reached' }, { status: 400 });
		}

		// Process form data
		const formProcessingStart = Date.now();
		const formData = await request.formData();
		const name = formData.get('name') as string;
		let content = formData.get('content') as string | File;
		const type = formData.get('type') as 'text' | 'file';
		let ref: string | null = null;
		console.log(`Form processing took ${Date.now() - formProcessingStart}ms`);

		// Handle file upload
		if (type === 'file') {
			const fileProcessingStart = Date.now();
			const file = content as File;
			const buffer = await file.arrayBuffer();
			let text = await pdf2Text(buffer, env.LLAMA_CLOUD_API_KEY!);
			console.log(`PDF text extraction took ${Date.now() - fileProcessingStart}ms`);

			if (!text) {
				return json({ error: 'Error extracting text from PDF' }, { status: 400 });
			}

			if (text.length > PDF_CONTENT_LENGTH_LIMIT) {
				text = text.slice(0, PDF_CONTENT_LENGTH_LIMIT);
				text += '\n\n... (more contents)';
			}

			const uploadStart = Date.now();
			ref = (await upload_object(Buffer.from(buffer), 'application/pdf')) as string;
			console.log(`File upload took ${Date.now() - uploadStart}ms`);
			content = text;
		}

		// Create and validate new resource
		const newResource: Resource = {
			id: uuidv4(),
			type,
			name,
			content: content as string,
			createdAt: Timestamp.now(),
			ref,
			metadata: {}
		};

		const result = ResourceSchema.safeParse(newResource);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		// Update template
		const updateStart = Date.now();
		await templateRef.update({
			resources: [...currentResources, result.data],
			updatedAt: Timestamp.now()
		});
		console.log(`Template update took ${Date.now() - updateStart}ms`);

		console.log(`Total request processing time: ${Date.now() - startTime}ms`);
		return json({ success: true, resource: result.data });
	} catch (error) {
		console.error('Error adding resource:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
