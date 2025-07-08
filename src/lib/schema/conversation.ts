/**
 * Conversation Schema Definition
 * 
 * This module defines the data structure for individual student conversations within
 * the Hinagiku educational platform. Conversations represent one-on-one interactions
 * between a student and the AI assistant within a group learning context.
 * 
 * Key Features:
 * - Individual learning progress tracking with subtask completion
 * - Multi-modal conversation history (text and audio)
 * - Content moderation and safety monitoring
 * - Personalized presentation and style preferences
 * - Educational resource integration
 * - AI-generated summaries and key points extraction
 * 
 * Educational Context:
 * Each conversation is part of a larger collaborative learning session where students
 * work individually with AI guidance before participating in group discussions.
 * The conversation data supports both real-time interaction and post-session analysis.
 * 
 * @fileoverview Individual student-AI conversation data structure and validation
 */

import { z } from 'zod';
import { ResourceSchema } from './resource';

/**
 * Generates the route path for a specific conversation within a session and group.
 * Used for navigation and API endpoint construction throughout the application.
 * 
 * @param session - Session identifier
 * @param group - Group identifier within the session
 * @param conv - Conversation identifier within the group
 * @returns URL path for the conversation
 */
export const route = (session: string, group: string, conv: string) =>
	`/sessions/${session}/groups/${group}/conversations/${conv}`;

/**
 * Comprehensive conversation data schema with validation rules.
 * Defines the complete structure for individual student-AI interactions
 * including learning progress, content history, and personalization settings.
 */
export const ConversationSchema = z.object({
	/** Unique identifier of the student participating in this conversation */
	userId: z.string(),
	
	/** Main learning task description (inherited from session template) */
	task: z.string().min(1).max(200),
	
	/** Array of structured subtasks for progressive learning */
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	
	/** Educational resources available to the student during the conversation */
	resources: z.array(ResourceSchema).max(10),
	
	/** Complete conversation history between student and AI assistant */
	history: z.array(
		z.object({
			/** Role of the message sender (system prompts, user input, or AI responses) */
			role: z.enum(['system', 'user', 'assistant']),
			/** The actual text content of the message */
			content: z.string(),
			/** Reference to audio recording file, null for text-only messages */
			audio: z.string().nullable(),
			/** Content safety and relevance flags for this specific message */
			warning: z
				.object({
					/** True if message triggered content moderation policies */
					moderation: z.boolean().default(false),
					/** True if message is determined to be off-topic for learning objectives */
					offTopic: z.boolean().default(false)
				})
				.nullable()
		})
	),
	
	/** Conversation-level safety and engagement monitoring */
	warning: z.object({
		/** Overall moderation flag for the entire conversation */
		moderation: z.boolean().default(false),
		/** Count of off-topic interactions to track learning focus */
		offTopic: z.number().default(0)
	}),
	
	/** Boolean array tracking completion status of each subtask */
	subtaskCompleted: z.array(z.boolean().default(false)),
	
	/** AI-generated summary of the conversation for review and assessment */
	summary: z.string().nullable(),
	
	/** Key learning points extracted from the conversation */
	keyPoints: z.array(z.string()).nullable(),
	
	/** Student's preferred presentation format for AI responses */
	presentation: z.enum(['paragraph', 'list2', 'list3', 'list4', 'list5']).default('paragraph'),
	
	/** Student's preferred communication style for AI interactions */
	textStyle: z.enum(['default', 'humor', 'serious', 'casual', 'cute']).default('default')
});

/**
 * TypeScript type inferred from the conversation schema.
 * Use this type for all conversation data handling throughout the application.
 */
export type Conversation = z.infer<typeof ConversationSchema>;
