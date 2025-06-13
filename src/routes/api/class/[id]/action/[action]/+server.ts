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

		if (!action || !['update', 'delete', 'archive', 'unarchive'].includes(action)) {
			return json(
				{ error: 'Invalid action. Must be "update" , "delete" , "archive" or "unarchive"' },
				{ status: 400 }
			);
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
		} else if (action === 'archive') {
			return await handleArchive(classId);
		} else if (action === 'unarchive') {
			return await handleUnarchive(classId);
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

async function handleArchive(classId: string) {
	try {
		// Archive class
		await adminDb.collection('classes').doc(classId).update({ active_status: 'archived' });

		return json({
			success: true,
			message: 'Class archived successfully'
		});
	} catch (error) {
		console.error('Error archiving class:', error);
		return json({ error: 'Failed to archive class' }, { status: 500 });
	}
}

async function handleUnarchive(classId: string) {
	try {
		// Unarchive class
		await adminDb.collection('classes').doc(classId).update({ active_status: 'active' });
		return json({
			success: true,
			message: 'Class unarchived successfully'
		});
	} catch (error) {
		console.error('Error unarchiving class:', error);
		return json({ error: 'Failed to unarchive class' }, { status: 500 });
	}
}

async function handleDelete(classId: string) {
	try {
		// Unarchive class
		await adminDb.collection('classes').doc(classId).update({ active_status: 'deleted' });
		return json({
			success: true,
			message: 'Class deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting class:', error);
		return json({ error: 'Failed to delete class' }, { status: 500 });
	}
}
