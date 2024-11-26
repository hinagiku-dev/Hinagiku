<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { MessageSquarePlus, UserPlus, UserCog } from 'lucide-svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import { collection, orderBy, query, where } from 'firebase/firestore';
	import type { Session } from '$lib/schema/session.js';
	import { onDestroy } from 'svelte';

	let { data } = $props();

	let [created, { unsubscribe: unsubscribe1 }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('host', '==', data.user.uid),
			orderBy('createdAt', 'desc')
		)
	);
	let [joined, { unsubscribe: unsubscribe2 }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('participants', 'array-contains', data.user.uid),
			orderBy('createdAt', 'desc')
		)
	);
	onDestroy(() => {
		unsubscribe1();
		unsubscribe2();
	});

	let sessions = $derived([...($created || []), ...($joined || [])]);
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
	<div class="mt-12">
		<h2 class="mb-4 text-2xl font-semibold text-gray-900">Recent Sessions</h2>
		{#if sessions?.length}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each sessions as [id, session]}
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<a href="/session/{id}" class="block">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="line-clamp-1 text-xl font-semibold text-gray-900">{session.title}</h3>
								<span
									class="rounded-full px-3 py-1 text-sm font-medium {session.status === 'active'
										? 'bg-green-100 text-green-600'
										: session.status === 'waiting'
											? 'bg-yellow-100 text-yellow-600'
											: 'bg-gray-100 text-gray-600'}"
								>
									{session.status === 'active'
										? 'Active'
										: session.status === 'waiting'
											? 'Waiting'
											: session.status === 'draft'
												? 'Draft'
												: 'Ended'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<p class="text-gray-600">
									Participants: {session.participants?.length || 0}
								</p>
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
					<p class="mb-2 text-lg font-medium text-gray-900">No recent sessions found</p>
					<p class="mb-4 text-gray-600">Create or join a session to get started</p>
					<Button href="/create" color="primary">Create Your First Session</Button>
				</div>
			</Card>
		{/if}
	</div>
</main>
