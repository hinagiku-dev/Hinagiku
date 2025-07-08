/**
 * @fileoverview
 * Code-based access system schema and utilities for the Hinagiku educational platform.
 * 
 * This module defines the structure and validation for temporary access codes that
 * allow students to join sessions and groups without requiring full authentication.
 * The system provides secure, time-limited access through shareable codes.
 * 
 * Features:
 * - Time-limited access codes with expiration timestamps
 * - Target-specific codes for sessions and groups
 * - URL route generation for code-based access
 * - Zod schema validation for code structure
 * - Type safety for code-related operations
 * 
 * The code system enables teachers to share temporary access links with students,
 * allowing them to join educational activities without complex registration
 * processes while maintaining security through expiration times.
 * 
 * @example
 * ```ts
 * import { CodeSchema, route } from '$lib/schema/code';
 * 
 * // Create a session access code
 * const sessionCode = {
 *   target: 'session-123',
 *   exp: { seconds: Date.now() / 1000 + 3600, nanoseconds: 0 } // 1 hour from now
 * };
 * 
 * // Generate access URL
 * const accessUrl = route.session('temp-code-abc');
 * ```
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/**
 * Route generators for code-based access URLs.
 * 
 * Provides standardized URL patterns for different types of code-based
 * access in the educational platform.
 */
export const route = {
	/**
	 * Generates a session access route for a given code.
	 * @param code - Temporary access code for session joining
	 * @returns URL path for session access
	 */
	session: (code: string) => `/code/namespace/session/${code}`,
	
	/**
	 * Generates a group access route for a given code.
	 * @param code - Temporary access code for group joining
	 * @returns URL path for group access
	 */
	group: (code: string) => `/code/namespace/group/${code}`
};

/**
 * Zod schema for validating access code data structure.
 * 
 * Defines the required properties for temporary access codes including
 * target identification and expiration timestamps for security.
 */
export const CodeSchema = z.object({
	/** Target identifier (session ID, group ID, etc.) that the code grants access to */
	target: z.string().min(1),
	
	/** Expiration timestamp after which the code becomes invalid */
	exp: Timestamp
});

/**
 * TypeScript type inferred from the CodeSchema.
 * Represents a temporary access code with target and expiration information.
 */
export type Code = z.infer<typeof CodeSchema>;
