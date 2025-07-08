/**
 * Group Schema Definition
 * 
 * This module defines the data structure for collaborative learning groups within
 * the Hinagiku educational platform. Groups organize students for peer-to-peer
 * discussions and collaborative activities after individual AI-guided learning phases.
 * 
 * Group Lifecycle:
 * 1. discussion - Active peer collaboration and conversation
 * 2. summarize - AI processing and synthesis of group interactions
 * 3. end - Completed group activity with final summary
 * 
 * Key Features:
 * - Real-time discussion tracking with audio support
 * - Collaborative concept development and refinement
 * - AI-powered summarization and keyword extraction
 * - Content moderation for safe learning environments
 * - Flexible presentation and style preferences
 * - Participant management and activity tracking
 * 
 * @fileoverview Group collaboration data structure and validation schema
 */

import { z } from 'zod';

/**
 * Generates the route path for a specific group within a session.
 * Used for navigation and API endpoint construction throughout the application.
 * 
 * @param session - Session identifier
 * @param group - Group identifier within the session
 * @returns URL path for the group
 */
export const route = (session: string, group: string) => `/sessions/${session}/groups/${group}`;

/**
 * Comprehensive group data schema with validation rules.
 * Defines the complete structure for collaborative learning groups
 * including participants, discussions, progress tracking, and AI analysis.
 */
export const GroupSchema = z.object({
	/** Numerical identifier for the group within the session */
	number: z.number(),
	
	/** Array of user IDs representing group participants */
	participants: z.array(z.string()),
	
	/** Collaboratively developed concept or key insight (locked during stage transitions) */
	concept: z.string().min(1).nullable(),
	
	/** Real-time discussion messages between group members */
	discussions: z.array(
		z.object({
			/** The actual discussion message content */
			content: z.string(),
			/** Unique identifier for the discussion message (null for new messages) */
			id: z.string().nullable(),
			/** User ID of the group member who sent the message */
			speaker: z.string(),
			/** Reference to audio recording file for voice discussions */
			audio: z.string().nullable(),
			/** Flag indicating if the message requires moderation attention */
			moderation: z.boolean().default(false)
		})
	),
	
	/** Timestamp of the last group activity update */
	updatedAt: z.date().nullable(),
	
	/** Current phase of the group collaboration process */
	status: z.enum(['discussion', 'summarize', 'end']).default('discussion'),
	
	/** AI-generated summary of group discussions and outcomes (locked during finalization) */
	summary: z.string().nullable(),
	
	/** Extracted keywords with importance rankings (1-5 scale) for content analysis */
	keywords: z.record(z.string(), z.number().min(1).max(5)),
	
	/** Overall moderation flag for the entire group's content */
	moderation: z.boolean().default(false),
	
	/** Group's preferred presentation format for AI-generated content */
	presentation: z.enum(['paragraph', 'list2', 'list3', 'list4', 'list5']).default('paragraph'),
	
	/** Group's preferred communication style for AI interactions */
	textStyle: z.enum(['default', 'humor', 'serious', 'casual', 'cute']).default('default')
});

/**
 * Interface for individual discussion messages in group conversations.
 * Used for real-time messaging and group interaction tracking.
 */
export interface GroupDiscussionMessage {
	/** ID of the user who sent the message */
	userId: string;
	/** Role of the message sender (typically 'user', 'assistant' for AI interventions) */
	role: 'user' | 'assistant';
	/** The actual message content */
	content: string;
	/** Optional audio recording reference for voice messages */
	audio?: string | null;
	/** When the message was sent */
	timestamp: Date;
}

/**
 * TypeScript type inferred from the group schema.
 * Use this type for all group data handling throughout the application.
 */
export type Group = z.infer<typeof GroupSchema>;
