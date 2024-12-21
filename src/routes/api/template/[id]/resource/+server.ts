import type { Resource } from '$lib/schema/resource';
import { ResourceSchema } from '$lib/schema/resource';
import { adminDb } from '$lib/server/firebase';
import { pdf2Text } from '$lib/server/pdf';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

// Add resource
export const POST: RequestHandler = async ({ params, request, locals }) => {
	console.log('Adding resource:');
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		if (template.data()?.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		// from form data
		const formData = await request.formData();
		const name = formData.get('name') as string;
		let content = formData.get('content') as string | File;
		const type = formData.get('type') as 'text' | 'file';

		if (type === 'file') {
			console.log('File:', content);
			const file = content as File;
			const buffer = await file.arrayBuffer();
			const text = await pdf2Text(buffer, process.env.LLAMA_CLOUD_API_KEY!);

			if (!text) {
				return json({ error: 'Error extracting text from PDF' }, { status: 400 });
			}
			content = text as string;
			console.log('Extracted text:', text);

			// upload to object storage
			// const fileBuffer = Buffer.from(buffer);
			// upload_object(fileBuffer, "application/pdf");
		} else {
			content = content as string;
		}

		// Create new resource with UUID
		const newResource: Resource = {
			id: uuidv4(),
			type,
			name,
			content,
			createdAt: Timestamp.now(),
			ref: null,
			metadata: {}
		};

		const result = ResourceSchema.safeParse(newResource);
		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		const currentResources = template.data()?.resources || [];
		if (currentResources.length >= 10) {
			return json({ error: 'Maximum resources limit reached' }, { status: 400 });
		}

		await templateRef.update({
			resources: [...currentResources, result.data],
			updatedAt: Timestamp.now()
		});

		return json({ success: true, resource: result.data });
	} catch (error) {
		console.error('Error adding resource:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
