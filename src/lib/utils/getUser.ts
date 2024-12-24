import { db } from '$lib/firebase';
import { ProfileSchema, type Profile } from '$lib/schema/profile';
import { doc, getDoc } from 'firebase/firestore';

const cache = new Map<string, Promise<Profile>>();

export function getUser(uid: string): Promise<Profile> {
	if (cache.has(uid)) {
		return cache.get(uid)!;
	}
	const user = (async () => {
		const docRef = doc(db, 'profiles', uid);
		const docSnap = await getDoc(docRef);
		const data = docSnap.data();
		if (!data) {
			console.error(`UID 為 ${uid} 的使用者資料不存在`);
			return {
				uid,
				displayName: uid,
				title: null,
				bio: null
			};
		}
		return ProfileSchema.omit({ updatedAt: true, createdAt: true }).parse(data);
	})();
	cache.set(uid, user);
	return user;
}
