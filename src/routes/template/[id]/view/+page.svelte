<script lang="ts">
	import { Badge, Accordion, AccordionItem } from 'flowbite-svelte';
	import { Link, FileText, File } from 'lucide-svelte';
	import type { ResourceType } from '$lib/schema/resource';
	import * as m from '$lib/paraglide/messages.js';
	import { deploymentConfig } from '$lib/config/deployment';
	export let data;
	const { template } = data;

	function getResourceIcon(type: ResourceType) {
		switch (type) {
			case 'link':
				return Link;
			case 'text':
				return FileText;
			case 'file':
				return File;
			default:
				return FileText;
		}
	}
</script>

<svelte:head>
	<title>Template: {data.template.title} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header Section -->
	<header class="mb-8 border-b border-gray-200 pb-6">
		<div class="mb-4 flex items-start justify-between">
			<h1 class="flex-1 text-4xl font-bold text-gray-900">{template.title}</h1>
			<Badge color={template.public ? 'green' : 'none'} class="mt-2">
				{template.public ? m.Tpublic() : m.Tprivate()}
			</Badge>
		</div>
		<div class="text-sm text-gray-500">
			{m.lastUpdated()}
			{new Date(template.updatedAt).toLocaleDateString()}
		</div>
	</header>

	<!-- Main Content -->
	<main class="space-y-8">
		<!-- Task Description Section -->
		<section>
			<h2 class="mb-4 text-2xl font-semibold text-gray-800">
				{m.taskDescription()}
			</h2>
			<div class="prose prose-gray max-w-none">
				<p class="whitespace-pre-wrap leading-relaxed text-gray-700">
					{template.task}
				</p>
			</div>
		</section>

		<!-- Subtasks Section -->
		{#if template.subtasks && template.subtasks.length > 0}
			<section class="border-t border-gray-100 pt-8">
				<h2 class="mb-4 text-2xl font-semibold text-gray-800">
					{m.subtasks()}
				</h2>
				<ul class="space-y-3">
					{#each template.subtasks as subtask, index}
						<li class="flex items-start">
							<span class="w-8 flex-shrink-0 text-gray-400">{index + 1}.</span>
							<span class="text-gray-700">{subtask}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Resources Section -->
		<section class="border-t border-gray-100 pt-8">
			<h2 class="mb-4 text-2xl font-semibold text-gray-800">{m.resources()}</h2>
			{#if template.resources && template.resources.length > 0}
				<div class="rounded-lg bg-gray-50">
					<Accordion class="divide-y divide-gray-200">
						{#each template.resources as resource}
							<AccordionItem>
								<svelte:fragment slot="header">
									<div class="flex items-center gap-3 py-2">
										<svelte:component
											this={getResourceIcon(resource.type)}
											class="h-5 w-5 text-gray-500"
										/>
										<span class="font-medium text-gray-700">{resource.name}</span>
									</div>
								</svelte:fragment>
								<div class="rounded-b-lg bg-white px-4 py-3">
									{#if resource.type === 'link'}
										<a
											href={resource.content}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center gap-2 break-all text-blue-600 hover:text-blue-800 hover:underline"
										>
											<Link class="h-4 w-4" />
											{resource.content}
										</a>
									{:else if resource.type === 'text'}
										<div class="prose prose-sm max-w-none text-gray-700">
											<p class="whitespace-pre-wrap">{resource.content}</p>
										</div>
									{:else if resource.type === 'file'}
										<a
											href={resource.ref}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
										>
											<File class="h-4 w-4" />
											<span>Download File</span>
										</a>
									{/if}
								</div>
							</AccordionItem>
						{/each}
					</Accordion>
				</div>
			{:else}
				<p class="italic text-gray-500">{m.noResources()}</p>
			{/if}
		</section>
	</main>
</div>
