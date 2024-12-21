<script lang="ts">
	import { Button, Input, Textarea, Alert } from 'flowbite-svelte';
	import { Trash2 } from 'lucide-svelte';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';

	export let template: Template;
	let resources = template.resources;

	let uploadMode: 'none' | 'text' | 'file' = 'none';
	let newResource = {
		name: '',
		content: '',
		type: 'text' as const
	};
	let error = '';
	let success = '';

	// variables for drag and drop file upload handling
	let isDragging = false;
	let fileInput: HTMLInputElement | null = null;

	// constants for resource limits, text resource name and content length
	const sourceMaxNum = 10;
	const nameMaxLength = 30;
	const contentMaxLength = 100;

	// temp file to store file resource
	let tempFile: File | null = null;

	// add resource (text or file resource)
	async function addResource() {
		error = '';
		success = '';

		try {
			const formData = new FormData();
			formData.append('name', newResource.name);
			formData.append('content', tempFile ? tempFile : newResource.content);
			formData.append('type', newResource.type);

			const res = await fetch(`/api/template/${$page.params.id}/resource`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to add text resource';
				return;
			}

			newResource = { name: '', content: '', type: 'text' };
			tempFile = null;
			success = 'Text Resource added successfully';
		} catch (e) {
			console.error('Error adding text resource:', e);
			error = 'Failed to add text resource';
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
				error = data.error || 'Failed to delete resource';
				return;
			}

			success = 'Resource deleted successfully';
		} catch (e) {
			console.error('Error deleting resource:', e);
			error = 'Failed to delete resource';
		}
	}

	// handle file to add in newResource object
	async function processFileResource(file: File) {
		newResource['name'] = file.name;
		newResource['content'] = file.size + ' bytes';
		addResource();
	}

	// file change event handler
	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			await processFileResource(input.files[0]);
		}
	}

	// drop event handler
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			await processFileResource(e.dataTransfer.files[0]);
		}
	}

	// open file selector
	function openFileSelector() {
		fileInput?.click();
	}

	// drag over event handler for handleDrop function
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	// drag leave event handler for handleDrop function
	function handleDragLeave() {
		isDragging = false;
	}

	// key down event handler for openFileSelector function
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			openFileSelector();
		}
	}

	// reset state for back button
	function resetForm() {
		uploadMode = 'none';
		error = '';
		success = '';
	}

	// handle text resource name input event
	function handleNameInput(e: Event) {
		const input = e.target as HTMLInputElement;
		newResource.name = input.value.slice(0, nameMaxLength);
	}

	// handle text resource content input event
	function handleContentInput(e: Event) {
		const input = e.target as HTMLTextAreaElement;
		newResource.content = input.value.slice(0, contentMaxLength);
	}
</script>

<h2 class="mb-4 text-xl font-semibold">Resource List ({resources.length}/{sourceMaxNum})</h2>
<div class="space-y-4">
	<!-- error and success alert -->
	{#if error}
		<Alert color="red" class="mb-4">{error}</Alert>
	{/if}

	{#if success}
		<Alert color="green" class="mb-4">{success}</Alert>
	{/if}

	<!-- current resource list -->
	<div class="space-y-4">
		{#each resources as resource (resource.id)}
			<div class="rounded-lg border p-4">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h3 class="font-semibold">{resource.name}</h3>
						<p class="mt-1 text-sm text-gray-600">{resource.content}</p>
					</div>
					<Button color="red" size="sm" on:click={() => deleteResource(resource.id)}>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/each}
	</div>

	{#if resources.length < 10}
		<!-- initial state with two buttons -->
		{#if uploadMode === 'none'}
			<div class="flex h-48 justify-center gap-4">
				<Button
					class="h-full flex-1 bg-blue-200 text-2xl text-blue-700 hover:bg-blue-300"
					on:click={() => (uploadMode = 'text')}
				>
					Click to Add Text Resource
				</Button>
				<Button
					class="h-full flex-1 bg-green-200 text-2xl text-green-700 hover:bg-green-300"
					on:click={() => (uploadMode = 'file')}
				>
					Click to Upload File Resource
				</Button>
			</div>

			<!-- upload state with file input area -->
		{:else if uploadMode === 'file'}
			<div
				class="flex h-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-gray-600 hover:bg-gray-50 focus:outline-none"
				role="button"
				tabindex="0"
				on:drop={handleDrop}
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:click={openFileSelector}
				on:keydown={handleKeyDown}
			>
				{#if isDragging}
					<p class="text-center text-blue-500">Drop Here to Upload File</p>
				{:else}
					<div class="text-center">
						<p>Drop or Click to <br /> Upload File Resource</p>
					</div>
				{/if}
				<input type="file" class="hidden" bind:this={fileInput} on:change={handleFileChange} />
			</div>
			<Button color="alternative" on:click={resetForm}>Back</Button>

			<!-- text state with text input area -->
		{:else if uploadMode === 'text'}
			<form on:submit|preventDefault={addResource} class="space-y-4">
				<div>
					<label for="name" class="mb-2 block">Name</label>
					<Input
						id="name"
						bind:value={newResource.name}
						on:input={handleNameInput}
						required
						placeholder="Resource name (limited to 100 characters)"
					/>
					<p class="mt-1 text-sm text-gray-500">{newResource.name.length}/{nameMaxLength}</p>
				</div>

				<div>
					<label for="content" class="mb-2 block">Content</label>
					<Textarea
						id="content"
						bind:value={newResource.content}
						on:input={handleContentInput}
						required
						rows={4}
						placeholder="Resource content (limited to 1000 characters)"
					/>
					<p class="mt-1 text-sm text-gray-500">{newResource.content.length}/{contentMaxLength}</p>
				</div>
				<div class="flex gap-4">
					<Button type="submit" color="primary">Add</Button>
					<Button color="alternative" on:click={resetForm}>Back</Button>
				</div>
			</form>
		{/if}
	{:else}
		<p class="font-style: mt-1 text-sm italic text-gray-500">
			You can only add up to 10 resources.
		</p>
	{/if}
</div>
