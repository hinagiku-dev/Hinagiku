/**
 * Server-Side Type Definitions
 * 
 * This module defines TypeScript interfaces and types used throughout the server-side
 * components of the Hinagiku educational platform. These types ensure type safety
 * for data structures used in AI interactions, database operations, and communication
 * between different system components.
 * 
 * Key Areas:
 * - LLM (Large Language Model) communication interfaces
 * - Database message storage formats
 * - Group discussion data structures
 * - Content analysis and summarization types
 * 
 * @fileoverview Core type definitions for server-side operations
 */

/**
 * Represents a message in LLM (Large Language Model) conversations.
 * This is the standardized format for communication with AI models like OpenAI GPT or Google Gemini.
 * Used for sending requests to and receiving responses from AI services.
 * 
 * @interface LLMChatMessage
 * @property role - The sender's role in the conversation
 * @property content - The actual message content/text
 * @property name - Optional identifier for the message sender (used in multi-participant scenarios)
 */
export interface LLMChatMessage {
	/** Identifies the message sender: 'user' for students, 'assistant' for AI, 'system' for prompts */
	role: 'user' | 'assistant' | 'system';
	/** The actual text content of the message */
	content: string;
	/** Optional name identifier, useful for distinguishing between multiple users */
	name?: string;
}

/**
 * Represents a message as stored in the database with additional metadata.
 * Extends the basic LLM message format with audio recordings and content moderation flags.
 * This format is used for persistent storage and includes safety and multimedia features.
 * 
 * @interface DBChatMessage
 * @property role - The sender's role in the conversation
 * @property content - The message text content
 * @property audio - URL/path to audio recording of the message (if available)
 * @property warning - Content moderation flags for safety and topic relevance
 */
export interface DBChatMessage {
	/** Identifies the message sender */
	role: 'user' | 'assistant' | 'system';
	/** The text content of the message */
	content: string;
	/** URL or file path to audio recording, null if no audio available */
	audio: string | null;
	/** Content safety and relevance flags, null if not moderated */
	warning: {
		/** True if content triggered moderation policies (inappropriate content) */
		moderation: boolean;
		/** True if content is determined to be off-topic for the learning objective */
		offTopic: boolean;
	} | null;
}

/**
 * Represents a discussion message in group collaborative activities.
 * Group discussions are peer-to-peer conversations distinct from individual AI interactions.
 * Used for tracking collaborative learning dynamics and group participation patterns.
 * 
 * @interface Discussion
 * @property id - Unique identifier for the discussion message (null for new messages)
 * @property content - The discussion message text
 * @property speaker - Identifier for the group member who spoke
 * @property audio - Audio recording reference for voice discussions
 * @property moderation - Flag indicating if content requires moderation attention
 */
export interface Discussion {
	/** Unique message identifier, null for messages not yet persisted */
	id: string | null;
	/** The actual discussion content/text */
	content: string;
	/** Identifier of the group member who contributed this message */
	speaker: string;
	/** Reference to audio recording, null if text-only discussion */
	audio: string | null;
	/** Flag indicating potential moderation issues with the content */
	moderation: boolean;
}

/**
 * Represents summarized content analysis data.
 * Used for generating insights from conversations, discussions, and learning activities.
 * Provides both high-level summaries and detailed key points for educational assessment.
 * 
 * @interface SummaryData
 * @property summary - Concise overview of the analyzed content
 * @property keyPoints - Array of important topics or insights extracted from the content
 */
export interface SummaryData {
	/** A concise, coherent summary of the analyzed conversation or discussion */
	summary: string;
	/** Array of key topics, insights, or learning points identified in the content */
	keyPoints: string[];
}
