import { adminAuth } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
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

		return json({ status: 'success' });
	} catch (error) {
		console.error('Error creating session:', error);
		return json({ status: 'error', message: 'Unauthorized request' }, { status: 401 });
	}
};
