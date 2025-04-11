// file initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { env } from '$env/dynamic/public';
import * as runtime from '$lib/paraglide/runtime.js';
import { createI18n } from '@inlang/paraglide-sveltekit';

// src/lib/i18n.js
export const i18n = createI18n(runtime, {
	prefixDefaultLanguage: 'always',
	defaultLanguageTag: (env.PUBLIC_DEFAULT_LANGUAGE === 'en' || env.PUBLIC_DEFAULT_LANGUAGE === 'zh'
		? env.PUBLIC_DEFAULT_LANGUAGE
		: 'zh') as 'en' | 'zh',
	// Exclude API routes from language prefixing
	exclude: [/^\/api\//]
});
