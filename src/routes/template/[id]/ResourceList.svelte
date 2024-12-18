<script lang="ts">
	import { Button, Input, Textarea, Alert } from 'flowbite-svelte';
	import { Trash2 } from 'lucide-svelte';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';
	// import { pdf2Text } from '$lib/server/pdf';

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

	let isDragging = false;
	let fileInput: HTMLInputElement | null = null;

	const sourceMaxNum = 10;
	const nameMaxLength = 100;
	const contentMaxLength = 1000;

	// add text resource
	async function addTextResource() {
		error = '';
		success = '';

		try {
			const res = await fetch(`/api/template/${$page.params.id}/resource`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newResource)
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to add text resource';
				return;
			}

			newResource = { name: '', content: '', type: 'text' };
			success = 'Text Resource added successfully';
		} catch (e) {
			console.error('Error adding text resource:', e);
			error = 'Failed to add text resource';
		}
	}

	// add file resource
	async function addFileResource(file: File) {
		error = '';
		success = '';

		try {
			const fileName = file.name;

			// const dataBuffer = await file.arrayBuffer();
			// const file_content = await pdf2Text(dataBuffer);

			newResource['name'] = fileName;
			newResource['content'] = 'file_content';

			const res = await fetch(`/api/template/${$page.params.id}/resource`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newResource)
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to add file resource';
				return;
			}

			newResource = { name: '', content: '', type: 'text' };
			success = 'File Resource added successfully';
		} catch (e) {
			console.error('Error adding file resource:', e);
			error = 'Failed to add file resource';
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

	// file change event handler for addFileResource function
	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			await addFileResource(input.files[0]);
		}
	}

	// drop event handler for addFileResource function
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			await addFileResource(e.dataTransfer.files[0]);
		}
	}

	// open file selector for addFileResource function
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
	function handleNameInput(e: Event) {
		const input = e.target as HTMLInputElement;
		newResource.name = input.value.slice(0, nameMaxLength);
	}

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
			<Button color="alternative" class="mt-4" on:click={resetForm}>Back</Button>

			<!-- text state with text input area -->
		{:else if uploadMode === 'text'}
			<form on:submit|preventDefault={addTextResource} class="space-y-4">
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
