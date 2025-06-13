<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import {
		query,
		where,
		Timestamp,
		collectionGroup,
		getDoc,
		getDocs,
		orderBy,
		limit
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import type { Session } from '$lib/schema/session';
	import { onMount } from 'svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	let sessions = writable<[string, Session][]>([]);
	let selectedLabels = writable<string[]>([]);

	let availableLabels = derived(sessions, ($sessions) => {
		if ($sessions.length === 0) return [];
		const labels = new Set<string>();
		$sessions.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	let filteredSessions = derived([sessions, selectedLabels], ([$sessions, $selectedLabels]) => {
		if (!$sessions || $selectedLabels.length === 0) return $sessions;
		return $sessions.filter(([, session]) =>
			$selectedLabels.every((label) => session.labels?.includes(label))
		);
	});

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	async function getSessions() {
		const sessionQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(100)
		);
		const sessionSnapshot = await getDocs(sessionQuery);
		const sess: Promise<[string, Session]>[] = [];
		for (const groupDoc of sessionSnapshot.docs) {
			const sessionDocRef = groupDoc.ref.parent.parent;
			if (sessionDocRef) {
				sess.push(
					(async () => {
						const sessionDoc = await getDoc(sessionDocRef);
						const session = sessionDoc.data() as Session;
						return [sessionDoc.id, { ...session, host: session.host }];
					})()
				);
			}
		}
		sessions.set(await Promise.all(sess));
	}

	onMount(() => {
		getSessions();
	});
</script>

<svelte:head>
	<title>{m.recentParticipatedSessions()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{m.recentParticipatedSessions()}</h1>
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
			{#if $filteredSessions.length}
				{#each $filteredSessions as [id, session]}
					<SessionCard
						{id}
						title={session.title}
						status={session.status}
						labels={session.labels}
						task={session.task}
						host={session.host}
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
							{m.noSessionsJoined()}
						</p>
						<Button href="/join" color="primary" class="w-full">
							{m.joinASession()}
						</Button>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
