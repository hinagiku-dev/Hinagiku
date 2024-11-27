<script lang="ts">
	import { getContext } from 'svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import HostView from '$lib/components/session/HostView.svelte';
	import ParticipantView from '$lib/components/session/ParticipantView.svelte';

	let { data } = $props();
	let session = getContext<Readable<Session>>('session');
	let isHost = $derived($session?.host === data.user.uid);
</script>

{#if isHost}
	<HostView {session} />
{:else}
	<ParticipantView {session} user={data.user} />
{/if}
