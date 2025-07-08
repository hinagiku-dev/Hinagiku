/**
 * @fileoverview
 * Deployment-specific configuration management for the Hinagiku educational platform.
 * 
 * This module provides flexible deployment configuration through environment variables,
 * allowing different instances of the platform to customize:
 * - Site branding and titles
 * - Primary and secondary color schemes
 * - Default language settings
 * - Theme customization
 * 
 * Configuration follows a priority system:
 * 1. Environment variables (PUBLIC_HINAGIKU_*) - highest priority
 * 2. Default configuration values - fallback
 * 
 * All configuration is validated using Zod schemas to ensure type safety
 * and provide meaningful error messages for invalid configurations.
 * 
 * Environment Variables:
 * - PUBLIC_HINAGIKU_SITE_TITLE: Custom site title
 * - PUBLIC_HINAGIKU_PRIMARY_COLOR: Primary theme color (hex format)
 * - PUBLIC_HINAGIKU_SECONDARY_COLOR: Secondary theme color (hex format)
 * - PUBLIC_HINAGIKU_DEFAULT_LANGUAGE: Default language ('en' or 'zh')
 * 
 * @example
 * ```ts
 * import { deploymentConfig } from '$lib/config/deployment';
 * 
 * // Access configuration values
 * console.log(deploymentConfig.siteTitle); // "Hinagiku" or custom title
 * console.log(deploymentConfig.primaryColor); // "#ff5733" or custom color
 * ```
 */

// Do not modify this file directly. Instead, create a deployment-specific .env file
// with variables that override these settings.

import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { z } from 'zod';

/**
 * Zod schema for deployment configuration validation.
 * Ensures all configuration values meet requirements and provides defaults.
 */
const deploymentConfigSchema = z.object({
	/** Site title displayed in browser tabs and navigation */
	siteTitle: z.string().min(1).default('Hinagiku'),
	
	/** Primary color for UI elements (must be valid hex color) */
	primaryColor: z
		.string()
		.regex(/^#([0-9A-Fa-f]{6})$/, {
			message: 'Primary color must be a valid hex color code (e.g., #8b5cf6)'
		})
		.default('#8b5cf6'),
		
	/** Secondary color for accent elements (must be valid hex color) */
	secondaryColor: z
		.string()
		.regex(/^#([0-9A-Fa-f]{6})$/, {
			message: 'Secondary color must be a valid hex color code (e.g., #10b981)'
		})
		.default('#10b981'),
		
	/** Default language for new users and fallback content */
	defaultLanguage: z.enum(['en', 'zh']).default('zh')
});

/**
 * TypeScript type inferred from the Zod schema.
 * Provides type safety for deployment configuration usage.
 */
type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;

/**
 * Default configuration values used as fallbacks.
 * These values are used when environment variables are not provided
 * or when configuration loading fails.
 */
const defaultConfig: DeploymentConfig = {
	siteTitle: 'Hinagiku',
	primaryColor: '#ff5733', // Orange hue color for default branding
	secondaryColor: '#4a90e2', // Blue color for secondary elements
	defaultLanguage: 'zh' // Chinese as default language
};

/**
 * Loads and validates deployment configuration from environment variables.
 * 
 * Reads PUBLIC_HINAGIKU_* environment variables and validates them against
 * the deployment schema. Falls back to default configuration if validation
 * fails or environment variables are missing.
 * 
 * @returns Validated deployment configuration object
 */
function loadConfigFromEnv(): DeploymentConfig {
	try {
		// Extract configuration from environment variables
		const envConfig = {
			siteTitle: env.PUBLIC_HINAGIKU_SITE_TITLE,
			primaryColor: env.PUBLIC_HINAGIKU_PRIMARY_COLOR,
			secondaryColor: env.PUBLIC_HINAGIKU_SECONDARY_COLOR,
			defaultLanguage: env.PUBLIC_HINAGIKU_DEFAULT_LANGUAGE
		};

		// Remove undefined values to allow schema defaults to apply
		const cleanedConfig = Object.fromEntries(
			Object.entries(envConfig).filter(([, value]) => value !== undefined)
		);

		// Validate configuration using Zod schema with defaults
		const validatedConfig = deploymentConfigSchema.parse({
			...defaultConfig,
			...cleanedConfig
		});

		// Debug output in development environment
		if (dev) {
			console.log('Loaded deployment config:', validatedConfig);
		}

		return validatedConfig;
	} catch (error) {
		// Handle validation errors with detailed error messages
		if (error instanceof z.ZodError) {
			console.error(
				'Invalid deployment config:',
				error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
			);
		} else {
			console.error('Error loading deployment config:', error);
		}

		// Log fallback usage in development
		if (dev) {
			console.warn('Falling back to default configuration');
		}

		return defaultConfig;
	}
}

/**
 * Exported deployment configuration object.
 * Contains validated configuration values loaded from environment variables
 * with fallbacks to default values.
 */
export const deploymentConfig: DeploymentConfig = loadConfigFromEnv();
