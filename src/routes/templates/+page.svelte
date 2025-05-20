<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import { writable, derived } from 'svelte/store';
	import { collection, query, where, orderBy } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import { user } from '$lib/stores/auth';
	import { deploymentConfig } from '$lib/config/deployment';
	import { createTemplate } from '../dashboard/createTemplate';
	import { notifications } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';
	import { i18n } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages.js';
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	// Query for user's templates
	let [templates, { unsubscribe }] = subscribeAll<Template>(
		query(
			collection(db, 'templates'),
			where('owner', '==', $user?.uid),
			orderBy('createdAt', 'desc')
		)
	);

	let selectedLabels = writable<string[]>([]);
	let availableLabels = derived(templates, ($templates) => {
		if (!$templates) return [];
		const labels = new Set<string>();
		$templates.forEach(([, t]) => t.labels?.forEach((l) => labels.add(l)));
		return Array.from(labels).sort();
	});
	let filteredTemplates = derived([templates, selectedLabels], ([$templates, $selectedLabels]) => {
		if (!$templates || $selectedLabels.length === 0) return $templates;
		return $templates.filter(([, t]) => $selectedLabels.every((l) => t.labels?.includes(l)));
	});

	function handleLabelSelect(label: string) {
		selectedLabels.update((ls) => {
			if (ls.includes(label)) {
				return ls.filter((l) => l !== label);
			}
			return [...ls, label].sort();
		});
	}

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
	<title>{m.yourTemplates()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">{m.yourTemplates()}</h1>
		<Button onclick={handleCreateTemplate} color="primary">
			{m.createTemplateButton()}
		</Button>
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
		{#if $filteredTemplates?.length}
			{#each $filteredTemplates as [doc, template]}
				<TemplateCard
					id={doc.id}
					title={template.title}
					task={template.task}
					subtaskSize={template.subtasks.length}
					resourceSize={template.resources.length}
					owner={template.owner}
					isPublic={template.public}
					labels={template.labels}
				/>
			{/each}
		{:else}
			<Card class="md:col-span-2 lg:col-span-3">
				<div class="p-8 text-center">
					<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
						<MessageSquarePlus size={32} class="text-primary-600" />
					</div>
					<p class="mb-2 text-lg font-medium text-gray-900">
						{m.noTemplates()}
					</p>
					<p class="mb-4 text-gray-600">
						{m.createYourFirstTemplate()}
					</p>
					<Button onclick={handleCreateTemplate} color="primary">
						{m.createYourFirstTemplate()}
					</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>
