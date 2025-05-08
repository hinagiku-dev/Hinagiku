<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { route, type Session } from '$lib/schema/session';
	import { doc } from 'firebase/firestore';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { announcement } from '$lib/stores/announcement';
	import DvdAnnouncement from '$lib/components/session/DvdAnnouncement.svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	// Get session ID directly from page data
	const sessionId = page.params.id;
	const ref = doc(db, route(sessionId));

	// State to track if announcement should be shown
	let showAnnouncement = $state(false);

	const session = writable<Session | null>(null);
	setContext('session', session);

	// Listen for session updates
	onMount(() => {
		// Subscribe to Firestore updates
		const [, { unsubscribe }] = subscribe<Session>(ref, session);

		return () => {
			unsubscribe();
		};
	});

	// Monitor session data for announcement changes
	$effect(() => {
		if (!browser) return;

		// Get the latest session data
		const sessionData = $session;

		// Check if we should show the announcement
		showAnnouncement = Boolean(sessionData?.announcement?.active) && announcement.shouldShow();

		// Update announcement store with the latest data
		if (sessionData?.announcement?.active) {
			announcement.broadcast(sessionData.announcement.message);
		} else {
			announcement.cancel();
		}
	});
</script>

{#if showAnnouncement}
	<DvdAnnouncement />
{/if}

{#if $session?.backgroundImage}
	<div
		class="app-background bg-cover bg-center bg-no-repeat opacity-15"
		style="background-image: url('{$session.backgroundImage}');"
	></div>
{/if}

<div class="relative z-10 min-h-screen">
	{@render children()}
</div>

<style>
	:global(html, body) {
		background-color: transparent;
	}
	:global(.app-background) {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: -10;
	}
</style>
