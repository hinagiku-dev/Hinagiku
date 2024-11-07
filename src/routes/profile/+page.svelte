<script lang="ts">
	import { enhance } from '$app/forms';

	let { form, data } = $props();

	let loading = $state(false);
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">Profile Settings</h1>

	{#if form?.success}
		<div class="mb-6 rounded-lg bg-green-100 p-4 text-green-700">Profile updated successfully!</div>
	{/if}

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
			<label for="displayName" class="mb-2 block font-medium">Display Name</label>
			<input
				type="text"
				id="displayName"
				name="displayName"
				value={data.profile?.displayName ?? data.user.name}
				required
				class="w-full rounded-lg border p-2"
			/>
		</div>

		<div>
			<label for="title" class="mb-2 block font-medium">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				value={data.profile?.title ?? ''}
				placeholder="e.g. Professor, Student, Teaching Assistant"
				class="w-full rounded-lg border p-2"
			/>
		</div>

		<div>
			<label for="bio" class="mb-2 block font-medium">Bio</label>
			<textarea
				id="bio"
				name="bio"
				value={data.profile?.bio ?? ''}
				rows="4"
				class="w-full rounded-lg border p-2"
				placeholder="Tell us about yourself"
			></textarea>
		</div>

		<button
			type="submit"
			class="w-full rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
			disabled={loading}
		>
			{loading ? 'Saving...' : 'Save Profile'}
		</button>
	</form>
</main>
