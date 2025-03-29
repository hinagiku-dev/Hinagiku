import { goto } from '$app/navigation';
import { auth } from '$lib/firebase';
import { i18n } from '$lib/i18n';
import debug from 'debug';
import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { writable } from 'svelte/store';
const log = debug('app:auth');

export const user = writable<User | null>(null);

// Listen to auth state changes
auth.onAuthStateChanged((newUser) => {
	console.log('Auth state changed:', newUser);
	user.set(newUser);
});

// Google sign in function
export async function signInWithGoogle(url: string, origin?: string) {
	const provider = new GoogleAuthProvider();
	try {
		const result = await signInWithPopup(auth, provider);

		// Get ID token for server-side session
		const idToken = await result.user.getIdToken();

		// Send ID token to server to create session
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

		// if url is provided and contains a session parameter, redirect to that url
		if (url && url.includes('session')) {
			try {
				// Use the URL API for robust URL parsing
				// If url is a relative path, prepend with origin to make it parseable
				const fullUrl = url.startsWith('/')
					? `${origin || ''}${url}`
					: url.includes('://')
						? url
						: `${origin || ''}/${url}`;

				const parsedUrl = new URL(fullUrl);

				// Extract just the pathname and search params for safe navigation
				const sessionPath = `${parsedUrl.pathname}${parsedUrl.search}`;

				// Use SPA navigation to preserve client-side state
				await goto(i18n.resolveRoute(sessionPath));
			} catch (error) {
				// Fallback to original redirection if URL parsing fails
				console.error('Error parsing session URL:', error);
				await goto(i18n.resolveRoute('/dashboard'));
			}
		}
		// Otherwise redirect to dashboard after successful sign in
		else {
			await goto(i18n.resolveRoute('/dashboard'));
		}
	} catch (error) {
		log('Error signing in with Google:', error);
	}
}

// Sign out function
export async function signOut(f: typeof fetch = fetch) {
	try {
		if (auth.currentUser) {
			await auth.signOut();
		}
		// Clear the session cookie
		await f('/api/auth/signout', { method: 'POST' });
		// Redirect to home page
		await goto(i18n.resolveRoute('/'));
	} catch (error) {
		log('Error signing out:', error);
	}
}
