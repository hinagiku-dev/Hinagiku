import { env } from '$env/dynamic/private';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
	let serviceAccountPathOrObject: string | ServiceAccount;
	try {
		const tmp = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS);
		if (typeof tmp === 'object') {
			serviceAccountPathOrObject = tmp;
		} else {
			throw new Error();
		}
	} catch {
		serviceAccountPathOrObject = env.GOOGLE_APPLICATION_CREDENTIALS;
	}
	initializeApp({
		credential: cert(serviceAccountPathOrObject)
	});
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
