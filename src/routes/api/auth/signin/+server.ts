import { adminAuth, adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken } = await request.json();

	try {
		// Create session cookie
		const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
		const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

		// Set cookie options
		cookies.set('session', sessionCookie, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: expiresIn / 1000 // Convert from milliseconds to seconds
		});

		// Check and create profile if needed
		const decodedToken = await adminAuth.verifyIdToken(idToken);
		const uid = decodedToken.uid;

		const profileRef = adminDb.collection('profiles').doc(uid);
		const profile = await profileRef.get();

		if (!profile.exists) {
			const user = await adminAuth.getUser(uid);
			const defaultProfile = {
				uid,
				displayName: user.displayName || 'User',
				email: user.email || '',
				title: 'Title',
				bio: 'Bio',
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp()
			};

			await profileRef.set(defaultProfile);
		}

		return json({ status: 'success' });
	} catch (error) {
		console.error('Error during sign in:', error);
		return json({ status: 'error', message: 'Unauthorized request' }, { status: 401 });
	}
};
