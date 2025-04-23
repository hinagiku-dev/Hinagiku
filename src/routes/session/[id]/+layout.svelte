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

	let { children } = $props();

	// Get session ID directly from page data
	const sessionId = page.params.id;
	const ref = doc(db, route(sessionId));

	const session = writable<Session | null>(null);
	setContext('session', session);

	// Listen for session updates
	onMount(() => {
		// Subscribe to Firestore updates once
		const [, { unsubscribe: sessionUnsubscribe }] = subscribe<Session>(ref, session);

		return () => {
			sessionUnsubscribe();
		};
	});

	// Use $effect to handle announcements based on session data
	$effect(() => {
		// Access session data using $ prefix (reactive subscription)
		const sessionData = $session;

		// Handle announcement state changes
		if (sessionData?.announcement?.active) {
			announcement.broadcast(sessionData.announcement.message);
		} else {
			announcement.cancel();
		}
	});
</script>

<DvdAnnouncement />

{@render children()}
