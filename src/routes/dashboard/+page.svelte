<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus, UserPlus, UserCog, GitFork } from 'lucide-svelte';
	import { collection, orderBy, limit, query, where } from 'firebase/firestore';
	import { user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { goto } from '$app/navigation';
	import { createTemplate } from './createTemplate';
	import { notifications } from '$lib/stores/notifications';

	let { data } = $props();

	// Query for user's templates
	let [templates, { unsubscribe: unsubscribe1 }] = subscribeAll<Template>(
		query(
			collection(db, 'templates'),
			where('owner', '==', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(6)
		)
	);

	// Query for public templates
	let [publicTemplates, { unsubscribe: unsubscribe2 }] = subscribeAll<Template>(
		query(
			collection(db, 'templates'),
			where('public', '==', true),
			orderBy('createdAt', 'desc'),
			limit(6)
		)
	);

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
	});
</script>

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
							<h3 class="mb-2 text-xl font-bold">{template.title}</h3>
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
								<h3 class="text-xl font-bold">{template.title}</h3>
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
</main>
