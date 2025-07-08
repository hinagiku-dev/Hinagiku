/**
 * Class Management Schema Definition
 * 
 * This module defines the data structure for educational classes in the Hinagiku
 * platform. Classes represent institutional organizational units that group students
 * under teacher supervision for structured learning activities and session management.
 * 
 * Educational Context:
 * Classes provide the institutional framework for organizing students and managing
 * learning sessions within formal educational settings like schools and universities.
 * They enable teachers to:
 * - Organize students into manageable cohorts
 * - Track learning progress across multiple sessions
 * - Manage group formations for collaborative activities
 * - Maintain institutional records and reporting
 * 
 * Features:
 * - Unique class codes for easy student enrollment
 * - Hierarchical organization (school → class → groups → students)
 * - Academic year tracking for institutional records
 * - Flexible group management for collaborative learning
 * - Teacher-controlled student roster management
 * 
 * @fileoverview Class and student management data structures for institutional education
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/**
 * Generates the route path for a specific class.
 * Used for navigation and class management throughout the application.
 * 
 * @param classId - Class identifier
 * @returns URL path for the class
 */
export const route = (classId: string) => `/classes/${classId}`;

/**
 * Comprehensive class data schema with validation rules.
 * Defines the complete structure for educational classes including
 * institutional information, student rosters, and group organization.
 */
export const ClassSchema = z.object({
	/** Short, unique identifier for easy class enrollment (e.g., "CS101", "MATH1") */
	code: z.string().min(1).max(6).describe('Unique class code'),
	
	/** User ID of the teacher who owns and manages this class */
	teacherId: z.string().describe('User ID of the teacher'),
	
	/** Name of the educational institution where the class is held */
	schoolName: z.string().min(1).max(100),
	
	/** Academic period identifier (e.g., "2024-Spring", "Fall 2023") */
	academicYear: z.string().min(1).max(20),
	
	/** Descriptive name for the class (e.g., "Introduction to Computer Science") */
	className: z.string().min(1).max(50),
	
	/** Lifecycle status for class management and archival */
	active_status: z.enum(['active', 'archived', 'deleted']).default('active'),
	
	/** Array of student user IDs enrolled in this class */
	students: z.array(z.string()).describe('Array of student user IDs').default([]),
	
	/** 
	 * Pre-defined groups within the class for collaborative activities.
	 * These can be used for automatic group assignment in sessions.
	 */
	groups: z
		.array(
			z.object({
				/** Numerical identifier for the group within the class */
				number: z.number(),
				/** Array of student user IDs assigned to this group */
				students: z.array(z.string()).default([])
			})
		)
		.describe('Class group information')
		.default([]),
	
	/** Timestamp of last class modification */
	updatedAt: Timestamp,
	
	/** Timestamp of class creation */
	createdAt: Timestamp
});

/**
 * Student information schema for class roster management.
 * Contains essential student data for educational tracking and organization.
 */
export const StudentSchema = z.object({
	/** Human-readable name for the student */
	displayName: z.string(),
	
	/** Institutional student identifier (student ID number) */
	studentId: z.string().describe('學號'),
	
	/** Optional group assignment within the class */
	group: z.string().max(50).nullable(),
	
	/** Optional physical seating arrangement identifier */
	seatNumber: z.string().nullable()
});

/**
 * TypeScript type inferred from the class schema.
 * Use this type for all class data handling throughout the application.
 */
export type Class = z.infer<typeof ClassSchema>;
