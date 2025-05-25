import * as m from '$lib/paraglide/messages.js';
import { ClassSchema, type Class } from '$lib/schema/class';
import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: m.unauthorized(locals.paraglide) }, { status: 401 });
	}

	try {
		const { schoolName, academicYear, className } = await request.json();

		// Validate input data
		if (!schoolName?.trim() || !academicYear?.trim() || !className?.trim()) {
			return json({ error: m.createClassRequiredFields(locals.paraglide) }, { status: 400 });
		}

		// Get all existing class codes
		const existingClassesSnapshot = await adminDb.collection('classes').select('code').get();
		const existingCodes = new Set<string>();
		existingClassesSnapshot.forEach((doc) => {
			const data = doc.data();
			if (data.code) {
				existingCodes.add(data.code);
			}
		});

		// Generate unique class code
		const generateUniqueClassCode = (): string => {
			let attempts = 0;
			const maxAttempts = 100;

			while (attempts < maxAttempts) {
				const code = Math.random().toString(36).substring(2, 8).toUpperCase();

				// Check if code already exists in memory
				if (!existingCodes.has(code)) {
					return code;
				}

				attempts++;
			}

			// If we can't generate a unique code after maxAttempts, throw an error
			throw new Error(m.createClassCodeGenerationFailed(locals.paraglide));
		};

		// Create class data
		const classData: Omit<Class, 'updatedAt' | 'createdAt'> = {
			code: generateUniqueClassCode(),
			teacherId: locals.user.uid,
			schoolName: schoolName.trim(),
			academicYear: academicYear.trim(),
			className: className.trim(),
			students: [],
			groups: []
		};

		// Validate against schema
		const result = ClassSchema.safeParse({
			...classData,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		});

		if (!result.success) {
			return json({ error: result.error.flatten() }, { status: 400 });
		}

		// Save to database
		const classRef = adminDb.collection('classes').doc();
		await classRef.set(result.data);

		return json({
			success: true,
			classId: classRef.id,
			classData: result.data
		});
	} catch (error) {
		console.error('Error creating class:', error);
		const errorMessage =
			error instanceof Error ? error.message : m.createClassInternalError(locals.paraglide);
		return json({ error: errorMessage }, { status: 500 });
	}
};
