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

<svelte:head>
	<title>Session | Hinagiku</title>
</svelte:head>

{#if isHost}
	<div class="mx-4">
		<HostView {session} />
	</div>
{:else}
	<div class="mx-4">
		<ParticipantView {session} user={data.user} />
	</div>
{/if}
