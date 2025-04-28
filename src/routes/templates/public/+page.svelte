<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	import Title from '$lib/components/Title.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import { createTemplate } from '../../dashboard/createTemplate';
	import { notifications } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';
	import { i18n } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages.js';

	// Query for public templates
	let [templates, { unsubscribe }] = subscribeAll<Template>(
		query(collection(db, 'templates'), where('public', '==', true), orderBy('createdAt', 'desc'))
	);

	onDestroy(() => {
		unsubscribe();
	});

	async function handleCreateTemplate() {
		try {
			const id = await createTemplate();
			notifications.success('Template created successfully');
			await goto(i18n.resolveRoute(`/template/${id}`));
		} catch (error) {
			console.error('Error creating template:', error);
			notifications.error('Failed to create template');
		}
	}
</script>

<svelte:head>
	<title>Public Templates | {deploymentConfig.siteTitle}</title>
	<meta name="description" content="Browse public templates" />
</svelte:head>

<Title page="Public Templates" />

<div class="container mx-auto max-w-6xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">{m.publicTemplates()}</h1>
		{#if $page.data.user}
			<Button onclick={handleCreateTemplate} color="primary">
				{m.createTemplateButton()}
			</Button>
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
					<Button onclick={handleCreateTemplate} color="primary">Create Template</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>
