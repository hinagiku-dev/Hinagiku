import type { CollectionReference, DocumentReference } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	adminDb,
	checkRemoveParticipantPermission,
	getGroupsData,
	getSessionData
} from '../src/lib/server/firebase';

// Mock Firestore
vi.mock('firebase-admin/firestore', () => ({
	getFirestore: vi.fn(() => ({
		collection: vi.fn(),
		doc: vi.fn()
	})),
	Timestamp: {
		now: vi.fn(() => ({ toMillis: () => 1234567890000 }))
	}
}));

describe('Firebase Server Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getGroupsData', () => {
		it('應該正確返回小組資料', async () => {
			const mockGroups = {
				empty: false,
				docs: [
					{
						data: () => ({
							number: 1,
							participants: ['user1', 'user2'],
							concept: null
						})
					},
					{
						data: () => ({
							number: 2,
							participants: ['user3', 'user4'],
							concept: null
						})
					}
				]
			};

			const groupsRef = {
				get: vi.fn().mockResolvedValue(mockGroups)
			} as unknown as CollectionReference;

			const result = await getGroupsData(groupsRef);
			expect(result).toHaveLength(2);
			expect(result[0].number).toBe(1);
			expect(result[1].participants).toContain('user3');
		});

		it('當沒有找到小組時應該拋出404錯誤', async () => {
			const groupsRef = {
				get: vi.fn().mockResolvedValue({ empty: true })
			} as unknown as CollectionReference;

			await expect(getGroupsData(groupsRef)).rejects.toThrow('Groups not found');
		});
	});

	describe('getSessionData', () => {
		it('應該正確返回會話資料', async () => {
			const mockSession = {
				exists: true,
				data: () => ({
					title: 'Test Session',
					host: 'user1',
					status: 'preparing'
				})
			};

			const sessionRef = {
				get: vi.fn().mockResolvedValue(mockSession)
			} as unknown as DocumentReference;

			const result = await getSessionData(sessionRef);
			expect(result.title).toBe('Test Session');
			expect(result.host).toBe('user1');
		});

		it('當沒有找到會話時應該拋出404錯誤', async () => {
			const sessionRef = {
				get: vi.fn().mockResolvedValue({ exists: false })
			} as unknown as DocumentReference;

			await expect(getSessionData(sessionRef)).rejects.toThrow('Session not found');
		});
	});

	describe('checkRemoveParticipantPermission', () => {
		it('當使用者是主持人時應該返回true', async () => {
			const mockSession = {
				exists: true,
				data: () => ({
					host: 'host123',
					status: 'preparing'
				})
			};

			vi.spyOn(adminDb, 'collection').mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockSession)
				})
			} as unknown as CollectionReference);

			const result = await checkRemoveParticipantPermission(
				'session123',
				'host123',
				'participant123'
			);
			expect(result).toBe(true);
		});

		it('當使用者是被移除的參與者時應該返回true', async () => {
			const mockSession = {
				exists: true,
				data: () => ({
					host: 'host123',
					status: 'preparing'
				})
			};

			vi.spyOn(adminDb, 'collection').mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockSession)
				})
			} as unknown as CollectionReference);

			const result = await checkRemoveParticipantPermission(
				'session123',
				'participant123',
				'participant123'
			);
			expect(result).toBe(true);
		});

		it('當使用者既不是主持人也不是被移除的參與者時應該返回false', async () => {
			const mockSession = {
				exists: true,
				data: () => ({
					host: 'host123',
					status: 'preparing'
				})
			};

			vi.spyOn(adminDb, 'collection').mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockSession)
				})
			} as unknown as CollectionReference);

			const result = await checkRemoveParticipantPermission(
				'session123',
				'otherUser123',
				'participant123'
			);
			expect(result).toBe(false);
		});
	});
});
