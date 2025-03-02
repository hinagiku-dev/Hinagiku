<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import ResolveUsername from './ResolveUsername.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		id,
		title,
		status,
		labels,
		task,
		host,
		createdAt
	}: {
		id: string;
		title: string;
		status: string;
		labels?: string[];
		task: string;
		host?: string;
		createdAt: Date;
	} = $props();
</script>

<Card padding="lg" class="transition-all hover:border-primary-500">
	<div class="flex h-full flex-col">
		<div class="mb-4 flex items-start justify-between">
			<h3 class="line-clamp-1 text-xl font-bold">{title}</h3>
			<span
				class="rounded-full px-3 py-1 text-sm font-medium {status === 'preparing'
					? 'bg-yellow-100 text-yellow-600'
					: status === 'individual'
						? 'bg-blue-100 text-blue-600'
						: status === 'before-group'
							? 'bg-purple-100 text-purple-600'
							: status === 'group'
								? 'bg-green-100 text-green-600'
								: 'bg-gray-100 text-gray-600'}"
			>
				{status}
			</span>
		</div>
		{#if labels?.length}
			<div class="mb-4 flex min-h-[28px] flex-wrap gap-2">
				{#each labels.sort() as label}
					<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
						{label}
					</span>
				{/each}
			</div>
		{/if}
		<p class="mb-4 line-clamp-2 text-gray-600">{task}</p>
		<div class="mt-auto w-full">
			{#if host}
				<div class="flex items-center gap-4">
					<span class="text-sm text-gray-500">{m.hostedBy()} <ResolveUsername id={host} /></span>
				</div>
			{/if}
			<div class="mb-4 flex items-center gap-4">
				<span class="text-sm text-gray-500">
					{createdAt.toLocaleString()}
				</span>
			</div>
			<Button href="/session/{id}" class="w-full">{m.viewSession()}</Button>
		</div>
	</div>
</Card>
