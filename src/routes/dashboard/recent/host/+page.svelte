<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import { collection, orderBy, query, where, Timestamp, limit } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Session } from '$lib/schema/session';
	import { writable, derived } from 'svelte/store';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();

	let [hostSessions, { unsubscribe: unsubscribe }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('host', '==', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(100)
		)
	);

	let selectedLabels = writable<string[]>([]);

	let filteredHostSessions = derived(
		[hostSessions, selectedLabels],
		([$hostSessions, $selectedLabels]) => {
			if (!$hostSessions || $selectedLabels.length === 0) return $hostSessions;
			return $hostSessions.filter(([, session]) =>
				$selectedLabels.every((label) => session.labels?.includes(label))
			);
		}
	);

	let availableLabels = derived(hostSessions, ($hostSessions) => {
		if (!$hostSessions) return [];
		const labels = new Set<string>();
		$hostSessions.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	onDestroy(() => {
		unsubscribe();
	});
</script>

<svelte:head>
	<title>{m.recentHostActivity()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{m.recentHostActivity()}</h1>
		</div>
		<div class="text-right">
			<Button href="/dashboard">{m.backToDashboard()}</Button>
		</div>
	</div>

	<div class="my-8">
		<div class="mb-4 flex flex-wrap gap-2">
			{#each $availableLabels as label}
				<Button
					size="xs"
					color={$selectedLabels.includes(label) ? 'primary' : 'alternative'}
					on:click={() => handleLabelSelect(label)}
				>
					{label}
				</Button>
			{/each}
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $filteredHostSessions?.length}
				{#each $filteredHostSessions as [doc, session]}
					<SessionCard
						id={doc.id}
						title={session.title}
						status={session.status}
						labels={session.labels}
						task={session.task}
						createdAt={(session.createdAt as Timestamp).toDate()}
					/>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">
							{m.noSessions()}
						</p>
						<p class="mb-4 text-gray-600">
							{m.createSession()}
						</p>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
