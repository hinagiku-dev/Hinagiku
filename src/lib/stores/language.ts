import { browser } from '$app/environment';
import { writable } from 'svelte/store';

function getSavedLanguage() {
	if (browser) {
		const saved = localStorage.getItem('language');
		if (saved === 'en' || saved === 'zh') {
			return saved;
		}
	}
	return 'zh';
}

export const language = writable<'en' | 'zh'>(getSavedLanguage());

if (browser) {
	language.subscribe((value) => {
		localStorage.setItem('language', value);
	});
}
