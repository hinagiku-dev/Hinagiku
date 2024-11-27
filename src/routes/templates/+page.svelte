<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import { collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { user } from '$lib/stores/auth';

	// Query for user's templates
	let [templates, { unsubscribe }] = subscribeAll<Template>(
		query(
			collection(db, 'templates'),
			where('owner', '==', $user?.uid),
			orderBy('createdAt', 'desc')
		)
	);

	onDestroy(() => {
		unsubscribe();
	});
</script>

<svelte:head>
	<title>Your Templates | Hinagiku</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">Your Templates</h1>
		<Button href="/create" color="primary">Create Template</Button>
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
						<div class="flex gap-2">
							<Button href="/template/{doc.id}" class="flex-1">Edit</Button>
							<Button href="/create/session/{doc.id}" color="alternative" class="flex-1">
								Create Session
							</Button>
						</div>
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
					<Button href="/create" color="primary">Create Your First Template</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>
