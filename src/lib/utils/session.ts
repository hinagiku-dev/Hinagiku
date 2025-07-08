/**
 * Session Utility Functions
 * 
 * This module provides utility functions for session management in the Hinagiku
 * educational platform. It includes temporary ID generation for anonymous participation
 * and validation functions for ensuring proper session identifiers.
 * 
 * Temporary IDs allow students to join sessions without full account registration,
 * facilitating quick access to educational activities while maintaining basic
 * identity tracking for group organization and progress monitoring.
 * 
 * @fileoverview Utility functions for session management and identification
 */

/**
 * Generates a temporary 6-digit numeric identifier for anonymous session participation.
 * 
 * These temporary IDs serve as lightweight user identifiers for students who:
 * - Want to join sessions quickly without registration
 * - Are in classrooms with shared devices
 * - Need immediate access to educational activities
 * 
 * The 6-digit format provides a good balance between:
 * - Memorability for students (easy to share/remember)
 * - Uniqueness within a session context
 * - Simplicity for manual entry via mobile devices
 * 
 * @returns A 6-digit numeric string (e.g., "123456", "987654")
 * 
 * @example
 * ```ts
 * const tempId = generateTempId();
 * console.log(tempId); // "456789"
 * 
 * // Use for anonymous session joining
 * const participant = {
 *   id: tempId,
 *   isTemporary: true,
 *   joinedAt: new Date()
 * };
 * ```
 */
export function generateTempId(): string {
	// Generate a random 6-digit number between 100000 and 999999
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validates that a string is a properly formatted temporary ID.
 * 
 * Ensures the ID meets the expected format requirements:
 * - Exactly 6 digits
 * - No letters or special characters
 * - No leading/trailing whitespace
 * 
 * This validation is used for:
 * - Input sanitization when users enter temp IDs
 * - Data integrity checks before database operations
 * - UI validation feedback for form submissions
 * 
 * @param id - The string to validate as a temporary ID
 * @returns True if the ID is a valid 6-digit number, false otherwise
 * 
 * @example
 * ```ts
 * validateTempId("123456");    // true
 * validateTempId("12345");     // false (too short)
 * validateTempId("1234567");   // false (too long)
 * validateTempId("12345a");    // false (contains letter)
 * validateTempId(" 123456 ");  // false (has whitespace)
 * ```
 */
export function validateTempId(id: string): boolean {
	// Test against regex pattern for exactly 6 digits
	return /^\d{6}$/.test(id);
}
