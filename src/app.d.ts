/**
 * @fileoverview
 * Global TypeScript type definitions for the Hinagiku educational platform.
 * 
 * This file extends SvelteKit's global app namespace with custom types for:
 * - Internationalization support through Paraglide locals
 * - Firebase authentication user context in server-side locals
 * - Platform-specific configurations and error handling
 * 
 * These type definitions ensure type safety across the entire application,
 * particularly for request handling, user authentication state, and 
 * multi-language support functionality.
 * 
 * @see https://svelte.dev/docs/kit/types#app.d.ts SvelteKit type documentation
 */

import type { ParaglideLocals } from '@inlang/paraglide-sveltekit';
import type { AvailableLanguageTag } from '../../lib/paraglide/runtime';
import type { DecodedIdToken } from 'firebase-admin/auth';

declare global {
	namespace App {
		/**
		 * Server-side locals interface containing request-scoped data
		 * available throughout the request lifecycle.
		 */
		interface Locals {
			/** Paraglide internationalization context for language routing */
			paraglide: ParaglideLocals<AvailableLanguageTag>;

			/** Authenticated user data from Firebase session cookie, null if not authenticated */
			user: DecodedIdToken | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
