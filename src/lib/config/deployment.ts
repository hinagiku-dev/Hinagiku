// Deployment-specific configuration
// This file handles deployment-specific settings such as language, title, colors, etc.
// Do not modify this file directly. Instead, create a deployment-specific .env file
// with variables that override these settings.

import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { z } from 'zod';

// Define schema for deployment configuration
const deploymentConfigSchema = z.object({
	siteTitle: z.string().min(1).default('Hinagiku'),
	primaryColor: z
		.string()
		.regex(/^#([0-9A-Fa-f]{6})$/, {
			message: 'Primary color must be a valid hex color code (e.g., #8b5cf6)'
		})
		.default('#8b5cf6'),
	secondaryColor: z
		.string()
		.regex(/^#([0-9A-Fa-f]{6})$/, {
			message: 'Secondary color must be a valid hex color code (e.g., #10b981)'
		})
		.default('#10b981'),
	defaultLanguage: z.enum(['en', 'zh']).default('zh')
});

// Infer the type from the schema
type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;

// Default configuration (don't change this)
// Default colors:
// PRIMARY_COLOR="#ff5733"
// SECONDARY_COLOR="#4a90e2"
const defaultConfig: DeploymentConfig = {
	siteTitle: 'Hinagiku',
	primaryColor: '#ff5733', // Default violet color
	secondaryColor: '#4a90e2', // Default emerald color
	defaultLanguage: 'zh' // Default language
};

// Load environment variables to override default configuration
function loadConfigFromEnv(): DeploymentConfig {
	try {
		// Create an object with values from environment variables
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

		// Parse and validate using Zod schema
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
		// Log validation errors with details and fall back to default config
		if (error instanceof z.ZodError) {
			console.error(
				'Invalid deployment config:',
				error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
			);
		} else {
			console.error('Error loading deployment config:', error);
		}

		if (dev) {
			console.warn('Falling back to default configuration');
		}

		return defaultConfig;
	}
}

// Export the configuration
export const deploymentConfig: DeploymentConfig = loadConfigFromEnv();
