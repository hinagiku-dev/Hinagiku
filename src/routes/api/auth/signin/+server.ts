/**
 * @fileoverview
 * Authentication sign-in API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles user authentication through Firebase ID tokens and manages
 * secure session creation. It performs the following operations:
 * - Validates Firebase ID tokens from client authentication
 * - Creates secure HTTP-only session cookies with 5-day expiration
 * - Automatically provisions user profiles for new accounts
 * - Maintains user authentication state across browser sessions
 * 
 * The endpoint ensures security through:
 * - HttpOnly cookies to prevent XSS attacks
 * - Secure flag for HTTPS-only transmission
 * - Strict SameSite policy for CSRF protection
 * - Server-side token verification through Firebase Admin SDK
 * 
 * @route POST /api/auth/signin
 * @param {string} idToken - Firebase ID token from client authentication
 * @returns {Object} Success status or error message with appropriate HTTP status
 */

import { adminAuth, adminDb } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

/**
 * Handles user sign-in authentication and session management.
 * 
 * Creates secure session cookies from Firebase ID tokens and ensures
 * user profiles exist in Firestore database. New users automatically
 * receive default profile data with timestamps.
 * 
 * @param request - SvelteKit request object containing ID token
 * @param cookies - SvelteKit cookies interface for session management
 * @returns JSON response with success/error status
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken } = await request.json();

	try {
		// Create session cookie with 5-day expiration
		const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
		const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

		// Set secure cookie options for session management
		cookies.set('session', sessionCookie, {
			path: '/',
			httpOnly: true, // Prevent XSS attacks
			secure: true, // HTTPS only
			sameSite: 'strict', // CSRF protection
			maxAge: expiresIn / 1000 // Convert from milliseconds to seconds
		});

		// Verify token and extract user information
		const decodedToken = await adminAuth.verifyIdToken(idToken);
		const uid = decodedToken.uid;

		// Check if user profile exists in Firestore
		const profileRef = adminDb.collection('profiles').doc(uid);
		const profile = await profileRef.get();

		// Create default profile for new users
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
