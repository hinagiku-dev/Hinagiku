import { adminAuth } from '$lib/server/firebase';
import { type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionCookie = event.cookies.get('session');

	// No session cookie, user is not authenticated
	if (!sessionCookie) {
		event.locals.user = null;
	} else {
		try {
			// Verify the session cookie and get the user's ID token
			const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
			event.locals.user = decodedClaims;
		} catch (error) {
			console.log(error);
			// Session cookie is invalid/expired
			event.locals.user = null;
			event.cookies.delete('session', { path: '/' });
		}
	}

	return resolve(event);
};
