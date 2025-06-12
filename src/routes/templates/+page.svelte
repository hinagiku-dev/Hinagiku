<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button, Modal } from 'flowbite-svelte';
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

	let selectStatus = writable(false);
	let selectedTemplate = writable<string[][]>([]);
	async function handleSelectTemplate() {
		$selectStatus = !$selectStatus;
	}
	function toggleTemplateSelection(id: string, isChecked: boolean, active_status?: string) {
		const status = active_status || 'active';
		if (isChecked) {
			$selectedTemplate = [...$selectedTemplate, [id, status]];
		} else {
			$selectedTemplate = $selectedTemplate.filter((template) => template[0] !== id);
		}
	}
	let showArchiveModal = writable(false);
	async function archiveSelectedTemplate() {
		if ($selectedTemplate.length === 0) {
			notifications.error(m.atLeastOneSelected());
			return;
		}
		$showArchiveModal = true;
		console.log('Selected templates for archiving:', $selectedTemplate);
	}
	async function confirmArchiveTemplates() {
		try {
			$selectedTemplate.forEach(async ([id, active_status]) => {
				if (active_status === 'archived') {
					const fetchResponse = await fetch(`/api/template/${id}/action/unarchive`, {
						method: 'POST'
					});
					const result = await fetchResponse.json();
					if (!fetchResponse.ok) {
						throw new Error(result.error || m.archiveFailed());
					}
				} else {
					const fetchResponse = await fetch(`/api/template/${id}/action/archive`, {
						method: 'POST'
					});
					const result = await fetchResponse.json();
					if (!fetchResponse.ok) {
						throw new Error(result.error || m.archiveFailed());
					}
				}
			});

			notifications.success(m.successBatchArchive({ count: $selectedTemplate.length }));
			$selectedTemplate = [];
			$selectStatus = false;
			$showArchiveModal = false;
		} catch (e) {
			console.error('Error archiving templates:', e);
			notifications.error(m.failedBatchArchive());
		}
	}
</script>

<svelte:head>
	<title>{m.yourTemplates()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">{m.yourTemplates()}</h1>
		<div class="text-right">
			{#if $selectStatus}
				<Button color="primary" on:click={archiveSelectedTemplate} class="mr-4">
					{m.archiveAndUnarchive()}
				</Button>
			{/if}
			<Button onclick={handleSelectTemplate} color="alternative">
				{#if $selectStatus}
					{m.cancel()}
				{:else}
					{m.select()}
				{/if}
			</Button>
			<Button class="ml-4" color="alternative" href="/dashboard">{m.backToDashboard()}</Button>
			<Button class="ml-4" onclick={handleCreateTemplate} color="primary">
				{m.createTemplateButton()}
			</Button>
		</div>
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
				{#if template.active_status === 'active' || !template.active_status}
					<div class="relative h-full">
						{#if $selectStatus}
							<input
								type="checkbox"
								class="absolute right-3 top-3 z-10"
								checked={$selectedTemplate.includes([doc.id, template.active_status])}
								onchange={(e) =>
									toggleTemplateSelection(doc.id, e.currentTarget.checked, template.active_status)}
							/>
						{/if}
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
					</div>
				{/if}
			{/each}
			{#each $filteredTemplates as [doc, template]}
				{#if template.active_status === 'archived'}
					<div class="relative h-full">
						{#if $selectStatus}
							<input
								type="checkbox"
								class="absolute right-3 top-3 z-10"
								checked={$selectedTemplate.includes([doc.id, template.active_status])}
								onchange={(e) =>
									toggleTemplateSelection(doc.id, e.currentTarget.checked, template.active_status)}
							/>
						{/if}
						<TemplateCard
							id={doc.id}
							title={template.title}
							task={template.task}
							subtaskSize={template.subtasks.length}
							resourceSize={template.resources.length}
							owner={template.owner}
							isPublic={template.public}
							labels={template.labels}
							archived={true}
						/>
					</div>
				{/if}
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

<Modal bind:open={$showArchiveModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			{m.archiveConfirmTemplate()}
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={confirmArchiveTemplates}>{m.archiveConfirm()}</Button>
			<Button color="alternative" on:click={() => ($showArchiveModal = false)}
				>{m.noCancel()}</Button
			>
		</div>
	</div>
</Modal>
