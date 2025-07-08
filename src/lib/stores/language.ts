/**
 * Language Preference Store
 * 
 * This module manages user language preferences for the Hinagiku educational platform.
 * It provides persistent storage of language selection between browser sessions and
 * reactive updates for internationalization throughout the application.
 * 
 * Supported Languages:
 * - 'en' - English
 * - 'zh' - Chinese (Traditional/Simplified)
 * 
 * Features:
 * - Persistent storage using localStorage
 * - Reactive updates via Svelte stores
 * - Automatic fallback to English if no preference is saved
 * - Browser-safe initialization to prevent SSR issues
 * 
 * @fileoverview Language preference management with persistent storage
 */

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/**
 * Retrieves the saved language preference from localStorage.
 * Validates the stored value to ensure it's a supported language.
 * Falls back to English if no valid preference is found.
 * 
 * @returns The user's saved language preference or 'en' as default
 */
function getSavedLanguage() {
	if (browser) {
		const saved = localStorage.getItem('language');
		// Validate that the saved value is one of the supported languages
		if (saved === 'en' || saved === 'zh') {
			return saved;
		}
	}
	// Default to English if no valid preference is found
	return 'en';
}

/**
 * Reactive language preference store.
 * Contains the current language setting and automatically persists changes
 * to localStorage for consistency across browser sessions.
 * 
 * @example
 * ```ts
 * import { language } from '$lib/stores/language';
 * 
 * // Read current language
 * $: currentLang = $language;
 * 
 * // Change language
 * language.set('zh');
 * ```
 */
export const language = writable<'en' | 'zh'>(getSavedLanguage());

/**
 * Automatic persistence subscription.
 * Saves language changes to localStorage whenever the store value updates.
 * Only runs in browser environment to prevent SSR issues.
 */
if (browser) {
	language.subscribe((value) => {
		localStorage.setItem('language', value);
	});
}
