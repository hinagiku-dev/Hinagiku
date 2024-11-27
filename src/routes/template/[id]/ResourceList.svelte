<script lang="ts">
	import { Button, Input, Textarea, Alert } from 'flowbite-svelte';
	import { Trash2 } from 'lucide-svelte';
	import type { Template } from '$lib/schema/template';
	import { page } from '$app/stores';

	export let template: Template;
	let resources = template.resources;

	let newResource = {
		name: '',
		content: '',
		type: 'text' as const
	};
	let error = '';
	let success = '';

	async function addResource() {
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
				error = data.error || 'Failed to add resource';
				return;
			}

			newResource = { name: '', content: '', type: 'text' };
			success = 'Resource added successfully';
		} catch (e) {
			console.error('Error adding resource:', e);
			error = 'Failed to add resource';
		}
	}

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
</script>

<div class="space-y-4">
	{#if error}
		<Alert color="red" class="mb-4">
			{error}
		</Alert>
	{/if}

	{#if success}
		<Alert color="green" class="mb-4">
			{success}
		</Alert>
	{/if}

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
		<div class="mt-4 border-t pt-4">
			<h3 class="mb-4 font-semibold">Add New Resource</h3>
			<form on:submit|preventDefault={addResource} class="space-y-4">
				<div>
					<label for="name" class="mb-2 block">Name</label>
					<Input id="name" bind:value={newResource.name} required placeholder="Resource name" />
				</div>

				<div>
					<label for="content" class="mb-2 block">Content</label>
					<Textarea
						id="content"
						bind:value={newResource.content}
						required
						rows={3}
						placeholder="Resource content"
					/>
				</div>

				<Button type="submit" color="primary">Add Resource</Button>
			</form>
		</div>
	{/if}
</div>
