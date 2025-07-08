/**
 * @fileoverview
 * Client-side Firebase configuration and initialization for the Hinagiku educational platform.
 * 
 * This module sets up the Firebase client SDK with proper configuration from
 * environment variables, providing access to core Firebase services:
 * - Authentication for user sign-in and session management
 * - Firestore database for real-time data synchronization
 * - Cloud Storage for file uploads and media management
 * 
 * The configuration is loaded from public environment variables and initializes
 * Firebase services that are used throughout the client-side application for:
 * - User authentication and profile management
 * - Real-time session and class data synchronization
 * - File uploads for resources and media content
 * - Cross-device data consistency
 * 
 * All Firebase services are properly typed and ready for use in Svelte components
 * and client-side utilities.
 * 
 * @example
 * ```ts
 * import { auth, db, storageBucket } from '$lib/firebase';
 * 
 * // Use authentication
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * await signInWithEmailAndPassword(auth, email, password);
 * 
 * // Use Firestore
 * import { doc, getDoc } from 'firebase/firestore';
 * const userDoc = await getDoc(doc(db, 'users', userId));
 * 
 * // Use Storage
 * import { ref, uploadBytes } from 'firebase/storage';
 * await uploadBytes(ref(storageBucket, 'path/file'), file);
 * ```
 */

import { env } from '$env/dynamic/public';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration object constructed from environment variables.
 * Contains all necessary Firebase project settings for client-side SDK initialization.
 */
const firebaseConfig = {
	apiKey: env.PUBLIC_FIREBASE_API_KEY,
	authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: env.PUBLIC_FIREBASE_APP_ID,
	measurementId: env.PUBLIC_FIREBASE_MEASUREMENT_ID
};

/** Main Firebase app instance initialized with project configuration */
export const app = initializeApp(firebaseConfig);

/** Firebase Authentication service for user sign-in and session management */
export const auth = getAuth(app);

/** Firestore database instance for real-time data synchronization */
export const db = getFirestore(app);

/** Cloud Storage service for file uploads and media management */
export const storageBucket = getStorage(app);
