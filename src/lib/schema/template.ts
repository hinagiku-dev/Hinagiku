/**
 * Template Schema Definition
 * 
 * This module defines the data structure for session templates in the Hinagiku
 * educational platform. Templates serve as reusable blueprints for creating
 * educational sessions, allowing educators to define learning objectives,
 * resources, and activities that can be instantiated multiple times.
 * 
 * Key Features:
 * - Reusable session configuration and content
 * - Educational resource integration and management
 * - Structured learning objectives with progressive subtasks
 * - Public sharing and collaboration capabilities
 * - Visual customization with background images
 * - Reflection prompts for learning consolidation
 * - Ownership and access control management
 * 
 * Template vs Session Relationship:
 * Templates define the "blueprint" while Sessions are "instances" created from templates.
 * Templates remain immutable during session execution, ensuring consistent learning experiences.
 * 
 * @fileoverview Session template data structure and validation schema
 */

import { z } from 'zod';
import { ResourceSchema } from './resource';
import { Timestamp } from './utils';

/**
 * Generates the route path for a specific template.
 * Used for navigation and template management throughout the application.
 * 
 * @param id - Template identifier
 * @returns URL path for the template
 */
export const route = (id: string) => `/templates/${id}`;

/**
 * Comprehensive template data schema with validation rules.
 * Defines the complete structure for session templates including
 * educational content, resources, objectives, and configuration options.
 */
export const TemplateSchema = z.object({
	/** Descriptive title for the learning session template */
	title: z.string().min(1).max(200),
	
	/** User ID of the template creator and owner */
	owner: z.string(),
	
	/** Whether the template is publicly accessible for sharing and reuse */
	public: z.boolean(),
	
	/** Organizational labels for categorizing and filtering templates */
	labels: z.array(z.string()).optional().default([]),
	
	/** Educational resources (documents, links, media) integrated into the template */
	resources: z.array(ResourceSchema).max(10),
	
	/** Primary learning task or objective description */
	task: z.string().min(1).max(200),
	
	/** Template lifecycle status for management and archival */
	active_status: z.enum(['active', 'archived', 'deleted']).default('active'),
	
	/** Structured subtasks for progressive learning and skill development */
	subtasks: z.array(z.string().min(1).max(200)).max(10),
	
	/** Optional background image URL for visual context and engagement */
	backgroundImage: z.string().nullable().optional(),
	
	/** Optional reflection prompt for post-session learning consolidation */
	reflectionQuestion: z.string().max(500).optional().default(''),
	
	/** Timestamp of template creation */
	createdAt: Timestamp,
	
	/** Timestamp of last template modification */
	updatedAt: Timestamp
});

/**
 * TypeScript type inferred from the template schema.
 * Use this type for all template data handling throughout the application.
 */
export type Template = z.infer<typeof TemplateSchema>;
