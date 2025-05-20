<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
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

	async function startSession(id: string) {
		try {
			const res = await fetch('/api/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					templateId: id
				})
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || 'Failed to create session');
				return;
			}

			const data = await res.json();
			await goto(i18n.resolveRoute(`/session/${data.sessionId}`));
		} catch (e) {
			console.error('Error creating session:', e);
			notifications.error('Failed to create session');
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
								{template.public ? m.Tpublic() : m.Tprivate()}
							</span>
						</div>
						{#if template.labels?.length}
							<div class="mb-2 flex flex-wrap gap-1">
								{#each template.labels as label}
									<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
										{label}
									</span>
								{/each}
							</div>
						{/if}
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
							<Button href="/template/{doc.id}" class="flex-1">{m.edit()}</Button>
							<Button onclick={() => startSession(doc.id)} color="alternative" class="flex-1">
								{m.createSession()}
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
