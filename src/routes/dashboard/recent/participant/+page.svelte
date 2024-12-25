<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import {
		query,
		where,
		Timestamp,
		collectionGroup,
		doc,
		getDoc,
		getDocs
	} from 'firebase/firestore';
	import { user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import type { Session } from '$lib/schema/session';
	import { onMount } from 'svelte';

	let { data } = $props();

	let unsoredsessions = writable<[string, string, Session][]>([]);

	let sessions = derived(unsoredsessions, ($unsoredsessions) =>
		$unsoredsessions.sort(
			(a, b) => (b[2].createdAt as Timestamp).toMillis() - (a[2].createdAt as Timestamp).toMillis()
		)
	);

	async function getSessions() {
		const sessionQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid)
		);
		const sessionSnapshot = await getDocs(sessionQuery);
		sessionSnapshot.forEach(async (docu) => {
			const session = await getDoc(docu.ref.parent.parent!);
			const host = await getDoc(doc(db, 'profiles', session.data()?.host));
			let hoster = '';
			if (!host.exists()) {
				hoster = 'Unknown';
			} else {
				hoster = host.data()?.displayName;
			}
			unsoredsessions.update((value) => [
				...value,
				[hoster, session.id, session.data() as Session]
			]);
		});
	}

	onMount(() => {
		getSessions();
	});
</script>

<svelte:head>
	<title>Recent Participant Sessions | Hinagiku</title>
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

	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Recent Participant Sessions</h2>
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $sessions.length}
				{#each $sessions as [hoster, docid, session]}
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<div>
							<h3 class="mb-2 text-xl font-bold">{session.title}</h3>
							<p class="mb-4 line-clamp-2 text-gray-600">{session.task}</p>
							<p class="mb-4 line-clamp-2 text-blue-600">Now is in {session.status} stage.</p>
							<p class="line-clamp-2 text-gray-500">Host by: {hoster}</p>
							<div class="mb-4 flex items-center gap-4">
								<span class="text-sm text-gray-500">
									{(session.createdAt as Timestamp).toDate().toLocaleString()}
								</span>
							</div>
							<Button href="/session/{docid}" class="w-full">View Session</Button>
						</div>
					</Card>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">No sessions joined yet</p>
						<Button href="/join" color="primary" class="w-full">Join a session</Button>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
