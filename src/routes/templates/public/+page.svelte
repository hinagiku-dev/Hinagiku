<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';
	import { GitFork } from 'lucide-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';

	// Query for public templates
	let [templates, { unsubscribe }] = subscribeAll<Template>(
		query(collection(db, 'templates'), where('public', '==', true), orderBy('createdAt', 'desc'))
	);

	onDestroy(() => {
		unsubscribe();
	});

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
</script>

<svelte:head>
	<title>Public Templates | Hinagiku</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">Public Templates</h1>
		{#if $page.data.user}
			<Button href="/create" color="primary">Create Template</Button>
		{/if}
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#if $templates?.length}
			{#each $templates as [doc, template]}
				<Card padding="lg" class="transition-all hover:border-primary-500">
					<div>
						<div class="mb-4">
							<h3 class="mb-2 text-xl font-bold">{template.title}</h3>
							<p class="line-clamp-2 text-gray-600">{template.task}</p>
						</div>
						<div class="mb-4 flex items-center gap-4">
							<span class="text-sm text-gray-500">
								{template.subtasks.length} subtasks
							</span>
							<span class="text-sm text-gray-500">
								{template.resources.length} resources
							</span>
						</div>
						<div class="flex gap-2">
							{#if template.owner === $page.data.user?.uid}
								<Button href="/template/{doc.id}" class="flex-1">Use Template</Button>
							{:else if $page.data.user}
								<Button
									color="alternative"
									class="flex-1"
									on:click={() => handleForkTemplate(doc.id)}
								>
									<GitFork class="h-4 w-4" />
									Fork
								</Button>
							{:else}
								<div class="flex w-full gap-2">
									<Button href="/template/{doc.id}/view" color="alternative" class="flex-1">
										View
									</Button>
									<Button
										href="/login?redirect=/templates/public"
										color="alternative"
										class="flex-1"
									>
										Login to Fork
									</Button>
								</div>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		{:else}
			<Card class="md:col-span-2 lg:col-span-3">
				<div class="p-8 text-center">
					<p class="mb-2 text-lg font-medium text-gray-900">No public templates available</p>
					<p class="mb-4 text-gray-600">Be the first to share a template with the community</p>
					<Button href="/create" color="primary">Create Template</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>
