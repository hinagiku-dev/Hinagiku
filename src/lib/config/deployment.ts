// Deployment-specific configuration
// This file handles deployment-specific settings such as language, title, colors, etc.
// Do not modify this file directly. Instead, create a deployment-specific .env file
// with variables that override these settings.

import { env } from '$env/dynamic/public';

type DeploymentConfig = {
	// Site title
	siteTitle: string;

	// Theme colors
	primaryColor: string;
	secondaryColor: string;
};

// Default configuration (don't change this)
const defaultConfig: DeploymentConfig = {
	siteTitle: 'Hinagiku',
	primaryColor: '#8b5cf6', // Default violet color
	secondaryColor: '#10b981' // Default emerald color
};

// Load environment variables to override default configuration
function loadConfigFromEnv(): DeploymentConfig {
	try {
		// Access environment variables using $env/dynamic/public
		const config = {
			siteTitle: env.PUBLIC_SITE_TITLE || defaultConfig.siteTitle,
			primaryColor: env.PUBLIC_PRIMARY_COLOR || defaultConfig.primaryColor,
			secondaryColor: env.PUBLIC_SECONDARY_COLOR || defaultConfig.secondaryColor
		};

		// Debug output in development environment
		if (import.meta.env.DEV) {
			console.log('Loaded deployment config:', config);
		}

		return config;
	} catch (error) {
		console.error('Error loading deployment config:', error);
		return defaultConfig;
	}
}

// Export the configuration
export const deploymentConfig: DeploymentConfig = loadConfigFromEnv();
