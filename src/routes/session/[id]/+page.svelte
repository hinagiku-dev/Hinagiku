<script lang="ts">
	import { getContext } from 'svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import HostView from '$lib/components/session/HostView.svelte';
	import ParticipantView from '$lib/components/session/ParticipantView.svelte';
	import LabelManager from '$lib/components/session/LabelManager.svelte';
	import { page } from '$app/stores';
	import { language } from '$lib/stores/language'; // Import the global language store

	let { data } = $props();
	let session = getContext<Readable<Session>>('session');
	let isHost = $derived($session?.host === data.user.uid);
	let sessionId = $page.params.id;

	const translations = {
		en: {
			sessionLabels: 'Session Labels'
		},
		zh: {
			sessionLabels: '會話標籤'
		}
	};
</script>

<svelte:head>
	<title>Session | Hinagiku</title>
</svelte:head>

{#if isHost}
	<div class="mx-4">
		<HostView {session} />
		{#if $session.status === 'preparing' && isHost}
			<div class="mb-8">
				<h3 class="mb-4 text-lg font-semibold">{translations[$language].sessionLabels}</h3>
				<LabelManager {sessionId} labels={$session.labels || []} />
			</div>
		{/if}
	</div>
{:else}
	<div class="mx-4">
		<ParticipantView {session} user={data.user} />
	</div>
{/if}
