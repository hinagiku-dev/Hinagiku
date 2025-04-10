<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Notifications from '$lib/components/Notifications.svelte';
	import ThemeManager from '$lib/components/ThemeManager.svelte';
	import debug from 'debug';
	import { setLanguageTag } from '$lib/paraglide/runtime';
	import { language } from '$lib/stores/language';
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';

	debug.enable('app:*');

	// Log environment variables for debugging
	if (browser && import.meta.env.DEV) {
		console.log('Layout initialization - browser environment');
		console.log(
			'Public environment variables available:',
			Object.keys(env).filter((key) => key.startsWith('PUBLIC_'))
		);
	}

	setLanguageTag($language);
	console.log('layout language tag', $language);
	let { children } = $props();
</script>

<ParaglideJS {i18n}>
	<!-- Apply deployment-specific theme settings -->
	<ThemeManager />

	<main>
		<Navbar />
		{@render children()}
		<Notifications />
	</main>
</ParaglideJS>

<style>
	main {
		margin-left: 0;
		transition: margin-left 0.3s ease;
		margin-top: 3.5rem;
	}
</style>
