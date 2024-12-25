import type { DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUser } from '../src/lib/utils/getUser';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	getDoc: vi.fn()
}));

vi.mock('$lib/firebase', () => ({
	db: {}
}));

describe('getUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('應該正確返回使用者資料', async () => {
		const mockUserData = {
			uid: 'test122',
			displayName: 'Test User',
			title: 'Developer',
			bio: 'Hello World'
		};

		(doc as unknown as Mock).mockReturnValue({} as DocumentReference);
		(getDoc as unknown as Mock).mockResolvedValue({
			exists: () => true,
			data: () => mockUserData
		} as unknown as DocumentSnapshot);

		const user = await getUser('test123');
		expect(user).toEqual(mockUserData);
	});

	it('當使用者不存在時應該返回預設資料', async () => {
		const uid = 'nonexistent123';
		(doc as unknown as Mock).mockReturnValue({} as DocumentReference);
		(getDoc as unknown as Mock).mockResolvedValue({
			exists: () => false,
			data: () => null
		} as unknown as DocumentSnapshot);

		const user = await getUser(uid);
		expect(user).toEqual({
			uid,
			displayName: uid,
			title: null,
			bio: null
		});
	});

	it('應該快取使用者資料', async () => {
		const mockUserData = {
			uid: 'test122',
			displayName: 'Test User',
			title: 'Developer',
			bio: 'Hello World'
		};

		(doc as unknown as Mock).mockReturnValue({} as DocumentReference);
		(getDoc as unknown as Mock).mockResolvedValue({
			exists: () => true,
			data: () => mockUserData
		} as unknown as DocumentSnapshot);

		// 第一次呼叫
		await getUser('test122');
		// 第二次呼叫
		await getUser('test122');

		// 應該只呼叫一次 getDoc
		expect(getDoc).toHaveBeenCalledTimes(1);
	});
});
