/**
 * Authentication Store
 * 
 * This module manages client-side authentication state and operations for the Hinagiku
 * educational platform. It provides reactive user state management, Google OAuth integration,
 * and session lifecycle handling with proper internationalization support.
 * 
 * Key Features:
 * - Reactive user state using Svelte stores
 * - Google OAuth sign-in with popup flow
 * - Server-side session cookie management
 * - Intelligent post-authentication routing
 * - Multi-language URL resolution
 * - Secure sign-out with session cleanup
 * 
 * Authentication Flow:
 * 1. User initiates Google sign-in
 * 2. OAuth popup completes authentication
 * 3. ID token sent to server for session creation
 * 4. User redirected to intended destination or dashboard
 * 5. Client state synchronized with server session
 * 
 * @fileoverview Client-side authentication state management and operations
 */

import { goto } from '$app/navigation';
import { auth } from '$lib/firebase';
import { i18n } from '$lib/i18n';
import debug from 'debug';
import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { writable } from 'svelte/store';

/** Debug logger for authentication operations */
const log = debug('app:auth');

/**
 * Reactive user state store.
 * Contains the current authenticated user information or null if not authenticated.
 * Components can subscribe to this store to reactively update based on auth state.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { user } from '$lib/stores/auth';
 *   $: if ($user) {
 *     console.log('User is authenticated:', $user.email);
 *   }
 * </script>
 * ```
 */
export const user = writable<User | null>(null);

/**
 * Firebase authentication state listener.
 * Automatically synchronizes the user store with Firebase auth state changes.
 * This ensures client state remains consistent with authentication status.
 */
auth.onAuthStateChanged((newUser) => {
	console.log('Auth state changed:', newUser);
	user.set(newUser);
});

/**
 * Authenticates user with Google OAuth and establishes server session.
 * 
 * This function handles the complete Google sign-in flow including:
 * - OAuth popup authentication
 * - Server-side session creation
 * - Intelligent routing based on intended destination
 * - Multi-language URL handling and resolution
 * 
 * @param url - Target URL to redirect to after successful authentication
 * @param origin - Origin URL for relative path resolution (optional)
 * 
 * @example
 * ```ts
 * // Redirect to specific session after login
 * await signInWithGoogle('/sessions/abc123', window.location.origin);
 * 
 * // General sign-in with dashboard redirect
 * await signInWithGoogle('');
 * ```
 */
export async function signInWithGoogle(url: string, origin?: string) {
	const provider = new GoogleAuthProvider();
	try {
		// Initiate Google OAuth popup flow
		const result = await signInWithPopup(auth, provider);

		// Get Firebase ID token for server-side verification
		const idToken = await result.user.getIdToken();

		// Create server-side session with the ID token
		const response = await fetch('/api/auth/signin', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ idToken })
		});

		if (!response.ok) {
			throw new Error('Failed to create session');
		}

		// Handle post-authentication routing
		// If url contains 'session', redirect to that specific session
		if (url && url.includes('session')) {
			try {
				// Robust URL parsing with fallback handling
				// Convert relative paths to absolute URLs for parsing
				const fullUrl = url.startsWith('/')
					? `${origin || ''}${url}`
					: url.includes('://')
						? url
						: `${origin || ''}/${url}`;

				const parsedUrl = new URL(fullUrl);

				// Extract safe navigation path (pathname + search params only)
				const sessionPath = `${parsedUrl.pathname}${parsedUrl.search}`;

				// Handle internationalized URLs properly
				if (sessionPath.includes('/en/') || sessionPath.includes('/zh/')) {
					// Remove language prefix and let i18n.resolveRoute handle it
					await goto(i18n.resolveRoute(sessionPath.replace(/^\/(en|zh)\//, '/')));
				} else {
					await goto(i18n.resolveRoute(sessionPath));
				}
			} catch (error) {
				// Fallback to dashboard if URL parsing fails
				console.error('Error parsing session URL:', error);
				await goto(i18n.resolveRoute('/dashboard'));
			}
		}
		// Default redirect to dashboard for general sign-ins
		else {
			await goto(i18n.resolveRoute('/dashboard'));
		}
	} catch (error) {
		log('Error signing in with Google:', error);
	}
}

/**
 * Signs out the current user and cleans up session data.
 * 
 * This function performs a complete sign-out process including:
 * - Firebase client-side sign-out
 * - Server-side session cookie cleanup
 * - Redirection to public homepage
 * 
 * The function accepts a custom fetch function for testing purposes,
 * but uses the global fetch by default for browser environments.
 * 
 * @param f - Fetch function to use for API calls (defaults to global fetch)
 * 
 * @example
 * ```ts
 * // Standard sign-out
 * await signOut();
 * 
 * // Sign-out with custom fetch (for testing)
 * await signOut(mockFetch);
 * ```
 */
export async function signOut(f: typeof fetch = fetch) {
	try {
		// Sign out from Firebase client-side
		if (auth.currentUser) {
			await auth.signOut();
		}
		
		// Clear server-side session cookie
		await f('/api/auth/signout', { method: 'POST' });
		
		// Redirect to public homepage
		await goto(i18n.resolveRoute('/'));
	} catch (error) {
		log('Error signing out:', error);
	}
}
