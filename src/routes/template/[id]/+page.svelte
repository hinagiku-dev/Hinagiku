<script lang="ts">
	import { Button, Input, Toggle, Textarea, Modal, Tooltip, Card, Spinner } from 'flowbite-svelte';
	import { Plus, Trash2, Save, Play, Upload, X } from 'lucide-svelte';
	import { page } from '$app/stores';
	import type { Template } from '$lib/schema/template';
	import ResourceList from './ResourceList.svelte';
	import TemplateLabelManager from '$lib/components/template/LabelManager.svelte';
	import { onDestroy } from 'svelte';
	import { doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribe } from '$lib/firebase/store';
	import { goto } from '$app/navigation';
	import { notifications } from '$lib/stores/notifications';
	import * as m from '$lib/paraglide/messages';
	import { i18n } from '$lib/i18n';
	import { deploymentConfig } from '$lib/config/deployment';

	let title = '';
	let task = '';
	let isPublic = false;
	let labels: string[] = [];
	let subtasks: string[] = [];
	let showDeleteModal = false;
	let isUploading = false;
	let backgroundImage: File | null = null;
	let uploadingBackground = false;
	let backgroundPreview: string | null = null; // Permanent URL from Cloud Storage
	let localPreviewUrl: string | null = null; // Temporary blob URL for local preview

	const templateRef = doc(db, 'templates', $page.params.id);
	const [template, { unsubscribe }] = subscribe<Template>(templateRef);

	template.subscribe((t) => {
		if (t) {
			title = t.title;
			task = t.task;
			isPublic = t.public;
			subtasks = [...t.subtasks];
			labels = t.labels ? [...t.labels] : [];
			backgroundPreview = t.backgroundImage || null;
		}
	});

	let unsavedChanges = false;
	$: {
		if ($template) {
			unsavedChanges =
				title.trim() !== $template.title ||
				task.trim() !== $template.task ||
				isPublic !== $template.public ||
				subtasks.join() !== $template.subtasks.join() ||
				backgroundPreview !== $template.backgroundImage;
		}
	}

	// Cleanup subscription on component destroy
	onDestroy(() => {
		unsubscribe();

		// Clean up any blob URLs created for local preview
		if (localPreviewUrl) {
			URL.revokeObjectURL(localPreviewUrl);
		}
	});

	// Handle file input change
	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			// Revoke previous blob URL if it exists
			if (localPreviewUrl) {
				URL.revokeObjectURL(localPreviewUrl);
			}

			backgroundImage = input.files[0];
			// Create a local preview URL
			localPreviewUrl = URL.createObjectURL(backgroundImage);
		}
	}

	// Upload background image
	async function uploadBackgroundImage() {
		if (!backgroundImage) return;

		try {
			uploadingBackground = true;
			const formData = new FormData();
			formData.append('backgroundImage', backgroundImage);

			const res = await fetch(`/api/template/${$page.params.id}/background`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || m.failedUploadBackground());
				return;
			}

			const data = await res.json();
			// Update with permanent URL from Cloud Storage
			backgroundPreview = data.imageUrl;
			notifications.success(m.backgroundImageUploaded());

			// Clean up local preview
			if (localPreviewUrl) {
				URL.revokeObjectURL(localPreviewUrl);
				localPreviewUrl = null;
			}
			backgroundImage = null;
		} catch (e) {
			console.error('Error uploading background image:', e);
			notifications.error(m.failedUploadBackground());
		} finally {
			uploadingBackground = false;
		}
	}

	// Clear selected background image
	function clearBackgroundImage() {
		backgroundImage = null;
		if (localPreviewUrl) {
			URL.revokeObjectURL(localPreviewUrl);
			localPreviewUrl = null;
		}
	}

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
					subtasks: subtasks.filter((subtask) => subtask.trim()),
					labels,
					backgroundImage: backgroundPreview
				})
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || m.failedSaveTemplate());
				return;
			}

			notifications.success(m.saveTemplateSuccess());
		} catch (e) {
			console.error('Error saving template:', e);
			notifications.error(m.failedSaveTemplate());
		}
	}

	function addSubtask() {
		if (subtasks.length < 10) {
			subtasks = [...subtasks, ''];
		}
	}

	function removeSubtask(index: number) {
		subtasks = subtasks.filter((_, i) => i !== index);
		notifications.success(m.subtaskRemoved());
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
				notifications.error(data.error || m.failedCreateSession());
				return;
			}

			const data = await res.json();
			await goto(i18n.resolveRoute(`/session/${data.sessionId}`));
		} catch (e) {
			console.error('Error creating session:', e);
			notifications.error(m.failedCreateSession());
		}
	}

	async function deleteTemplate() {
		try {
			const res = await fetch(`/api/template/${$page.params.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				notifications.error(data.error || m.failedDeleteTemplate());
				return;
			}

			await goto(i18n.resolveRoute('/dashboard'));
		} catch (e) {
			console.error('Error deleting template:', e);
			notifications.error(m.failedDeleteTemplate());
		}
	}
</script>

<svelte:head>
	<title>{m.editTemplate()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

{#if template}
	<div class="container mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8 flex items-center justify-between">
			<h1 class="text-3xl font-bold">{m.editTemplate()}</h1>
			<Button color="primary" on:click={startSession} disabled={isUploading || unsavedChanges}>
				<Play class="mr-2 h-4 w-4" />
				{m.startSession()}
			</Button>
			<Tooltip placement="left">
				{#if unsavedChanges}
					{m.saveChanges()}
				{:else}
					{m.startDiscussion()}
				{/if}
			</Tooltip>
		</div>

		<form on:submit|preventDefault={saveTemplate} class="space-y-6">
			<div>
				<label for="title" class="mb-2 block">{m.title()}</label>
				<Input
					id="title"
					bind:value={title}
					required
					maxlength={50}
					placeholder={m.templateTitle()}
				/>
			</div>

			<div>
				<label for="task" class="mb-2 block">{m.mainTask()}</label>
				<Textarea
					id="task"
					bind:value={task}
					required
					maxlength={200}
					rows={3}
					placeholder={m.mainTaskDesc()}
				/>
			</div>

			<div>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="mb-4 block">{m.subtasks()}</label>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each subtasks as subtask, i}
					<div class="mb-2 flex gap-2">
						<Input
							bind:value={subtasks[i]}
							required
							maxlength={200}
							placeholder={m.subtaskDesc()}
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
					{m.addSubtask()}
				</Button>
			</div>

			<div>
				<p class="mb-4 font-medium">{m.tags()}</p>
				<TemplateLabelManager templateId={$page.params.id} {labels} />
			</div>

			<div class="flex items-center gap-2">
				<Toggle bind:checked={isPublic} />
				<label for="public">{m.makePublic()}</label>
			</div>

			<div class="border-t pt-6">
				<h2 class="mb-4 text-xl font-semibold">{m.backgroundImageTitle()}</h2>
				<div class="mb-4">
					<p class="mb-2 text-sm text-gray-600">
						{m.backgroundImageDesc()}
					</p>

					{#if backgroundPreview}
						<div class="relative mb-4">
							<Card padding="none" class="overflow-hidden">
								<img
									src={backgroundPreview}
									alt="Background preview"
									class="h-48 w-full object-cover"
								/>
							</Card>
							{#if !uploadingBackground}
								<Button
									color="red"
									size="xs"
									class="absolute right-2 top-2"
									on:click={() => {
										if (confirm(m.removeBackgroundConfirm())) {
											backgroundPreview = null;
											saveTemplate();
										}
									}}
								>
									<X class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{:else if backgroundImage && localPreviewUrl}
						<div class="relative mb-4">
							<Card padding="none" class="overflow-hidden">
								<img
									src={localPreviewUrl}
									alt="Background preview"
									class="h-48 w-full object-cover"
								/>
							</Card>
							{#if !uploadingBackground}
								<Button
									color="red"
									size="xs"
									class="absolute right-2 top-2"
									on:click={clearBackgroundImage}
								>
									<X class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{/if}

					{#if !backgroundPreview || backgroundImage}
						<div class="flex items-center gap-2">
							<input
								type="file"
								id="backgroundImage"
								accept="image/jpeg,image/png,image/gif,image/webp"
								on:change={handleFileInput}
								class="hidden"
							/>
							<label
								for="backgroundImage"
								class="flex cursor-pointer items-center justify-center rounded-lg bg-gray-100 p-3 hover:bg-gray-200"
							>
								<Upload class="mr-2 h-4 w-4" />
								{backgroundImage ? m.changeImage() : m.selectImage()}
							</label>

							{#if backgroundImage}
								<Button
									color="primary"
									on:click={uploadBackgroundImage}
									disabled={uploadingBackground}
								>
									{#if uploadingBackground}
										<Spinner class="mr-2" size="4" color="white" />
										{m.uploading()}
									{:else}
										<Save class="mr-2 h-4 w-4" />
										{m.uploadImage()}
									{/if}
								</Button>
							{/if}
						</div>
					{/if}
				</div>
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
					{m.backToDashboard()}
				</Button>
				{#if unsavedChanges}
					<Tooltip>{m.unsavedChanges()}</Tooltip>
				{/if}
				<Button color="red" on:click={() => (showDeleteModal = true)} disabled={isUploading}>
					<Trash2 class="mr-2 h-4 w-4" />
					{m.deleteTemplate()}
				</Button>
				<Button type="submit" color="primary" disabled={isUploading || !unsavedChanges}>
					<Save class="mr-2 h-4 w-4" />
					{m.saveChangesButton()}
				</Button>
				{#if !unsavedChanges}
					<Tooltip>{m.allChangesSaved()}</Tooltip>
				{/if}
			</div>
		</form>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<div class="text-center text-gray-500">{m.loadingTemplate()}</div>
	</div>
{/if}

<Modal bind:open={showDeleteModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			{m.deleteConfirmation()}
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={deleteTemplate}>{m.yesDelete()}</Button>
			<Button color="alternative" on:click={() => (showDeleteModal = false)}>{m.noCancel()}</Button>
		</div>
	</div>
</Modal>
