/**
 * Server-Side Request Hooks
 * 
 * This module defines server-side hooks that process all incoming requests to the Hinagiku
 * educational platform. It handles authentication verification, session management, and
 * internationalization (i18n) before requests reach their target routes.
 * 
 * Key Features:
 * - Firebase session cookie authentication
 * - Automatic redirection for expired sessions
 * - Password change enforcement for security compliance
 * - API route protection for authenticated endpoints
 * - Internationalization support for multi-language interface
 * 
 * Authentication Flow:
 * 1. Check for session cookie presence
 * 2. Verify cookie with Firebase Admin Auth
 * 3. Handle password change requirements
 * 4. Protect API routes from unauthorized access
 * 5. Clean up invalid sessions with proper redirects
 * 
 * @fileoverview Server-side request processing and authentication hooks
 */

import { i18n } from '$lib/i18n';
import { adminAuth } from '$lib/server/firebase';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Authentication handler for all incoming requests.
 * Verifies Firebase session cookies and enforces authentication requirements
 * for protected routes. Handles session lifecycle including expiration and cleanup.
 */
const authHandle: Handle = async ({ event, resolve }) => {
	const sessionCookie = event.cookies.get('session');

	// No session cookie found - user is not authenticated
	if (!sessionCookie) {
		event.locals.user = null;
	} else {
		try {
			// Verify the Firebase session cookie and extract user claims
			const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
			
			// Check if user is required to change password (security compliance)
			if (decodedClaims.requiresPasswordChange) {
				// Allow access only to password change pages and API endpoints
				if (
					!event.url.pathname.startsWith('/api') &&
					!event.url.pathname.startsWith('/profile/change-password') &&
					!event.url.pathname.startsWith('/en/profile/change-password') &&
					!event.url.pathname.startsWith('/zh/profile/change-password')
				) {
					// Redirect to password change page in current language
					const url = new URL(event.url);
					url.pathname = '/profile/change-password';
					return Response.redirect(url, 302);
				}
			}

			// Set authenticated user data for use in routes
			event.locals.user = decodedClaims;
		} catch (error) {
			console.log(error);
			// Session cookie is invalid or expired - clean up and redirect
			event.locals.user = null;
			
			// Clear the invalid session cookie
			// Reference: https://github.com/sveltejs/kit/discussions/7869
			event.cookies.delete('session', { path: '/' });
			
			// Redirect to login page with proper cookie cleanup
			return new Response(null, {
				status: 300,
				headers: {
					location: `${event.url.origin}/login`,
					'set-cookie': `session=; Path=/; Expires=${new Date(0)}`
				}
			});
		}
	}

	// Protect API routes from unauthorized access
	// Allow public auth endpoints (signin/signout) without authentication
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

/**
 * Combined handler sequence that processes requests through:
 * 1. Internationalization (i18n) - language detection and setup
 * 2. Authentication - user verification and session management
 */
export const handle = sequence(i18n.handle(), authHandle);
