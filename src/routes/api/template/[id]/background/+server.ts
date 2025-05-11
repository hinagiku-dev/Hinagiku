import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

import type { Template } from '$lib/schema/template';
import { adminDb } from '$lib/server/firebase';
import { upload_object } from '$lib/server/object-storage';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Authorization check
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Template validation
		const templateRef = adminDb.collection('templates').doc(params.id);
		const template = await templateRef.get();

		if (!template.exists) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const templateData = template.data() as Template;
		if (templateData.owner !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Process form data
		const formData = await request.formData();
		const backgroundImage = formData.get('backgroundImage') as File;

		if (!backgroundImage) {
			return json({ error: 'No background image provided' }, { status: 400 });
		}

		// Validate file type
		// Only accept image types that are supported by object-storage.ts
		const validImageMimeTypes = {
			'image/jpeg': 'image/jpeg',
			'image/png': 'image/png',
			'image/gif': 'image/gif',
			'image/webp': 'image/webp'
		} as const;

		if (!(backgroundImage.type in validImageMimeTypes)) {
			return json(
				{
					error: 'Invalid file type. Only JPEG, PNG, GIF, and WEBP are supported'
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const arrayBuffer = await backgroundImage.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to Firebase Storage using the upload_object function
		const imageUrl = await upload_object(
			buffer,
			backgroundImage.type as keyof typeof validImageMimeTypes,
			{
				templateId: params.id,
				fileName: backgroundImage.name,
				uploadedBy: locals.user.uid,
				type: 'template-background'
			}
		);

		// Update template with background image URL
		await templateRef.update({
			backgroundImage: imageUrl,
			updatedAt: Timestamp.now()
		});

		return json({ imageUrl });
	} catch (error) {
		console.error('Error uploading background image:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
