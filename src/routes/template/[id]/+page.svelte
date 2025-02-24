<script lang="ts">
	import { Button, Input, Toggle, Textarea, Modal, Tooltip } from 'flowbite-svelte';
	import { Plus, Trash2, Save, Play } from 'lucide-svelte';
	import { page } from '$app/stores';
	import type { Template } from '$lib/schema/template';
	import ResourceList from './ResourceList.svelte';
	import { onDestroy } from 'svelte';
	import { doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { goto } from '$app/navigation';
	import { notifications } from '$lib/stores/notifications';
	import { language } from '$lib/stores/language'; // Import the global language store

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

	let unsavedChanges = false;
	$: {
		if ($template) {
			unsavedChanges =
				title.trim() !== $template.title ||
				task.trim() !== $template.task ||
				isPublic !== $template.public ||
				subtasks.join() !== $template.subtasks.join();
		}
	}

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
					title: title.trim(),
					task: task.trim(),
					public: isPublic,
					subtasks: subtasks.filter((subtask) => subtask.trim())
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

	const translations = {
		en: {
			editTemplate: 'Edit Template',
			startSession: 'Start Session',
			saveChanges: 'Save changes before starting a session',
			startDiscussion: 'Start a discussion session with this template',
			title: 'Title',
			templateTitle: 'Template title',
			mainTask: 'Main Task',
			mainTaskDesc: 'Main task description',
			subtasks: 'Subtasks',
			subtaskDesc: 'Subtask description',
			addSubtask: 'Add Subtask',
			makePublic: 'Make template public',
			backToDashboard: 'Back to Dashboard',
			unsavedChanges: 'You have unsaved changes!',
			deleteTemplate: 'Delete this Template',
			saveChangesButton: 'Save Changes',
			allChangesSaved: 'All changes saved',
			deleteConfirmation: 'Are you sure you want to delete this template?',
			yesDelete: 'Yes, delete it',
			noCancel: 'No, cancel',
			loadingTemplate: 'Loading template...'
		},
		zh: {
			editTemplate: '編輯模板',
			startSession: '開始會話',
			saveChanges: '保存更改後再開始會話',
			startDiscussion: '使用此模板開始討論會話',
			title: '標題',
			templateTitle: '模板標題',
			mainTask: '主要任務',
			mainTaskDesc: '主要任務描述',
			subtasks: '子任務',
			subtaskDesc: '子任務描述',
			addSubtask: '添加子任務',
			makePublic: '將模板設為公開',
			backToDashboard: '返回儀表板',
			unsavedChanges: '您有未保存的更改！',
			deleteTemplate: '刪除此模板',
			saveChangesButton: '保存更改',
			allChangesSaved: '所有更改已保存',
			deleteConfirmation: '您確定要刪除此模板嗎？',
			yesDelete: '是的，刪除它',
			noCancel: '不，取消',
			loadingTemplate: '加載模板...'
		}
	};
</script>

<svelte:head>
	<title>{translations[$language].editTemplate} | Hinagiku</title>
</svelte:head>

{#if template}
	<div class="container mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8 flex items-center justify-between">
			<h1 class="text-3xl font-bold">{translations[$language].editTemplate}</h1>
			<Button color="primary" on:click={startSession} disabled={isUploading || unsavedChanges}>
				<Play class="mr-2 h-4 w-4" />
				{translations[$language].startSession}
			</Button>
			<Tooltip placement="left">
				{#if unsavedChanges}
					{translations[$language].saveChanges}
				{:else}
					{translations[$language].startDiscussion}
				{/if}
			</Tooltip>
		</div>

		<form on:submit|preventDefault={saveTemplate} class="space-y-6">
			<div>
				<label for="title" class="mb-2 block">{translations[$language].title}</label>
				<Input
					id="title"
					bind:value={title}
					required
					maxlength={50}
					placeholder={translations[$language].templateTitle}
				/>
			</div>

			<div>
				<label for="task" class="mb-2 block">{translations[$language].mainTask}</label>
				<Textarea
					id="task"
					bind:value={task}
					required
					maxlength={200}
					rows={3}
					placeholder={translations[$language].mainTaskDesc}
				/>
			</div>

			<div>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="mb-4 block">{translations[$language].subtasks}</label>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each subtasks as subtask, i}
					<div class="mb-2 flex gap-2">
						<Input
							bind:value={subtasks[i]}
							required
							maxlength={200}
							placeholder={translations[$language].subtaskDesc}
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
					{translations[$language].addSubtask}
				</Button>
			</div>

			<div class="flex items-center gap-2">
				<Toggle bind:checked={isPublic} />
				<label for="public">{translations[$language].makePublic}</label>
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
					{translations[$language].backToDashboard}
				</Button>
				{#if unsavedChanges}
					<Tooltip>{translations[$language].unsavedChanges}</Tooltip>
				{/if}
				<Button color="red" on:click={() => (showDeleteModal = true)} disabled={isUploading}>
					<Trash2 class="mr-2 h-4 w-4" />
					{translations[$language].deleteTemplate}
				</Button>
				<Button type="submit" color="primary" disabled={isUploading || !unsavedChanges}>
					<Save class="mr-2 h-4 w-4" />
					{translations[$language].saveChangesButton}
				</Button>
				{#if !unsavedChanges}
					<Tooltip>{translations[$language].allChangesSaved}</Tooltip>
				{/if}
			</div>
		</form>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<div class="text-center text-gray-500">{translations[$language].loadingTemplate}</div>
	</div>
{/if}

<Modal bind:open={showDeleteModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			{translations[$language].deleteConfirmation}
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={deleteTemplate}>{translations[$language].yesDelete}</Button>
			<Button color="alternative" on:click={() => (showDeleteModal = false)}
				>{translations[$language].noCancel}</Button
			>
		</div>
	</div>
</Modal>
