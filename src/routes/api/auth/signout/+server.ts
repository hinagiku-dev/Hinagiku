/**
 * @fileoverview
 * Authentication sign-out API endpoint for the Hinagiku educational platform.
 * 
 * This endpoint handles secure user logout by removing session cookies and
 * terminating the user's authenticated session. It ensures complete session
 * cleanup to prevent unauthorized access after logout.
 * 
 * The endpoint provides:
 * - Secure session cookie removal
 * - Immediate authentication state invalidation
 * - Clean logout process for user security
 * 
 * @route POST /api/auth/signout
 * @returns {Object} Success status confirming logout completion
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Handles user sign-out and session termination.
 * 
 * Removes the session cookie to invalidate the user's authentication
 * state, ensuring they are logged out securely across the application.
 * 
 * @param cookies - SvelteKit cookies interface for session management
 * @returns JSON response confirming successful logout
 */
export const POST: RequestHandler = async ({ cookies }) => {
	// Remove session cookie to log out user
	cookies.delete('session', { path: '/' });
	return json({ status: 'success' });
};
