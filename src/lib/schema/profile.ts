/**
 * @fileoverview
 * User profile schema and utilities for the Hinagiku educational platform.
 * 
 * This module defines the structure for user profile data that extends beyond
 * basic authentication information. Profiles contain educational context and
 * personalization data for both teachers and students in the platform.
 * 
 * Features:
 * - Comprehensive user profile information with display names and descriptions
 * - Student-specific fields for classroom management (seat numbers, student IDs)
 * - Teacher-specific fields for professional information (titles, bios)
 * - Timestamp tracking for profile creation and updates
 * - Route generation for profile management
 * - Schema validation with appropriate length limits
 * 
 * The profile system supports both student and teacher roles with flexible
 * fields that can be used differently based on the user's role in the
 * educational environment.
 * 
 * @example
 * ```ts
 * import { ProfileSchema, route } from '$lib/schema/profile';
 * 
 * // Teacher profile
 * const teacherProfile = {
 *   uid: 'teacher-123',
 *   displayName: 'Dr. Smith',
 *   title: 'Professor of Mathematics',
 *   bio: 'Specializing in educational technology...',
 *   seatNumber: null,
 *   studentId: null,
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * };
 * 
 * // Student profile
 * const studentProfile = {
 *   uid: 'student-456',
 *   displayName: 'Alice Chen',
 *   title: null,
 *   bio: null,
 *   seatNumber: 'A-15',
 *   studentId: 'S2024001',
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * };
 * ```
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/**
 * Generates a profile management route for a specific user.
 * 
 * @param uid - User ID for profile access
 * @returns URL path for user profile management
 */
export const route = (uid: string) => `/profiles/${uid}`;

/**
 * Zod schema for validating user profile data structure.
 * 
 * Defines comprehensive profile information that supports both student
 * and teacher use cases with flexible optional fields for different roles.
 */
export const ProfileSchema = z.object({
	/** Unique user identifier linked to authentication system */
	uid: z.string().describe('User ID associated with auth'),
	
	/** Public display name shown throughout the platform (1-100 characters) */
	displayName: z.string().min(1).max(100),
	
	/** Professional title or role description (optional, max 100 characters) */
	title: z.string().max(100).nullable(),
	
	/** Personal or professional biography/description (optional, max 1000 characters) */
	bio: z.string().max(1000).nullable(),
	
	/** Classroom seat assignment for students (optional) */
	seatNumber: z.string().nullable().optional(),
	
	/** Student identification number for academic records (optional) */
	studentId: z.string().nullable().optional(),
	
	/** Timestamp of last profile update */
	updatedAt: Timestamp,
	
	/** Timestamp of profile creation */
	createdAt: Timestamp
});

/**
 * TypeScript type inferred from the ProfileSchema.
 * Represents a complete user profile with educational context information.
 */
export type Profile = z.infer<typeof ProfileSchema>;
