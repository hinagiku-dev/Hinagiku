<script lang="ts">
	import { enhance } from '$app/forms';
	import { profile } from '$lib/stores/profile';
	import { Button, Label, Input, Textarea, Card, Alert } from 'flowbite-svelte';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';

	let { form, data } = $props();
	let loading = $state(false);
</script>

<Title page={m.profileSettings()} />

<main class="mx-auto max-w-2xl px-4 py-16">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">{m.profileSettings()}</h1>
		<p class="mt-2 text-gray-600">{m.updateInfo()}</p>
	</div>

	{#if form}
		{#if form.success}
			<Alert color="green" class="mb-6">
				<svelte:fragment slot="icon">
					<CheckCircle class="h-4 w-4" />
				</svelte:fragment>
				{m.successMessage()}
			</Alert>
		{:else}
			<Alert color="red" class="mb-6">
				<svelte:fragment slot="icon">
					<XCircle class="h-4 w-4" />
				</svelte:fragment>
				{m.errorMessage()}
			</Alert>
		{/if}
	{/if}

	{#key $profile}
		<Card size="none" class="p-6">
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="space-y-6"
			>
				<div>
					<Label for="displayName" class="mb-2">{m.displayName()}</Label>
					<Input
						type="text"
						id="displayName"
						name="displayName"
						value={$profile?.displayName || data.user.name}
						required
					/>
				</div>

				<div>
					<Label for="title" class="mb-2">{m.title()}</Label>
					<Input
						type="text"
						id="title"
						name="title"
						value={$profile?.title ?? ''}
						placeholder={m.titlePlaceholder()}
					/>
				</div>

				<div>
					<Label for="bio" class="mb-2">{m.bio()}</Label>
					<Textarea
						id="bio"
						name="bio"
						value={$profile?.bio ?? ''}
						rows={4}
						placeholder={m.bioPlaceholder()}
					/>
					<p class="mt-2 text-sm text-gray-600">
						{m.bioHelp()}
					</p>
				</div>

				<div class="flex justify-end gap-4">
					<Button href="/dashboard" color="light">{m.cancel()}</Button>
					<Button type="submit" disabled={loading}>
						{loading ? m.saving() : m.saveChangesButton()}
					</Button>
				</div>
			</form>
		</Card>
	{/key}
</main>
