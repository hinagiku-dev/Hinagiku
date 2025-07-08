/**
 * @fileoverview
 * Client-side hooks for the Hinagiku educational platform.
 * 
 * This module configures client-side routing and internationalization behavior.
 * Currently handles URL rerouting for multi-language support through Paraglide,
 * ensuring users are directed to the appropriate language-specific routes based
 * on their browser preferences or explicit language selection.
 * 
 * The reroute function automatically handles:
 * - Language detection from browser settings
 * - URL rewriting for language-specific paths
 * - Fallback to default language when needed
 * 
 * @see $lib/i18n Internationalization configuration
 */

// File initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { i18n } from '$lib/i18n';

/**
 * Configure client-side routing with internationalization support.
 * Automatically reroutes requests to appropriate language-specific URLs.
 */
export const reroute = i18n.reroute();
