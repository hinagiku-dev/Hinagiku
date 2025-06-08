import { i18n } from '$lib/i18n';
import { adminAuth } from '$lib/server/firebase';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionCookie = event.cookies.get('session');

	// No session cookie, user is not authenticated
	if (!sessionCookie) {
		event.locals.user = null;
	} else {
		try {
			// Verify the session cookie and get the user's ID token
			const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
			if (decodedClaims.requiresPasswordChange) {
				if (
					!event.url.pathname.startsWith('/api') &&
					!event.url.pathname.startsWith('/profile/change-password') &&
					!event.url.pathname.startsWith('/en/profile/change-password') &&
					!event.url.pathname.startsWith('/zh/profile/change-password')
				) {
					const url = new URL(event.url);
					url.pathname = '/profile/change-password';
					return Response.redirect(url, 302);
				}
			}

			event.locals.user = decodedClaims;
		} catch (error) {
			console.log(error);
			// Session cookie is invalid/expired
			event.locals.user = null;
			event.cookies.delete('session', { path: '/' });
		}
	}

	if (
		event.url.pathname.startsWith('/api') &&
		!event.url.pathname.startsWith('/api/auth/signin') &&
		!event.url.pathname.startsWith('/api/auth/signout') &&
		!event.locals.user
	) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	return resolve(event);
};

export const handle = sequence(i18n.handle(), authHandle);
