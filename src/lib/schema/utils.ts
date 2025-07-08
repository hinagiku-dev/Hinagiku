/**
 * @fileoverview
 * Utility schemas and validation helpers for the Hinagiku educational platform.
 * 
 * This module provides common Zod schema definitions and validation utilities
 * that are shared across different parts of the application. It addresses
 * specific challenges with Firebase Firestore data types and provides
 * consistent validation patterns.
 * 
 * Features:
 * - Custom Zod schema for Firestore Timestamp validation
 * - Cross-environment compatibility for server and client contexts
 * - Type-safe validation for complex Firebase data structures
 * - Reusable validation patterns for consistent data handling
 * 
 * The module specifically addresses the issue where Firestore uses different
 * Timestamp classes on server and client, making instanceof checks unreliable.
 * Instead, it uses structural validation to ensure timestamp objects have
 * the expected properties.
 * 
 * @example
 * ```ts
 * import { Timestamp } from '$lib/schema/utils';
 * import { z } from 'zod';
 * 
 * // Use in other schemas
 * const EventSchema = z.object({
 *   name: z.string(),
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * });
 * 
 * // Validate timestamp data
 * const isValidTimestamp = Timestamp.safeParse(someTimestampObject);
 * ```
 */

import { z } from 'zod';

/**
 * Custom Zod schema for validating Firestore Timestamp objects.
 * 
 * This schema validates Firestore Timestamp objects by checking their structure
 * rather than using instanceof checks, which are unreliable due to Firestore
 * using different Timestamp classes on server and client environments.
 * 
 * The schema validates that the object has:
 * - A 'seconds' property of type number
 * - A 'nanoseconds' property of type number
 * 
 * This structural validation ensures compatibility across different Firestore
 * SDK contexts while maintaining type safety.
 * 
 * @example
 * ```ts
 * // Valid Firestore Timestamp structure
 * const timestamp = { seconds: 1640995200, nanoseconds: 0 };
 * const result = Timestamp.parse(timestamp); // ✅ Valid
 * 
 * // Invalid structure
 * const invalid = { seconds: "1640995200", nanoseconds: 0 };
 * const result = Timestamp.parse(invalid); // ❌ Throws ZodError
 * ```
 */
export const Timestamp = z.custom(
	(value) =>
		value instanceof Object &&
		typeof value.seconds === 'number' &&
		typeof value.nanoseconds === 'number',
	{
		message: 'Invalid Timestamp - must be an object with numeric seconds and nanoseconds properties'
	}
);
