/**
 * Session Schema Definition
 * 
 * This module defines the comprehensive data structure for educational sessions
 * in the Hinagiku platform. Sessions are the primary organizational unit for
 * collaborative learning activities, managing participants, timing, content,
 * and progression through different learning phases.
 * 
 * Session Lifecycle:
 * 1. preparing - Initial setup and participant joining
 * 2. individual - Solo learning and AI interaction phase
 * 3. before-group - Transition preparation for group work
 * 4. group - Collaborative group discussion phase
 * 5. after-group - Post-collaboration reflection
 * 6. ended - Session completion and summary generation
 * 
 * Key Features:
 * - Template-based content inheritance (frozen fields)
 * - Flexible grouping modes (auto, manual, class-based)
 * - Real-time timing tracking for learning phases
 * - Integrated announcement and summary systems
 * - Multi-language support and internationalization
 * 
 * @fileoverview Session data structure and validation schema
 */

import { z } from 'zod';
import { ResourceSchema } from './resource';
import { Timestamp } from './utils';

/**
 * Generates the route path for a specific session.
 * Used for navigation and URL generation throughout the application.
 * 
 * @param id - Session identifier
 * @returns URL path for the session
 */
export const route = (id: string) => `/sessions/${id}`;

/**
 * Comprehensive session data schema with validation rules.
 * Defines the complete structure for educational learning sessions
 * including content, timing, participants, and progression state.
 */
export const SessionSchema = z.object({
	/** Session title (inherited from template, cannot be modified) */
	title: z.string().min(1).max(200),
	
	/** User ID of the session host/facilitator */
	host: z.string(),
	
	/** Optional class association for institutional contexts */
	classId: z.string().nullable().optional().describe('The class this session belongs to, if any'),
	
	/** Educational resources available during the session (inherited from template) */
	resources: z.array(ResourceSchema).max(10),
	
	/** Main learning task description (inherited from template) */
	task: z.string().min(1).max(200),
	
	/** Structured subtasks for progressive learning (inherited from template) */
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	
	/** Background image URL for visual context (inherited from template) */
	backgroundImage: z.string().min(5).max(500).url().nullable(),
	
	/** Session lifecycle status for archival management */
	active_status: z.enum(['active', 'archived', 'deleted']).default('active'),
	
	/** Timestamp of session creation */
	createdAt: Timestamp,
	
	/** Current phase of the learning session */
	status: z.enum(['preparing', 'individual', 'before-group', 'group', 'after-group', 'ended']),
	
	/** Custom labels for session organization and filtering */
	labels: z.array(z.string()),
	
	/** Timing data for learning phases - tracks start/end times for analysis */
	timing: z.object({
		/** Individual learning phase timing */
		individual: z.object({
			start: Timestamp.nullable(),
			end: Timestamp.nullable()
		}),
		/** Group collaboration phase timing */
		group: z.object({
			start: Timestamp.nullable(),
			end: Timestamp.nullable()
		})
	}),
	
	/** Session configuration options */
	settings: z
		.object({
			/** Method for organizing participants into groups */
			groupingMode: z.enum(['auto', 'manual', 'class'])
		})
		.optional()
		.default({ groupingMode: 'auto' }),
	
	/** Queue of users waiting to join the session */
	waitlist: z.array(z.string()).default([]),
	
	/** Real-time announcement system for session-wide communication */
	announcement: z
		.object({
			/** Announcement message content */
			message: z.string(),
			/** Whether the announcement is currently displayed */
			active: z.boolean(),
			/** When the announcement was created */
			timestamp: Timestamp
		})
		.optional()
		.nullable(),
	
	/** AI-generated session summary and learning outcomes */
	summary: z
		.object({
			/** Synthesized overview of group discussions and individual insights */
			integratedViewpoint: z.string(),
			/** Analysis of differing perspectives and approaches */
			differences: z.string(),
			/** Assessment of learning progress and objective completion */
			learningProgress: z.string(),
			/** Final conclusions and key takeaways */
			finalConclusion: z.string()
		})
		.nullable()
		.optional(),
	
	/** Optional reflection prompt for post-session learning consolidation */
	reflectionQuestion: z.string().max(500).optional().default('')
});

/**
 * TypeScript type inferred from the session schema.
 * Use this type for all session data handling throughout the application.
 */
export type Session = z.infer<typeof SessionSchema>;
