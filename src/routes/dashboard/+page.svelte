<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus, UserPlus, UserCog } from 'lucide-svelte';
	import {
		collection,
		collectionGroup,
		getDoc,
		limit,
		orderBy,
		query,
		QueryDocumentSnapshot,
		where
	} from 'firebase/firestore';
	import { user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Session } from '$lib/schema/session';
	import type { Group } from '$lib/schema/group';

	let { data } = $props();

	// Query for sessions created by user
	let [createdSessions, { unsubscribe: unsubscribe1 }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('host', '==', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(5)
		)
	);

	// Query for active sessions where user is a participant
	let [joinedGroups, { unsubscribe: unsubscribe2 }] = subscribeAll<Group>(
		query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid),
			limit(10)
		)
	);

	// Create a derived store to get the parent session documents
	let joinedSessions = $derived(
		$joinedGroups
			?.map(async ([groupDoc]) => {
				const sessionDoc = await getDoc(groupDoc.ref.parent.parent!);
				if (sessionDoc.exists()) {
					return [sessionDoc, sessionDoc.data() as Session] as const;
				}
				return null;
			})
			.filter((session): session is Promise<[QueryDocumentSnapshot, Session]> => session !== null)
	);

	onDestroy(() => {
		unsubscribe1();
		unsubscribe2();
	});
</script>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-2 text-gray-600">Welcome back, {$profile?.displayName || $user?.displayName}</p>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/create" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<MessageSquarePlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Create Discussion Session</h2>
				<p class="text-gray-600">Start a new discussion session as a host</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/join" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserPlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Join Discussion Session</h2>
				<p class="text-gray-600">Join an existing discussion using a session code</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/profile" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserCog size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Edit Profile</h2>
				<p class="text-gray-600">Update your profile settings and preferences</p>
			</a>
		</Card>
	</div>

	<!-- Recent Sessions -->
	<div class="mt-12 space-y-8">
		<!-- Joined Sessions -->
		{#if joinedSessions?.length}
			<div>
				<h2 class="mb-4 text-2xl font-semibold text-gray-900">Active Sessions You Joined</h2>
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each joinedSessions as sessionPromise}
						{#await sessionPromise}
							<Card padding="lg" class="animate-pulse">
								<div class="h-20 bg-gray-200"></div>
							</Card>
						{:then [doc, session]}
							<Card padding="lg" class="transition-all hover:border-primary-500">
								<a href="/session/{doc.id}" class="block">
									<div class="mb-4 flex items-center justify-between">
										<h3 class="line-clamp-1 text-xl font-semibold text-gray-900">
											{session.title}
										</h3>
										<span
											class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600"
										>
											Active
										</span>
									</div>
									<div class="flex items-center justify-between">
										<p class="text-gray-600">Stage: {session.stage}</p>
									</div>
								</a>
							</Card>
						{/await}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Created Sessions -->
		<div>
			<h2 class="mb-4 text-2xl font-semibold text-gray-900">Sessions You Created</h2>
			{#if $createdSessions?.length}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each $createdSessions as [doc, session]}
						<Card padding="lg" class="transition-all hover:border-primary-500">
							<a href="/session/{doc.id}" class="block">
								<div class="mb-4 flex items-center justify-between">
									<h3 class="line-clamp-1 text-xl font-semibold text-gray-900">{session.title}</h3>
									<span
										class="rounded-full px-3 py-1 text-sm font-medium {session.status === 'active'
											? 'bg-green-100 text-green-600'
											: session.status === 'preparing'
												? 'bg-yellow-100 text-yellow-600'
												: 'bg-gray-100 text-gray-600'}"
									>
										{session.status}
									</span>
								</div>
								<div class="flex items-center justify-between">
									<p class="text-gray-600">Stage: {session.stage}</p>
								</div>
							</a>
						</Card>
					{/each}
				</div>
			{:else}
				<Card>
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">No sessions created yet</p>
						<p class="mb-4 text-gray-600">Create your first session to get started</p>
						<Button href="/create" color="primary">Create Your First Session</Button>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
