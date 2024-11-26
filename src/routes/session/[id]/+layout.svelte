<script lang="ts">
	import { page } from '$app/stores';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import type { Session } from '$lib/schema/session';
	import { doc } from 'firebase/firestore';
	import { onDestroy, onMount, setContext } from 'svelte';

	let { children } = $props();

	const ref = doc(db, 'sessions', $page.params.id);
	const [session, { unsubscribe }] = subscribe<Session>(ref);
	onMount(() => {
		setContext('session', session);
	});
	onDestroy(() => {
		unsubscribe();
	});
</script>

{@render children()}
