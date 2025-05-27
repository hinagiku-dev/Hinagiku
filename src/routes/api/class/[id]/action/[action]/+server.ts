import { adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const classId = params.id;
		const action = params.action;

		if (!classId) {
			return json({ error: 'Class ID is required' }, { status: 400 });
		}

		if (!action || !['update', 'delete'].includes(action)) {
			return json({ error: 'Invalid action. Must be "update" or "delete"' }, { status: 400 });
		}

		// Check if class exists and user is the teacher
		const classRef = adminDb.collection('classes').doc(classId);
		const classSnapshot = await classRef.get();

		if (!classSnapshot.exists) {
			return json({ error: 'Class not found' }, { status: 404 });
		}

		const classData = classSnapshot.data();
		if (!classData || classData.teacherId !== locals.user.uid) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		if (action === 'update') {
			return await handleUpdate(request, classRef);
		} else if (action === 'delete') {
			return await handleDelete(classId);
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error(`Error performing ${params.action} on class:`, error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

async function handleUpdate(request: Request, classRef: FirebaseFirestore.DocumentReference) {
	try {
		const { schoolName, academicYear, className } = await request.json();

		// Validate input
		if (!schoolName?.trim() || !academicYear?.trim() || !className?.trim()) {
			return json({ error: 'All fields are required' }, { status: 400 });
		}

		// Update class data
		const updateData = {
			schoolName: schoolName.trim(),
			academicYear: academicYear.trim(),
			className: className.trim(),
			updatedAt: new Date()
		};

		await classRef.update(updateData);

		return json({
			success: true,
			message: 'Class updated successfully'
		});
	} catch (error) {
		console.error('Error updating class:', error);
		return json({ error: 'Failed to update class' }, { status: 500 });
	}
}

async function handleDelete(classId: string) {
	try {
		// Check if there are any sessions associated with this class
		const sessionsSnapshot = await adminDb
			.collection('sessions')
			.where('classId', '==', classId)
			.get();

		if (!sessionsSnapshot.empty) {
			return json(
				{
					error: '無法刪除班級，因為還有相關的討論活動。請先刪除所有相關討論活動。'
				},
				{ status: 400 }
			);
		}

		// Delete the class
		await adminDb.collection('classes').doc(classId).delete();

		return json({
			success: true,
			message: 'Class deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting class:', error);
		return json({ error: 'Failed to delete class' }, { status: 500 });
	}
}
