<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { Card, Button } from 'flowbite-svelte';
	import { UserPlus, UserCog } from 'lucide-svelte';
	import {
		orderBy,
		limit,
		query,
		where,
		Timestamp,
		collectionGroup,
		getDoc,
		getDocs
	} from 'firebase/firestore';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import type { Session } from '$lib/schema/session';
	import { user } from '$lib/stores/auth';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import Title from '$lib/components/Title.svelte';

	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	let sessions = writable<[string, Session][]>([]);

	async function getSessions() {
		const sessionQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(MAX_RECENT_SESSIONS)
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

<Title page="Dashboard" />

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">{m.dashboard()}</h1>
		<p class="mt-2 text-gray-600">
			{m.welcomeDashboard()}, {$profile?.displayName || $user?.displayName}
		</p>
	</div>

	<!-- Main Actions -->
	<div class="mb-16 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/join" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserPlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{m.dashjoinSession()}
				</h2>
				<p class="text-gray-600">{m.dashjoinSessionDesc()}</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/profile" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserCog size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{m.editProfile()}
				</h2>
				<p class="text-gray-600">{m.editProfileDesc()}</p>
			</a>
		</Card>
	</div>

	<!-- Recent participant Session-->
	{#if $sessions.length}
		<div class="mt-16">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-900">
					{m.recentActivity()}
				</h2>
				<Button color="alternative" href="/dashboard/recent/participant">{m.viewAll()}</Button>
			</div>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each $sessions as [id, session]}
					<SessionCard
						{id}
						title={session.title}
						status={session.status}
						labels={session.labels}
						task={session.task}
						host={session.host}
						createdAt={(session.createdAt as Timestamp).toDate()}
						classId={session.classId}
					/>
				{/each}
			</div>
		</div>
	{/if}
</main>
