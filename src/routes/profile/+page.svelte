<script lang="ts">
	import { enhance } from '$app/forms';
	import { profile } from '$lib/stores/profile';
	import { Button, Label, Input, Textarea, Card, Alert } from 'flowbite-svelte';
	import { CheckCircle } from 'lucide-svelte';

	let { form, data } = $props();
	let loading = $state(false);
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Profile Settings</h1>
		<p class="mt-2 text-gray-600">Update your personal information and preferences</p>
	</div>

	{#if form?.success}
		<Alert color="green" class="mb-6">
			<svelte:fragment slot="icon">
				<CheckCircle class="h-4 w-4" />
			</svelte:fragment>
			Profile updated successfully!
		</Alert>
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
					<Label for="displayName" class="mb-2">Display Name</Label>
					<Input
						type="text"
						id="displayName"
						name="displayName"
						value={$profile?.displayName || data.user.name}
						required
					/>
				</div>

				<div>
					<Label for="title" class="mb-2">Title</Label>
					<Input
						type="text"
						id="title"
						name="title"
						value={$profile?.title ?? ''}
						placeholder="e.g. Professor, Student, Teaching Assistant"
					/>
				</div>

				<div>
					<Label for="bio" class="mb-2">Bio</Label>
					<Textarea
						id="bio"
						name="bio"
						value={$profile?.bio ?? ''}
						rows={4}
						placeholder="Tell us about yourself"
					/>
					<p class="mt-2 text-sm text-gray-600">
						Write a short bio to help others know more about you
					</p>
				</div>

				<div class="flex justify-end gap-4">
					<Button href="/dashboard" color="light">Cancel</Button>
					<Button type="submit" disabled={loading}>
						{loading ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</Card>
	{/key}
</main>
