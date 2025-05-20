import { randomUUID } from 'crypto';
import type { Class } from '../../src/lib/schema/class';
import { adminDb } from '../../src/lib/server/firebase';

// Generate mock class data
export const generateMockClass = async (): Promise<Class> => {
	// Query real student UIDs from Firebase profiles collection
	const profilesRef = adminDb.collection('profiles');
	const profilesSnapshot = await profilesRef.limit(20).get();

	if (profilesSnapshot.empty) {
		throw new Error('No student profiles found in Firebase');
	}

	// Extract UIDs from profiles
	const studentUids = profilesSnapshot.docs.map((doc) => doc.id);

	// Make sure we have at least 5 students
	if (studentUids.length < 5) {
		throw new Error('Not enough student profiles found (minimum 5 required)');
	}

	// Generate random groups from students
	const groups = [
		{
			number: 1,
			students: [studentUids[6], studentUids[7]]
		},
		{
			number: 2,
			students: studentUids.slice(8, 10)
		}
	];

	// Create timestamp compatible with schema
	const timestamp = {
		seconds: Math.floor(Date.now() / 1000),
		nanoseconds: 0
	};

	// Create the mock class
	const mockClass: Class = {
		id: randomUUID(),
		code: Math.random().toString(36).substring(2, 8).toUpperCase(),
		teacherId: 'SEAiEhG9HKQRyJHsddh7jRz1NQa2', // As specified by the user
		schoolName: 'Demo School',
		academicYear: '113',
		className: '102',
		students: studentUids,
		groups: groups,
		updatedAt: timestamp,
		createdAt: timestamp
	};

	return mockClass;
};

// Save the mock class to Firebase
export const saveClassToFirebase = async (classData: Class): Promise<void> => {
	try {
		// Save to classes collection with the generated ID
		await adminDb.collection('classes').doc(classData.id).set(classData);
		console.log(`Mock class saved to Firebase with ID: ${classData.id}`);
	} catch (error) {
		console.error('Error saving mock class to Firebase:', error);
		throw error;
	}
};

// Generate and save mock class
const main = async () => {
	try {
		const mockClass = await generateMockClass();
		console.log(JSON.stringify(mockClass, null, 2));

		// Save to Firebase
		await saveClassToFirebase(mockClass);
	} catch (error) {
		console.error('Failed to generate or save mock class:', error);
	}
};

main();
