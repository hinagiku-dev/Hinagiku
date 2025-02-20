import { browser } from '$app/environment';
import { writable } from 'svelte/store';

function getSavedLanguage() {
	if (browser) {
		const saved = localStorage.getItem('language');
		if (saved === 'en' || saved === 'zh') {
			return saved;
		}
	}
	return 'en';
}

export const language = writable<'en' | 'zh'>(getSavedLanguage());

if (browser) {
	language.subscribe((value) => {
		localStorage.setItem('language', value);
	});
}

export function getLocalizedHref(href: string) {
	let currentLang: 'en' | 'zh';
	language.subscribe((value) => (currentLang = value))();

	if (currentLang === 'zh' && !href.startsWith('/zh')) {
		return '/zh' + href;
	} else if (currentLang === 'en' && href.startsWith('/zh')) {
		return href.replace('/zh', '');
	}
	return href;
}
