/**
 * Resource Schema Definition
 * 
 * This module defines the data structure for educational resources in the Hinagiku
 * platform. Resources are content items that support learning activities, including
 * text documents, uploaded files, and external links that can be integrated into
 * sessions and templates.
 * 
 * Resource Types:
 * - 'text' - Plain text content created directly in the platform
 * - 'file' - Uploaded documents (PDFs, images, etc.)
 * - 'link' - External URLs to web resources
 * 
 * Features:
 * - Unique UUID identification for reliable referencing
 * - Type-specific content handling and validation
 * - File reference system for uploaded content
 * - Extensible metadata system for file-specific properties
 * - Content size limits for performance optimization
 * 
 * Usage Context:
 * Resources are attached to templates and inherited by sessions, providing
 * students with relevant materials during individual and group learning phases.
 * 
 * @fileoverview Educational resource data structure and validation schema
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/**
 * Enumeration of supported resource types.
 * Each type requires different handling for content storage and display.
 */
export const ResourceTypeSchema = z.enum(['text', 'file', 'link']);

/**
 * Comprehensive resource data schema with validation rules.
 * Defines the complete structure for educational resources including
 * content storage, metadata, and file references.
 */
export const ResourceSchema = z.object({
	/** Unique identifier using UUID format for reliable cross-references */
	id: z.string().uuid(),
	
	/** Type of resource determining how content is stored and displayed */
	type: ResourceTypeSchema,
	
	/** Human-readable name for the resource (displayed in UI) */
	name: z.string().min(1).max(105),
	
	/** 
	 * Resource content with size limits for performance.
	 * - For 'text': The actual text content
	 * - For 'file': Processed/extracted text content
	 * - For 'link': URL and description
	 */
	content: z.string().min(1).max(100_000),
	
	/** Timestamp when the resource was created */
	createdAt: Timestamp,
	
	/** 
	 * Reference to external file storage (for 'file' type resources).
	 * Null for text and link resources that don't require file storage.
	 */
	ref: z.string().nullable(),
	
	/** 
	 * Extensible metadata object for storing file-specific properties.
	 * Examples: file size, MIME type, original filename, processing status
	 */
	metadata: z.record(z.string(), z.any()).optional()
});

/**
 * TypeScript type inferred from the resource schema.
 * Use this type for all resource data handling throughout the application.
 */
export type Resource = z.infer<typeof ResourceSchema>;

/**
 * TypeScript type for resource type enumeration.
 * Use this type when working specifically with resource type values.
 */
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
