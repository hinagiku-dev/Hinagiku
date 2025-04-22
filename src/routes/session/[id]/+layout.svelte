<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { route, type Session } from '$lib/schema/session';
	import { doc } from 'firebase/firestore';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { announcement } from '$lib/stores/announcement';
	import { browser } from '$app/environment';
	import DvdAnnouncement from '$lib/components/session/DvdAnnouncement.svelte';

	let { children } = $props();

	// Use proper typing for state variables
	let currentSessionData: Session | null = $state(null);

	// Get session ID directly from page data
	const sessionId = page.params.id;
	const ref = doc(db, route(sessionId));

	const session = writable<Session | null>(null);
	setContext('session', session);

	// Listen for announcement changes
	onMount(() => {
		if (!browser) return;

		const [, { unsubscribe: sessionUnsubscribe }] = subscribe<Session>(ref, session);

		// Set up a real-time listener for announcements
		let announcementUnsubscribe = () => {};

		// Listen for session updates and handle announcements
		const unsubSessionAnnouncement = session.subscribe((sessionData) => {
			currentSessionData = sessionData;

			if (sessionData?.announcement?.active) {
				announcement.broadcast(sessionData.announcement.message);
			} else {
				announcement.cancel();
			}
		});

		return () => {
			sessionUnsubscribe();
			unsubSessionAnnouncement();
			announcementUnsubscribe();
		};
	});
</script>

<DvdAnnouncement sessionData={currentSessionData} hostId={currentSessionData?.host} />

{@render children()}
