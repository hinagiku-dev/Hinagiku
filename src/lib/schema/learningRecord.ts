import { z } from 'zod';
import { Timestamp } from './utils';

export const LEARNING_RECORDS_COLLECTION = 'learningRecords';
export const route = (session: string, group: string) =>
	`/sessions/${session}/groups/${group}/learningRecords`;

export const LearningRecordSchema = z.object({
	userId: z.string(),
	answer: z.string().max(30000),
	createdAt: Timestamp,
	updatedAt: Timestamp
});

export type LearningRecord = z.infer<typeof LearningRecordSchema>;
