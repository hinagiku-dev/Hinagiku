/**
 * Internationalization (i18n) Configuration
 * 
 * This module configures internationalization for the Hinagiku educational platform
 * using Paraglide-SvelteKit. It provides multi-language support with automatic
 * URL prefixing and deployment-specific language defaults.
 * 
 * Supported Languages:
 * - English (en) - English interface and content
 * - Chinese (zh) - Traditional/Simplified Chinese interface and content
 * 
 * Features:
 * - Automatic URL prefixing for language routing (/en/..., /zh/...)
 * - Deployment-configurable default language
 * - API route exclusion from language prefixing
 * - Integration with deployment configuration system
 * - Type-safe language tag validation
 * 
 * URL Structure:
 * - /en/dashboard - English dashboard
 * - /zh/dashboard - Chinese dashboard
 * - /api/... - API routes (no language prefix)
 * 
 * @fileoverview Multi-language support configuration for the educational platform
 */

// File initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { deploymentConfig } from '$lib/config/deployment';
import * as runtime from '$lib/paraglide/runtime.js';
import { createI18n } from '@inlang/paraglide-sveltekit';

/**
 * Main internationalization instance for the Hinagiku platform.
 * 
 * Configuration:
 * - prefixDefaultLanguage: 'always' - Ensures all URLs have language prefixes
 * - defaultLanguageTag: Determined from deployment configuration with fallback
 * - exclude: API routes are excluded from language prefixing
 * 
 * The default language is determined from deployment configuration but falls
 * back to Chinese ('zh') if the configured language is invalid.
 * 
 * @example
 * ```ts
 * import { i18n } from '$lib/i18n';
 * 
 * // Use in route generation
 * const dashboardRoute = i18n.resolveRoute('/dashboard');
 * 
 * // Use in hooks for request processing
 * export const handle = i18n.handle();
 * ```
 */
export const i18n = createI18n(runtime, {
	/** Always prefix URLs with language code for consistency */
	prefixDefaultLanguage: 'always',
	
	/** 
	 * Default language determined from deployment config with validation.
	 * Falls back to Chinese if deployment config has invalid language.
	 */
	defaultLanguageTag: (deploymentConfig.defaultLanguage === 'en' ||
	deploymentConfig.defaultLanguage === 'zh'
		? deploymentConfig.defaultLanguage
		: 'zh') as 'en' | 'zh',
	
	/** Exclude API routes from language prefixing to maintain clean API URLs */
	exclude: [/^\/api\//]
});
