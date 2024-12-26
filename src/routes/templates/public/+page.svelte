<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';
	import TemplateCard from '$lib/components/TemplateCard.svelte';

	// Query for public templates
	let [templates, { unsubscribe }] = subscribeAll<Template>(
		query(collection(db, 'templates'), where('public', '==', true), orderBy('createdAt', 'desc'))
	);

	onDestroy(() => {
		unsubscribe();
	});
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
				<TemplateCard
					id={doc.id}
					title={template.title}
					task={template.task}
					subtaskSize={template.subtasks.length}
					resourceSize={template.resources.length}
					owner={template.owner}
				/>
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
