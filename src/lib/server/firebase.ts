import { env } from '$env/dynamic/private';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
	initializeApp({
		credential: cert(env.GOOGLE_APPLICATION_CREDENTIALS)
	});
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
