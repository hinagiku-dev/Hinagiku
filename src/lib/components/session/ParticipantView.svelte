<script lang="ts">
	import type { Session } from '$lib/schema/session';
	import type { Group } from '$lib/schema/group';
	import type { Readable } from 'svelte/store';
	import { Button, Input, Label } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { UserPlus, Users } from 'lucide-svelte';
	import { db } from '$lib/firebase';
	import { collection, query, where } from 'firebase/firestore';
	import { subscribeAll } from '$lib/firebase/store';
	import { onDestroy } from 'svelte';
	import { getUser } from '$lib/utils/getUser';
	import Chatroom from '$lib/components/Chatroom.svelte';

	let { session, user } = $props<{
		session: Readable<Session>;
		// eslint-disable-next-line no-undef
		user: App.Locals['user'];
	}>();

	// Group subscription setup
	const groupsRef = collection(db, 'sessions', $page.params.id, 'groups');
	const q = query(groupsRef, where('participants', 'array-contains', user.uid));
	const [group, { unsubscribe }] = subscribeAll<Group>(q);
	onDestroy(unsubscribe);

	interface Conversation {
		name: string;
		content: string;
		self?: boolean;
		audio?: string;
		avatar?: string;
	}

	let groupNumber = $state('');
	let creating = $state(false);
	let conversations = $state<Conversation[]>([]);

	async function handleCreateGroup() {
		try {
			const response = await fetch(`/api/session/${$page.params.id}/group`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Failed to create group');
				return;
			}

			notifications.success('Group created successfully');
			creating = false;
		} catch (error) {
			console.error('Error creating group:', error);
			notifications.error('Failed to create group');
		}
	}

	async function handleJoinGroup() {
		if (!groupNumber || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(groupNumber)) {
			notifications.error('Please enter a valid group number (1-50)');
			return;
		}

		try {
			const response = await fetch(`/api/session/${$page.params.id}/group/${groupNumber}/join`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Failed to join group');
				return;
			}

			notifications.success('Joined group successfully');
			creating = false;
		} catch (error) {
			console.error('Error joining group:', error);
			notifications.error('Failed to join group');
		}
	}
</script>

<main class="mx-auto max-w-7xl px-2 py-8">
	<h1 class="mb-8 text-3xl font-bold">{$session?.title}</h1>

	<div class="grid gap-8 md:grid-cols-4">
		<div class="space-y-8 md:col-span-1">
			<!-- Status Section -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<!-- svelte-ignore element_invalid_self_closing_tag -->
						<span
							class="inline-block h-3 w-3 rounded-full {$session?.status === 'preparing'
								? 'bg-yellow-500'
								: $session?.status === 'individual'
									? 'bg-blue-500'
									: $session?.status === 'before-group'
										? 'bg-purple-500'
										: $session?.status === 'group'
											? 'bg-green-500'
											: 'bg-gray-500'}"
						/>
						<span class="capitalize">{$session?.status}</span>
					</div>
					{#if $session?.status === 'individual'}
						<p class="text-gray-600">Work on your individual contributions.</p>
					{/if}
				</div>
			</div>

			<!-- Group Section -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Group Information</h2>
				{#if $group?.[0]}
					<div class="space-y-4">
						<div class="flex items-center gap-2">
							<span class="font-medium">Group </span>
							<span class="text-lg">#{$group[0][1].number}</span>
						</div>
						<div>
							<h3 class="mb-2 font-medium">Members:</h3>
							<ul class="space-y-2">
								{#each $group[0][1].participants as participant}
									<li class="flex items-center gap-2">
										<Users class="h-4 w-4" />
										<span>
											{#if participant === user.uid}
												You
											{:else}
												{#await getUser(participant)}
													<span class="text-gray-500">載入中...</span>
												{:then profile}
													{profile.displayName}
												{:catch}
													<span class="text-red-500">未知使用者</span>
												{/await}
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{:else if $session?.status === 'preparing'}
					<div class="mt-6 space-y-4">
						<h3 class="font-medium">Group Management</h3>
						{#if creating}
							<div class="space-y-4">
								<div class="flex items-center gap-2">
									<Label for="groupNumber">Group Number</Label>
									<Input
										id="groupNumber"
										type="number"
										bind:value={groupNumber}
										min="1"
										max="50"
										placeholder="Enter group number (1-50)"
									/>
								</div>
								<Button color="primary" on:click={handleJoinGroup}>
									<UserPlus class="mr-2 h-4 w-4" />
									Join Group
								</Button>
							</div>
						{:else}
							<Button color="primary" on:click={handleCreateGroup}>
								<Users class="mr-2 h-4 w-4" />
								Create New Group
							</Button>
						{/if}
						<Button color="alternative" on:click={() => (creating = !creating)}>
							{creating ? 'Cancel' : 'Join Existing Group'}
						</Button>
					</div>
				{:else}
					<p class="text-gray-600">You are not in a group yet.</p>
				{/if}
			</div>
		</div>

		<div class="rounded-lg border p-6 md:col-span-3">
			{#if $session?.status === 'preparing'}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Waiting for session to start...</h3>
					<p class="text-gray-600">The host will begin the session shortly.</p>
				</div>
			{:else if $session?.status === 'individual'}
				<Chatroom {conversations} />
			{:else if $session?.status === 'before-group'}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Preparing for Group Discussion</h3>
					<p class="text-gray-600">Get ready to collaborate with your group.</p>
				</div>
			{:else if $session?.status === 'group'}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Group Discussion Phase</h3>
					<p class="text-gray-600">Collaborate with your group members.</p>
				</div>
			{/if}
		</div>
	</div>
</main>
