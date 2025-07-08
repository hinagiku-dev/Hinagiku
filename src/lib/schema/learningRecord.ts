/**
 * @fileoverview
 * Learning record schema and utilities for the Hinagiku educational platform.
 * 
 * This module defines the structure for individual student learning records that
 * capture responses, submissions, and progress within educational sessions.
 * Learning records provide detailed tracking of student engagement and understanding.
 * 
 * Features:
 * - Student response tracking with substantial text capacity (30,000 characters)
 * - Session and group context for organized record management
 * - Timestamp tracking for creation and modification history
 * - Route generation for accessing learning records
 * - User association for personalized learning analytics
 * 
 * Learning records serve as the foundation for educational analytics, allowing
 * teachers to track student progress, understanding, and participation patterns
 * across different learning activities and group configurations.
 * 
 * @example
 * ```ts
 * import { LearningRecordSchema, route } from '$lib/schema/learningRecord';
 * 
 * // Create a learning record
 * const record = {
 *   userId: 'student-123',
 *   answer: 'My understanding of the concept is...',
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * };
 * 
 * // Generate route for group learning records
 * const recordsUrl = route('session-456', 'group-1');
 * ```
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/** Firestore collection name for learning records */
export const LEARNING_RECORDS_COLLECTION = 'learningRecords';

/**
 * Generates a route for accessing learning records within a specific session and group.
 * 
 * @param session - Session ID containing the learning activity
 * @param group - Group ID within the session
 * @returns URL path for accessing group learning records
 */
export const route = (session: string, group: string) =>
	`/sessions/${session}/groups/${group}/learningRecords`;

/**
 * Zod schema for validating learning record data structure.
 * 
 * Defines the structure for individual student submissions and responses
 * within educational activities, supporting comprehensive text-based answers.
 */
export const LearningRecordSchema = z.object({
	/** User ID of the student who created this learning record */
	userId: z.string(),
	
	/** 
	 * Student's answer or response content.
	 * Supports extensive text up to 30,000 characters for detailed responses,
	 * essays, reflections, or comprehensive submissions.
	 */
	answer: z.string().max(30000),
	
	/** Timestamp when the learning record was initially created */
	createdAt: Timestamp,
	
	/** Timestamp of the most recent update to the learning record */
	updatedAt: Timestamp
});

/**
 * TypeScript type inferred from the LearningRecordSchema.
 * Represents an individual student's learning record with response content and metadata.
 */
export type LearningRecord = z.infer<typeof LearningRecordSchema>;
