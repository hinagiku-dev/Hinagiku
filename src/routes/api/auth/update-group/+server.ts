import { StudentSchema } from '$lib/schema/class';
import { adminDb } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// Group update request schema
const UpdateGroupRequestSchema = z.object({
	classId: z.string(),
	studentId: z.string(),
	groupsData: z.array(StudentSchema)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check if user is logged in
	if (!locals.user) {
		throw error(401, 'Authentication required to update group');
	}

	try {
		// Validate request data
		const body = await request.json();
		const validatedData = UpdateGroupRequestSchema.parse(body);
		const { classId, studentId, groupsData } = validatedData;

		const userUid = locals.user.uid;

		return await handleTeacherUpdateStudentGroup(userUid, classId, studentId, groupsData);
	} catch (err: unknown) {
		console.error('Error updating group:', err);

		// Handle Zod validation errors
		if (err && typeof err === 'object' && 'issues' in err) {
			return json(
				{
					success: false,
					error: 'Invalid data format',
					details: err
				},
				{ status: 400 }
			);
		}

		// Handle SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to update group, please try again');
	}
};

// Teacher updates student group
async function handleTeacherUpdateStudentGroup(
	teacherUid: string,
	classId: string,
	studentUid: string,
	groupsData: z.infer<typeof StudentSchema>[]
) {
	// 1. Check if class exists and user is the teacher of this class
	const classRef = adminDb.collection('classes').doc(classId);
	const classDoc = await classRef.get();

	if (!classDoc.exists) {
		throw error(404, `Class with ID '${classId}' not found`);
	}

	const classData = classDoc.data();
	if (classData?.teacherId !== teacherUid) {
		throw error(403, 'You do not have permission to update groups in this class');
	}

	// 2. Check if student belongs to this class
	if (!classData.students || !classData.students.includes(studentUid)) {
		throw error(403, 'Student does not belong to this class');
	}

	try {
		// 3. Create UID to student data mapping by fetching profiles
		const studentUidToDataMap = new Map<string, z.infer<typeof StudentSchema>>();

		// For each UID in class, find corresponding student data from groupsData
		for (const uid of classData.students) {
			try {
				// Get profile data to match with groupsData
				const profileRef = adminDb.collection('profiles').doc(uid);
				const profileDoc = await profileRef.get();

				if (profileDoc.exists) {
					const profileData = profileDoc.data();
					// Find matching student in groupsData by studentId
					const matchingStudent = groupsData.find((s) => s.studentId === profileData?.studentId);
					if (matchingStudent) {
						studentUidToDataMap.set(uid, matchingStudent);
					}
				}
			} catch (err) {
				console.warn(`Failed to get profile for UID ${uid}:`, err);
			}
		}

		// Extract the new group value for the target student
		const targetStudentData = studentUidToDataMap.get(studentUid);
		if (!targetStudentData) {
			throw error(400, 'Target student not found in the provided data');
		}
		const newGroup = targetStudentData.group; // Allow null/empty for "no group"

		// 4. Reconstruct groups following the exact pattern from import-student
		const studentGroupMap = new Map<string, number>();

		// Build student to group mapping from the updated groupsData
		studentUidToDataMap.forEach((studentData, uid) => {
			if (studentData.group) {
				const groupNumber = parseInt(studentData.group);
				if (!isNaN(groupNumber) && groupNumber > 0) {
					studentGroupMap.set(uid, groupNumber);
				}
			}
		});

		// Clear all existing groups and rebuild (following import-student pattern)
		const newGroups: { number: number; students: string[] }[] = [];

		// Group students by their group numbers
		studentGroupMap.forEach((groupNumber, studentUid) => {
			// Find existing group or create new one
			const existingGroupIndex = newGroups.findIndex((g) => g.number === groupNumber);

			if (existingGroupIndex >= 0) {
				// Group exists, add student to it
				if (!newGroups[existingGroupIndex].students.includes(studentUid)) {
					newGroups[existingGroupIndex].students.push(studentUid);
				}
			} else {
				// Group doesn't exist, create new group
				newGroups.push({
					number: groupNumber,
					students: [studentUid]
				});
			}
		});

		// Sort groups by number (following import-student pattern)
		newGroups.sort((a, b) => a.number - b.number);

		// Update the class document
		await classRef.update({
			groups: newGroups,
			updatedAt: FieldValue.serverTimestamp()
		});

		return json({
			success: true,
			message: `Successfully updated group for student`,
			studentId: studentUid,
			newGroup: newGroup,
			totalGroups: newGroups.length
		});
	} catch (err) {
		console.error('Database update error:', err);
		throw error(500, `Failed to update student group: ${err}`);
	}
}
