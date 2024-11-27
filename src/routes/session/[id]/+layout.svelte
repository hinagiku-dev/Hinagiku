<script lang="ts">
	import { page } from '$app/stores';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { route, type Session } from '$lib/schema/session';
	import { doc } from 'firebase/firestore';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	let { children } = $props();

	const ref = doc(db, route($page.params.id));
	const session = writable<Session | null>(null);
	setContext('session', session);
	onMount(() => {
		const [, { unsubscribe }] = subscribe<Session>(ref, session);
		return unsubscribe;
	});
</script>

{@render children()}
