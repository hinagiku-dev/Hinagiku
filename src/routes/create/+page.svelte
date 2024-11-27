<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Label, Input } from 'flowbite-svelte';

	let { form } = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">Create Discussion Session</h1>

	{#if form?.errors}
		<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
			Please fix the following errors:
			{#each Object.entries(form.errors) as [field, errors]}
				<p>{field}: {errors}</p>
			{/each}
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
		<div>
			<Label for="title" class="mb-2">Session Title</Label>
			<Input
				type="text"
				id="title"
				name="title"
				required
				placeholder="Enter session title"
				value={form?.data?.title ?? ''}
			/>
			{#if form?.errors?.title}
				<p class="mt-1 text-sm text-red-600">{form.errors.title}</p>
			{/if}
		</div>

		<div>
			<Label for="task" class="mb-2">Main Task</Label>
			<Input
				type="text"
				id="task"
				name="task"
				required
				placeholder="Enter the main task"
				value={form?.data?.task ?? ''}
			/>
			{#if form?.errors?.task}
				<p class="mt-1 text-sm text-red-600">{form.errors.task}</p>
			{/if}
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="selfTime" class="mb-2">Individual Time (minutes)</Label>
				<Input
					type="number"
					id="selfTime"
					name="selfTime"
					required
					min="1"
					placeholder="5"
					value={form?.data?.timing.self ?? '5'}
				/>
			</div>
			<div>
				<Label for="groupTime" class="mb-2">Group Time (minutes)</Label>
				<Input
					type="number"
					id="groupTime"
					name="groupTime"
					required
					min="1"
					placeholder="10"
					value={form?.data?.timing.group ?? '10'}
				/>
			</div>
			{#if form?.errors?.timing}
				<p class="mt-1 text-sm text-red-600">{form.errors.timing}</p>
			{/if}
		</div>

		<div class="flex gap-4">
			<Button type="submit" class="">Create Session</Button>
			<Button href="/dashboard" color="light">Cancel</Button>
		</div>
	</form>
</main>
