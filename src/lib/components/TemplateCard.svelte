<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { user } from '$lib/stores/auth';
	import { GitFork } from 'lucide-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';

	let {
		id,
		title,
		task,
		subtaskSize,
		resourceSize,
		owner,
		isPublic
	}: {
		id: string;
		title: string;
		task: string;
		subtaskSize: number;
		resourceSize: number;
		owner: string;
		isPublic?: boolean;
	} = $props();

	let forking = $state(false);
	async function handleForkTemplate() {
		if (forking) {
			return;
		}
		forking = true;

		try {
			const response = await fetch(`/api/template/${id}/fork`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to fork template');
			}

			const {
				id: forkedId
			}: {
				id: string;
			} = await response.json();
			notifications.success('Template forked successfully');
			await goto(`/template/${forkedId}`);
		} catch (error) {
			console.error('Error forking template:', error);
			notifications.error('Failed to fork template');
		} finally {
			forking = false;
		}
	}
</script>

<Card padding="lg" class="transition-all hover:border-primary-500">
	<div class="flex h-full flex-col">
		<div class="mb-4 flex items-start justify-between">
			<h3 class="line-clamp-1 text-xl font-bold">{title}</h3>
			{#if isPublic !== undefined}
				<span
					class="rounded-full px-3 py-1 text-sm font-medium {isPublic
						? 'bg-green-100 text-green-600'
						: 'bg-gray-100 text-gray-600'}"
				>
					{isPublic ? 'Public' : 'Private'}
				</span>
			{/if}
		</div>
		<p class="mb-4 line-clamp-2 text-gray-600">{task}</p>
		<div class="mt-auto w-full">
			<div class="mb-4 flex items-center gap-4">
				<span class="text-sm text-gray-500">
					{subtaskSize} subtasks
				</span>
				<span class="text-sm text-gray-500">
					{resourceSize} resources
				</span>
			</div>
			<div class="flex gap-2">
				{#if owner === $user?.uid}
					<Button href="/template/{id}" class="flex-1">Use Template</Button>
				{:else if $user?.uid}
					<div class="flex w-full gap-2">
						<Button href="/template/{id}/view" color="alternative" class="flex-1">View</Button>
						<Button color="alternative" class="flex-1" on:click={handleForkTemplate}>
							<GitFork class="h-4 w-4" />
							Fork
						</Button>
					</div>
				{:else}
					<div class="flex w-full gap-2">
						<Button href="/template/{id}/view" color="alternative" class="flex-1">View</Button>
						<Button href="/login?redirect=/templates/public" color="alternative" class="flex-1">
							Login to Fork
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</Card>
