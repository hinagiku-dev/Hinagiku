/**
 * @fileoverview
 * User settings schema and utilities for the Hinagiku educational platform.
 * 
 * This module defines the structure for user-specific settings that control
 * educational platform behavior and features. Settings are personalized
 * configurations that affect how users interact with learning activities.
 * 
 * Features:
 * - Voice Activity Detection (VAD) configuration for individual and group activities
 * - Timestamp tracking for settings updates
 * - Route generation for settings management
 * - Schema validation with sensible defaults
 * - Type safety for settings operations
 * 
 * The settings system allows users to customize their educational experience,
 * particularly around audio features and interaction modes during learning
 * sessions.
 * 
 * @example
 * ```ts
 * import { SettingSchema, route } from '$lib/schema/setting';
 * 
 * // Create user settings with defaults
 * const userSettings = {
 *   updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
 *   enableVADIndividual: false,
 *   enableVADGroup: true
 * };
 * 
 * // Generate settings route
 * const settingsUrl = route(userId);
 * ```
 */

import { z } from 'zod';
import { Timestamp } from './utils';

/**
 * Generates a settings management route for a specific user.
 * 
 * @param uid - User ID for settings access
 * @returns URL path for user settings management
 */
export const route = (uid: string) => `/settings/${uid}`;

/**
 * Zod schema for validating user settings data structure.
 * 
 * Defines user-configurable options for educational platform features,
 * particularly around audio and interaction settings for learning activities.
 */
export const SettingSchema = z.object({
	/** Timestamp of when settings were last updated */
	updatedAt: Timestamp,
	
	/** 
	 * Enable Voice Activity Detection during individual learning phases.
	 * When enabled, automatically detects when students are speaking during solo activities.
	 * Default: false (manual control for individual work)
	 */
	enableVADIndividual: z.boolean().default(false),
	
	/** 
	 * Enable Voice Activity Detection during group learning phases.
	 * When enabled, automatically detects voice activity during group discussions.
	 * Default: true (automatic detection for collaborative activities)
	 */
	enableVADGroup: z.boolean().default(true)
});

/**
 * TypeScript type inferred from the SettingSchema.
 * Represents user-specific configuration options for platform features.
 */
export type Setting = z.infer<typeof SettingSchema>;
