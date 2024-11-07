<script lang="ts">
	import { enhance } from '$app/forms';
	import { Plus, Trash2 } from 'lucide-svelte';

	let { form } = $props();

	let resources = $state([{ type: 'text', content: '' }]);

	function addResource() {
		resources = [...resources, { type: 'text', content: '' }];
	}

	function removeResource(index: number) {
		resources = resources.filter((_, i) => i !== index);
	}
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">Create Discussion Session</h1>

	{#if form?.success}
		<div class="rounded-lg border p-6 text-center">
			<h2 class="mb-4 text-xl font-semibold">Session Created!</h2>
			<p class="mb-4">Your session has been created successfully.</p>
			<p class="mb-4 text-sm text-gray-600">
				You can start the session and generate an invitation code when you're ready.
			</p>
			<a
				href={`/session/${form.sessionId}`}
				class="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white"
			>
				Go to Session
			</a>
		</div>
	{:else}
		<form method="POST" use:enhance class="space-y-6">
			<div>
				<label for="title" class="mb-2 block font-medium">Session Title</label>
				<input
					type="text"
					id="title"
					name="title"
					required
					class="w-full rounded-lg border p-2"
					placeholder="Enter session title"
				/>
				{#if form?.missing}
					<p class="mt-1 text-sm text-red-600">Please enter a title</p>
				{/if}
			</div>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="font-medium">Resources</label>
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-lg border px-3 py-1 hover:bg-gray-50"
						onclick={addResource}
					>
						<Plus size={16} />
						Add Resource
					</button>
				</div>

				{#each resources as resource, i}
					<div class="flex gap-2">
						<select
							name={`resourceType${i}`}
							class="rounded-lg border p-2"
							bind:value={resource.type}
						>
							<option value="text">Text</option>
							<option value="link">Link</option>
						</select>
						<input
							type="text"
							name={`resourceContent${i}`}
							class="flex-1 rounded-lg border p-2"
							placeholder={resource.type === 'link' ? 'Enter URL' : 'Enter text content'}
							bind:value={resource.content}
						/>
						<button
							type="button"
							class="rounded-lg border p-2 hover:bg-gray-50"
							onclick={() => removeResource(i)}
						>
							<Trash2 size={20} />
						</button>
					</div>
				{/each}
			</div>

			<button
				type="submit"
				class="w-full rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
			>
				Create Session
			</button>
		</form>
	{/if}
</main>
