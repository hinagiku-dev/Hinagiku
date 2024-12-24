<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Notifications from '$lib/components/Notifications.svelte';
	import debug from 'debug';

	debug.enable('app:*');

	let { children } = $props();
</script>

<main>
	<Navbar />
	{@render children()}
	<Notifications />
</main>

<style>
	main {
		margin-left: 0;
		transition: margin-left 0.3s ease;
		margin-top: 3.5rem;
	}
</style>
