<script lang="ts">
	import { enhance } from '$app/forms';
	import QrScanner from '$lib/components/QrScanner.svelte';
	import { validateTempId } from '$lib/utils/session';

	let { form } = $props();
	let showScanner = $state(false);
	let tempIdInput = $state('');
	let tempGroupInput = $state('');

	function handleScan(code: string) {
		if (validateTempId(code)) {
			tempIdInput = code;
			showScanner = false;
		}
	}
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">Join Discussion Session</h1>

	{#if form?.success}
		<div class="text-center">
			<p class="mb-4 text-xl">Successfully joined the session!</p>
			<a
				href={`/session/${form.sessionId}`}
				class="inline-block rounded-lg bg-primary-600 px-6 py-2 text-white"
			>
				Enter Session
			</a>
		</div>
	{:else}
		<form method="POST" use:enhance class="space-y-6">
			<div>
				<label for="tempId" class="mb-2 block font-medium">Session Code</label>
				<input
					type="number"
					id="tempId"
					name="tempId"
					bind:value={tempIdInput}
					required
					pattern="\d\{6}"
					class="w-full rounded-lg border p-2 font-bold"
					placeholder="Enter 6-digit code"
				/>
				{#if form?.idInvalid}
					<p class="mt-1 text-sm text-primary-600">Please enter a valid 6-digit code</p>
				{/if}
				{#if form?.notFound}
					<p class="mt-1 text-sm text-primary-600">Session not found or already started</p>
				{/if}
			</div>
			<div>
				<label for="groupNumber" class="mb-2 block font-medium">Group Number</label>
				<input
					type="number"
					id="groupNumber"
					name="groupNumber"
					bind:value={tempGroupInput}
					required
					pattern="^(?:[1-9]|[1-4][0-9]|50)$"
					class="w-full rounded-lg border p-2"
					placeholder="Please enter your group number"
				/>
				{#if form?.groupNumberInvalid}
					<p class="mt-1 text-sm text-red-600">Please enter a valid group number</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => (showScanner = !showScanner)}
				class="w-full rounded-lg border px-6 py-2 hover:bg-gray-50"
			>
				{showScanner ? 'Hide Scanner' : 'Scan QR Code'}
			</button>

			{#if showScanner}
				<QrScanner onScan={handleScan} />
			{/if}

			<button
				type="submit"
				class="w-full rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
			>
				Join Session
			</button>
		</form>
	{/if}
</main>
