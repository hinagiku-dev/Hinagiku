<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus, UserPlus, UserCog, GitFork } from 'lucide-svelte';
	import {
		collection,
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
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import type { Session } from '$lib/schema/session';
	import { goto } from '$app/navigation';
	import { createTemplate } from './createTemplate';
	import { notifications } from '$lib/stores/notifications';
	import { browser } from '$app/environment';
	import { user } from '$lib/stores/auth';
	import { getUser } from '$lib/utils/getUser';

	let { data } = $props();

	// Query for user's templates
	let [templates, { unsubscribe: unsubscribe1 }] = browser
		? subscribeAll<Template>(
				query(
					collection(db, 'templates'),
					where('owner', '==', data.user.uid),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [null, { unsubscribe: () => {} }];

	// Query for public templates
	let [publicTemplates, { unsubscribe: unsubscribe2 }] = browser
		? subscribeAll<Template>(
				query(
					collection(db, 'templates'),
					where('public', '==', true),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [null, { unsubscribe: () => {} }];

	let [hostSessions, { unsubscribe: unsubscribe3 }] = browser
		? subscribeAll<Session>(
				query(
					collection(db, 'sessions'),
					where('host', '==', data.user.uid),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [writable([]), { unsubscribe: () => {} }];

	let unsoredsessions = writable<[string, string, Session][]>([]);

	let sessions = derived(unsoredsessions, ($unsoredsessions) =>
		$unsoredsessions.sort(
			(a, b) => (b[2].createdAt as Timestamp).toMillis() - (a[2].createdAt as Timestamp).toMillis()
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

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	let availableLabels = derived(hostSessions, ($hostSessions) => {
		if (!$hostSessions) return [];
		const labels = new Set<string>();
		$hostSessions.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	async function getSessions() {
		const sessionQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid),
			limit(6)
		);
		const sessionSnapshot = await getDocs(sessionQuery);
		sessionSnapshot.forEach(async (docu) => {
			const session = await getDoc(docu.ref.parent.parent!);
			const sessionData = session.data();
			const host = await getUser(sessionData?.host);
			const hoster = host.displayName;
			unsoredsessions.update((value) => [...value, [hoster, session.id, sessionData as Session]]);
		});
	}

	onMount(() => {
		getSessions();
	});

	async function handleCreateTemplate() {
		try {
			const id = await createTemplate();
			notifications.success('Template created successfully');
			await goto(`/template/${id}`);
		} catch (error) {
			console.error('Error creating template:', error);
			notifications.error('Failed to create template');
		}
	}

	async function handleForkTemplate(templateId: string) {
		try {
			const response = await fetch(`/api/template/${templateId}/fork`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to fork template');
			}

			const { id } = await response.json();
			notifications.success('Template forked successfully');
			await goto(`/template/${id}`);
		} catch (error) {
			console.error('Error forking template:', error);
			notifications.error('Failed to fork template');
		}
	}

	onDestroy(() => {
		unsubscribe1();
		unsubscribe2();
		unsubscribe3();
	});
</script>

<svelte:head>
	<title>Dashboard | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-2 text-gray-600">Welcome back, {$profile?.displayName || $user?.displayName}</p>
	</div>

	<!-- Main Actions -->
	<div class="mb-16 grid gap-6 md:grid-cols-3">
		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<button onclick={handleCreateTemplate} class="flex w-full flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<MessageSquarePlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Create Template</h2>
				<p class="text-gray-600">Create a new discussion template</p>
			</button>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/join" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserPlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Join Session</h2>
				<p class="text-gray-600">Join an existing discussion session</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/profile" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserCog size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Edit Profile</h2>
				<p class="text-gray-600">Update your profile settings</p>
			</a>
		</Card>
	</div>

	<!-- Public Templates -->
	<div class="mb-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Popular Templates</h2>
			<Button color="alternative" href="/templates/public">View All</Button>
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $publicTemplates?.length}
				{#each $publicTemplates as [doc, template]}
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<div>
							<h3 class="mb-2 line-clamp-1 text-xl font-bold">{template.title}</h3>
							<p class="mb-4 line-clamp-2 text-gray-600">{template.task}</p>
							<div class="mb-4 flex items-center gap-4">
								<span class="text-sm text-gray-500">
									{template.subtasks.length} subtasks
								</span>
								<span class="text-sm text-gray-500">
									{template.resources.length} resources
								</span>
							</div>
							<div class="flex gap-2">
								{#if template.owner === $user?.uid}
									<Button href="/template/{doc.id}" class="flex-1">Use Template</Button>
								{:else}
									<Button
										color="alternative"
										class="flex-1"
										on:click={() => handleForkTemplate(doc.id)}
									>
										<GitFork class="h-4 w-4" />
										Fork
									</Button>
								{/if}
							</div>
						</div>
					</Card>
				{/each}
			{:else}
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each Array(3) as _}
					<Card padding="lg">
						<div class="text-center">
							<h3 class="mb-2 text-xl font-bold">Example Template</h3>
							<p class="mb-4 text-gray-600">
								Create and share your own templates with the community
							</p>
							<Button href="/create" class="w-full">Create Template</Button>
						</div>
					</Card>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Your Templates -->
	<div>
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Your Templates</h2>
			<Button color="alternative" href="/templates">View All</Button>
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $templates?.length}
				{#each $templates as [doc, template]}
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<div>
							<div class="mb-4 flex items-start justify-between">
								<h3 class="line-clamp-1 text-xl font-bold">{template.title}</h3>
								<span
									class="rounded-full px-3 py-1 text-sm font-medium {template.public
										? 'bg-green-100 text-green-600'
										: 'bg-gray-100 text-gray-600'}"
								>
									{template.public ? 'Public' : 'Private'}
								</span>
							</div>
							<p class="mb-4 line-clamp-2 text-gray-600">{template.task}</p>
							<div class="mb-4 flex items-center gap-4">
								<span class="text-sm text-gray-500">
									{template.subtasks.length} subtasks
								</span>
								<span class="text-sm text-gray-500">
									{template.resources.length} resources
								</span>
							</div>
							<Button href="/template/{doc.id}" class="w-full">Manage Template</Button>
						</div>
					</Card>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">No templates created yet</p>
						<p class="mb-4 text-gray-600">Create your first template to get started</p>
						<Button onclick={handleCreateTemplate} color="primary"
							>Create Your First Template</Button
						>
					</div>
				</Card>
			{/if}
		</div>
	</div>

	<!-- Recent Session -->
	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Recent Host Sessions</h2>
			<Button color="alternative" href="/dashboard/recent/host">View All</Button>
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
							<div class="mb-4 flex items-start justify-between">
								<h3 class="line-clamp-1 text-xl font-bold">{session.title}</h3>
								<span
									class="rounded-full px-3 py-1 text-sm font-medium {session.status === 'preparing'
										? 'bg-yellow-100 text-yellow-600'
										: session.status === 'individual'
											? 'bg-blue-100 text-blue-600'
											: session.status === 'before-group'
												? 'bg-purple-100 text-purple-600'
												: session.status === 'group'
													? 'bg-green-100 text-green-600'
													: 'bg-gray-100 text-gray-600'}"
								>
									{session.status}
								</span>
							</div>
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

	<!-- Recent participant Session-->
	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">Recent Participant Sessions</h2>
			<Button color="alternative" href="/dashboard/recent/participant">View All</Button>
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $sessions.length}
				{#each $sessions as [hoster, docid, session]}
					<Card padding="lg" class="transition-all hover:border-primary-500">
						<div>
							<div class="mb-4 flex items-start justify-between">
								<h3 class="line-clamp-1 text-xl font-bold">{session.title}</h3>
								<span
									class="rounded-full px-3 py-1 text-sm font-medium {session.status === 'preparing'
										? 'bg-yellow-100 text-yellow-600'
										: session.status === 'individual'
											? 'bg-blue-100 text-blue-600'
											: session.status === 'before-group'
												? 'bg-purple-100 text-purple-600'
												: session.status === 'group'
													? 'bg-green-100 text-green-600'
													: 'bg-gray-100 text-gray-600'}"
								>
									{session.status}
								</span>
							</div>
							<p class="mb-4 line-clamp-2 text-gray-600">{session.task}</p>
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
