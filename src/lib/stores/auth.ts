import { auth } from '$lib/firebase';
import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { writable } from 'svelte/store';

export const user = writable<User | null>(null);

// Listen to auth state changes
auth.onAuthStateChanged((newUser) => {
	user.set(newUser);
});

// Google sign in function
export async function signInWithGoogle() {
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

		// Redirect to dashboard after successful sign in
		window.location.href = '/dashboard';
	} catch (error) {
		console.error('Error signing in with Google:', error);
		throw error;
	}
}

// Sign out function
export async function signOut() {
	try {
		await auth.signOut();
		// Clear the session cookie
		await fetch('/api/auth/signout', { method: 'POST' });
		// Redirect to home page
		window.location.href = '/';
	} catch (error) {
		console.error('Error signing out:', error);
		throw error;
	}
}
