<script lang="ts">
	// Imports
	import { Button, Input, Textarea, Alert, Spinner } from 'flowbite-svelte';
	import { Trash2, ChevronDown, ChevronUp, ExternalLink, FileText, Upload } from 'lucide-svelte';
	import { page } from '$app/stores';
	import type { Template } from '$lib/schema/template';
	import { notifications } from '$lib/stores/notifications';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	// Import paraglide messages
	import * as m from '$lib/paraglide/messages.js';

	// Constants
	const LIMITS = {
		SOURCES: 10,
		NAME_LENGTH: 100,
		CONTENT_LENGTH: 1000
	};

	// Props
	export let template: Template;
	export let isUploading: boolean = false;

	// State
	let resources = template.resources;
	let uploadMode: 'none' | 'text' | 'file' = 'none';
	let fileInput: HTMLInputElement | null = null;
	let isDragging = false;
	let tempFile: File | null = null;
	let success = '';
	let expandedResources = new Set<string>();
	let dragError = false;

	let newResource = {
		name: '',
		content: '',
		type: 'text'
	};

	// Resource Management
	async function addResource() {
		try {
			const formData = new FormData();
			formData.append('name', newResource.name);
			formData.append('content', tempFile || newResource.content);
			formData.append('type', newResource.type);

			const res = await fetch(`/api/template/${$page.params.id}/resource`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || m.resourceAddFailed());
				return;
			}

			resetForm();
			notifications.success(m.resourceAdded());
		} catch (e) {
			console.error('Error adding resource:', e);
			notifications.error(m.resourceAddFailed());
		}
	}

	// delete resource (text or file resource)
	async function deleteResource(resourceId: string) {
		try {
			const res = await fetch(`/api/template/${$page.params.id}/resource/${resourceId}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || m.resourceDeleteFailed());
				return;
			}

			notifications.success(m.resourceDeleted());
		} catch (e) {
			console.error('Error deleting resource:', e);
			notifications.error(m.resourceDeleteFailed());
		}
	}

	// File Handling
	// Add PDF validation function
	function isPDFFile(file: File): boolean {
		return file.type === 'application/pdf';
	}

	async function processFileResource(file: File) {
		try {
			if (!isPDFFile(file)) {
				notifications.error(m.onlyPdfAllowed());
				return;
			}

			isUploading = true;
			success = '';

			newResource = {
				name: file.name,
				content: `${file.size} bytes`,
				type: 'file'
			};
			tempFile = file;
			await addResource();
		} catch (e) {
			notifications.error(m.failedProcessFile());
			console.error('Error processing file:', e);
		} finally {
			isUploading = false;
		}
	}

	// Event Handlers
	function handleFileChange(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		if (files?.length) processFileResource(files[0]);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		dragError = false;
		const files = e.dataTransfer?.files;
		if (files?.length) {
			if (!isPDFFile(files[0])) {
				dragError = true;
				notifications.error(m.onlyPdfAllowed());
				return;
			}
			processFileResource(files[0]);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		const items = e.dataTransfer?.items;
		if (items?.length) {
			dragError = items[0].type !== 'application/pdf';
		}
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
		dragError = false;
	}

	// open file selector
	function openFileSelector() {
		fileInput?.click();
	}

	// key down event handler for openFileSelector function
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			openFileSelector();
		}
	}

	// Form Management
	function resetForm() {
		uploadMode = 'none';
		success = '';
		newResource = { name: '', content: '', type: 'text' };
		tempFile = null;
	}

	function handleNameInput(e: Event) {
		const input = e.target as HTMLInputElement;
		newResource.name = input.value.slice(0, LIMITS.NAME_LENGTH);
	}

	function handleContentInput(e: Event) {
		const input = e.target as HTMLTextAreaElement;
		newResource.content = input.value.slice(0, LIMITS.CONTENT_LENGTH);
	}

	// Toggle expansion function
	function toggleExpand(resourceId: string) {
		if (expandedResources.has(resourceId)) {
			expandedResources.delete(resourceId);
		} else {
			expandedResources.add(resourceId);
		}
		expandedResources = expandedResources; // trigger reactivity
	}
</script>

<h2 class="mb-4 text-xl font-semibold">
	{m.resourcesCount({ count: resources.length, limit: LIMITS.SOURCES })}
</h2>
<div class="space-y-4">
	{#if success}
		<Alert color="green" class="mb-4">{success}</Alert>
	{/if}

	<!-- current resource list -->
	<div class="space-y-4">
		{#each resources as resource (resource.id)}
			<div class="rounded-lg border p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<h3 class="font-semibold">{resource.name}</h3>
							{#if resource.type === 'file' && resource.ref}
								<a
									href={resource.ref}
									download
									target="_blank"
									class="inline-flex items-center text-blue-600 hover:text-blue-800"
									title={m.openFile()}
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							{/if}
						</div>
						<div class="relative">
							<p
								class="prose prose-hina mt-1 overflow-y-auto break-words text-sm text-gray-600 transition-[max-height] duration-300 ease-in-out"
								style="max-height: {expandedResources.has(resource.id) ? '500px' : '100px'}"
							>
								{#await renderMarkdown(resource.content)}
									{resource.content}
								{:then content}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html content}
								{/await}
							</p>
							{#if resource.content.length > 100}
								<Button
									class="mt-2"
									color="light"
									size="xs"
									on:click={() => toggleExpand(resource.id)}
								>
									{#if expandedResources.has(resource.id)}
										<ChevronUp class="mr-1 h-4 w-4" />
										{m.showLess()}
									{:else}
										<ChevronDown class="mr-1 h-4 w-4" />
										{m.showMore()}
									{/if}
								</Button>
							{/if}
						</div>
					</div>
					<Button
						color="red"
						size="sm"
						on:click={() => deleteResource(resource.id)}
						disabled={isUploading}
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/each}
	</div>

	{#if resources.length < LIMITS.SOURCES}
		<!-- initial state with two buttons -->
		{#if uploadMode === 'none'}
			<div class="flex h-28 justify-center gap-4">
				<Button
					class="h-full flex-1 rounded-lg bg-blue-200 text-xl text-blue-800 shadow-lg transition duration-300 ease-in-out hover:bg-blue-300"
					on:click={() => (uploadMode = 'text')}
				>
					<div class="flex flex-col items-center gap-2">
						<FileText class="h-8 w-8" />
						<span>{m.addTextResource()}</span>
					</div>
				</Button>
				<Button
					class="h-full flex-1 rounded-lg bg-emerald-200 text-xl text-emerald-800 shadow-lg transition duration-300 ease-in-out hover:bg-emerald-300"
					on:click={() => (uploadMode = 'file')}
				>
					<div class="flex flex-col items-center gap-2">
						<Upload class="h-8 w-8" />
						<span>{m.uploadFileResource()}</span>
					</div>
				</Button>
			</div>

			<!-- upload state with file input area -->
		{:else if uploadMode === 'file'}
			<div
				class="relative flex h-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-gray-600 hover:bg-gray-50 focus:outline-none"
				class:opacity-50={isUploading}
				class:pointer-events-none={isUploading}
				class:border-red-500={dragError}
				role="button"
				tabindex="0"
				on:drop={handleDrop}
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:click={openFileSelector}
				on:keydown={handleKeyDown}
			>
				{#if isUploading}
					<div class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
						<Spinner size="12" />
						<span class="ml-2">{m.uploading()}</span>
					</div>
				{:else if isDragging}
					<p class="text-center {dragError ? 'text-red-500' : 'text-blue-500'}">
						{dragError ? m.invalidFileType() : m.dropPdfHere()}
					</p>
				{:else}
					<div class="text-center">
						<p>{m.dropClickUpload()}</p>
						<p class="mt-2 text-sm text-gray-500">{m.onlyPdfNote()}</p>
					</div>
				{/if}
				<input
					type="file"
					accept="application/pdf"
					class="hidden"
					bind:this={fileInput}
					on:change={handleFileChange}
					disabled={isUploading}
				/>
			</div>
			<Button color="alternative" on:click={resetForm} disabled={isUploading}>
				{m.back()}
			</Button>

			<!-- text state with text input area -->
		{:else if uploadMode === 'text'}
			<form on:submit|preventDefault={addResource} class="space-y-4">
				<div>
					<label for="name" class="mb-2 block">{m.resourceNameLabel()}</label>
					<Input
						id="name"
						bind:value={newResource.name}
						on:input={handleNameInput}
						required
						placeholder={m.resourceNamePlaceholder()}
					/>
					<p class="mt-1 text-sm text-gray-500">
						{m.characterCount({ current: newResource.name.length, limit: LIMITS.NAME_LENGTH })}
					</p>
				</div>

				<div>
					<label for="content" class="mb-2 block">{m.resourceContentLabel()}</label>
					<Textarea
						id="content"
						bind:value={newResource.content}
						on:input={handleContentInput}
						required
						rows={4}
						placeholder={m.resourceContentPlaceholder()}
					/>
					<p class="mt-1 text-sm text-gray-500">
						{m.characterCount({
							current: newResource.content.length,
							limit: LIMITS.CONTENT_LENGTH
						})}
					</p>
				</div>
				<div class="flex gap-4">
					<Button type="submit" color="primary">{m.add()}</Button>
					<Button color="alternative" on:click={resetForm}>{m.back()}</Button>
				</div>
			</form>
		{/if}
	{:else}
		<p class="font-style: mt-1 text-sm italic text-gray-500">
			{m.resourcesLimitReached()}
		</p>
	{/if}
</div>
