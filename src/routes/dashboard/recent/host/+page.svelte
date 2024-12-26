<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import { collection, orderBy, query, where, Timestamp } from 'firebase/firestore';
	import { user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Session } from '$lib/schema/session';
	import { writable, derived } from 'svelte/store';

	let { data } = $props();

	let [hostSessions, { unsubscribe: unsubscribe }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('host', '==', data.user.uid),
			orderBy('createdAt', 'desc')
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
	<title>Recent Host Sessions | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Recent Sessions</h1>
			<p class="mt-2 text-gray-600">Welcome back, {$profile?.displayName || $user?.displayName}</p>
		</div>
		<div class="text-right">
			<Button href="/dashboard">Back to Dashboard</Button>
		</div>
	</div>

	<!-- Recent Session -->
	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Recent Host Sessions</h2>
		</div>
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
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<div>
							<h3 class="mb-2 text-xl font-bold">{session.title}</h3>
							<div class="mb-4 flex min-h-[28px] flex-wrap gap-2">
								{#if session.labels?.length}
									{#each session.labels.sort() as label}
										<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
											{label}
										</span>
									{/each}
								{/if}
							</div>
							<p class="mb-4 line-clamp-2 text-gray-600">{session.task}</p>
							<p class="mb-4 line-clamp-2 text-blue-600">Now is in {session.status} stage.</p>
							<div class="mb-4 flex items-center gap-4">
								<span class="text-sm text-gray-500">
									{(session.createdAt as Timestamp).toDate().toLocaleString()}
								</span>
							</div>
							<Button href="/session/{doc.id}" class="w-full">View Session</Button>
						</div>
					</Card>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">No sessions created yet</p>
						<p class="mb-4 text-gray-600">Create a new session with template</p>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
