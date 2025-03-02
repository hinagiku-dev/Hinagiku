<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';

	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Notifications from '$lib/components/Notifications.svelte';
	import debug from 'debug';
	import { setLanguageTag } from '$lib/paraglide/runtime';
	import { language } from '$lib/stores/language';

	debug.enable('app:*');

	setLanguageTag($language);
	console.log('layout language tag', $language);
	let { children } = $props();
</script>

<ParaglideJS {i18n}>
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
