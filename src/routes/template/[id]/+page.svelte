<script lang="ts">
	import { Button, Input, Toggle, Textarea, Modal } from 'flowbite-svelte';
	import { Plus, Trash2, Save, X, Play } from 'lucide-svelte';
	import { page } from '$app/stores';
	import type { Template } from '$lib/schema/template';
	import ResourceList from './ResourceList.svelte';
	import { onDestroy } from 'svelte';
	import { doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { goto } from '$app/navigation';
	import { notifications } from '$lib/stores/notifications';

	let title = '';
	let task = '';
	let isPublic = false;
	let subtasks: string[] = [];
	let showDeleteModal = false;
	let isUploading = false;

	const templateRef = doc(db, 'templates', $page.params.id);
	const [template, { unsubscribe }] = subscribe<Template>(templateRef);

	template.subscribe((t) => {
		if (t) {
			title = t.title;
			task = t.task;
			isPublic = t.public;
			subtasks = [...t.subtasks];
		}
	});

	// Cleanup subscription on component destroy
	onDestroy(() => {
		unsubscribe();
	});

	async function saveTemplate() {
		if (!template) return;

		try {
			const res = await fetch(`/api/template/${$page.params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					task,
					public: isPublic,
					subtasks
				})
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || 'Failed to save template');
				return;
			}

			notifications.success('Template saved successfully');
		} catch (e) {
			console.error('Error saving template:', e);
			notifications.error('Failed to save template');
		}
	}

	function addSubtask() {
		if (subtasks.length < 10) {
			subtasks = [...subtasks, ''];
		}
	}

	function removeSubtask(index: number) {
		subtasks = subtasks.filter((_, i) => i !== index);
		notifications.info('Subtask removed');
	}

	async function startSession() {
		try {
			const res = await fetch('/api/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					templateId: $page.params.id
				})
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || 'Failed to create session');
				return;
			}

			const data = await res.json();
			await goto(`/session/${data.sessionId}`);
		} catch (e) {
			console.error('Error creating session:', e);
			notifications.error('Failed to create session');
		}
	}

	async function deleteTemplate() {
		try {
			const res = await fetch(`/api/template/${$page.params.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || 'Failed to delete template');
				return;
			}

			await goto('/dashboard');
		} catch (e) {
			console.error('Error deleting template:', e);
			notifications.error('Failed to delete template');
		}
	}
</script>

<svelte:head>
	<title>Edit Template | Hinagiku</title>
</svelte:head>

{#if template}
	<div class="container mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8 flex items-center justify-between">
			<h1 class="text-3xl font-bold">Edit Template</h1>
			<Button color="primary" on:click={startSession} disabled={isUploading}>
				<Play class="mr-2 h-4 w-4" />
				Start Session
			</Button>
		</div>

		<form on:submit|preventDefault={saveTemplate} class="space-y-6">
			<div>
				<label for="title" class="mb-2 block">Title</label>
				<Input
					id="title"
					bind:value={title}
					required
					maxlength={200}
					placeholder="Template title"
				/>
			</div>

			<div>
				<label for="task" class="mb-2 block">Main Task</label>
				<Textarea
					id="task"
					bind:value={task}
					required
					maxlength={200}
					rows={3}
					placeholder="Main task description"
				/>
			</div>

			<div>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="mb-4 block">Subtasks</label>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each subtasks as subtask, i}
					<div class="mb-2 flex gap-2">
						<Input
							bind:value={subtasks[i]}
							required
							maxlength={200}
							placeholder="Subtask description"
						/>
						<Button color="red" on:click={() => removeSubtask(i)} disabled={subtasks.length <= 1}>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				{/each}
				<Button
					color="alternative"
					on:click={addSubtask}
					disabled={subtasks.length >= 10}
					class="mt-2"
				>
					<Plus class="mr-2 h-4 w-4" />
					Add Subtask
				</Button>
			</div>

			<div class="flex items-center gap-2">
				<Toggle bind:checked={isPublic} />
				<label for="public">Make template public</label>
			</div>

			<div class="border-t pt-6">
				{#key $template}
					{#if $template}
						<ResourceList template={$template} bind:isUploading />
					{/if}
				{/key}
			</div>

			<div class="flex justify-end gap-4 border-t pt-6">
				<Button color="alternative" href="/dashboard" disabled={isUploading}>
					<X class="mr-2 h-4 w-4" />
					Back to Dashboard
				</Button>
				<Button color="red" on:click={() => (showDeleteModal = true)} disabled={isUploading}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete this Template
				</Button>
				<Button type="submit" color="primary" disabled={isUploading}>
					<Save class="mr-2 h-4 w-4" />
					Save Changes
				</Button>
			</div>
		</form>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<div class="text-center text-gray-500">Loading template...</div>
	</div>
{/if}

<Modal bind:open={showDeleteModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			Are you sure you want to delete this template?
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={deleteTemplate}>Yes, delete it</Button>
			<Button color="alternative" on:click={() => (showDeleteModal = false)}>No, cancel</Button>
		</div>
	</div>
</Modal>
