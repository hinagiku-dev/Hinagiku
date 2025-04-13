// file initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { deploymentConfig } from '$lib/config/deployment';
import * as runtime from '$lib/paraglide/runtime.js';
import { createI18n } from '@inlang/paraglide-sveltekit';
// src/lib/i18n.js
export const i18n = createI18n(runtime, {
	prefixDefaultLanguage: 'always',
	defaultLanguageTag: (deploymentConfig.defaultLanguage === 'en' ||
	deploymentConfig.defaultLanguage === 'zh'
		? deploymentConfig.defaultLanguage
		: 'zh') as 'en' | 'zh',
	// Exclude API routes from language prefixing
	exclude: [/^\/api\//]
});
