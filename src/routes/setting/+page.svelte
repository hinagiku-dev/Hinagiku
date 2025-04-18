<script lang="ts">
	import { setting } from '$lib/stores/setting';
	import { Button, Label, Card, Alert, Toggle } from 'flowbite-svelte';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { deploymentConfig } from '$lib/config/deployment';

	let loading = $state(false);
	let success = $state<boolean | null>(null);
	let error = $state<string | null>(null);

	let enableVADIndividual = $state(false);
	let enableVADGroup = $state(true);

	onMount(() => {
		const unsubscribe = setting.subscribe((value) => {
			console.log('setting', value);
			if (value) {
				enableVADIndividual = value.enableVADIndividual ?? false;
				enableVADGroup = value.enableVADGroup ?? true;
			}
		});

		return unsubscribe;
	});

	async function updateSettings() {
		loading = true;
		success = null;
		error = null;

		try {
			const response = await fetch('/api/setting', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					enableVADIndividual,
					enableVADGroup
				})
			});

			const result = await response.json();

			if (response.ok) {
				success = true;
			} else {
				success = false;
				error = result.error || 'Failed to update settings';
			}
		} catch (err) {
			console.error('Error updating settings:', err);
			success = false;
			error = 'Network error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{m.settings()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">{m.settings()}</h1>
		<p class="mt-2 text-gray-600">{m.settingsInfo()}</p>
	</div>

	{#if success !== null}
		{#if success}
			<Alert color="green" class="mb-6">
				<svelte:fragment slot="icon">
					<CheckCircle class="h-4 w-4" />
				</svelte:fragment>
				{m.settingsSuccessMessage()}
			</Alert>
		{:else}
			<Alert color="red" class="mb-6">
				<svelte:fragment slot="icon">
					<XCircle class="h-4 w-4" />
				</svelte:fragment>
				{error || m.settingsErrorMessage()}
			</Alert>
		{/if}
	{/if}

	{#key $setting}
		<Card size="none" class="p-6">
			<div class="space-y-6">
				<div>
					<div class="flex items-center justify-between">
						<Label for="enableVADIndividual" class="mb-0"
							>{m.enableVADIndividual
								? m.enableVADIndividual()
								: 'Enable Voice Activity Detection (Individual Stage)'}</Label
						>
						<Toggle id="enableVADIndividual" bind:checked={enableVADIndividual} />
					</div>
					<p class="mt-2 text-sm text-gray-600">
						{m.enableVADHelpIndividual
							? m.enableVADHelpIndividual()
							: "Voice Activity Detection for the individual stage - automatic detection of when you're speaking during individual tasks"}
					</p>
				</div>

				<div>
					<div class="flex items-center justify-between">
						<Label for="enableVADGroup" class="mb-0"
							>{m.enableVADGroup
								? m.enableVADGroup()
								: 'Enable Voice Activity Detection (Group Stage)'}</Label
						>
						<Toggle id="enableVADGroup" bind:checked={enableVADGroup} />
					</div>
					<p class="mt-2 text-sm text-gray-600">
						{m.enableVADHelpGroup
							? m.enableVADHelpGroup()
							: "Voice Activity Detection for the group stage - automatic detection of when you're speaking during group discussions"}
					</p>
				</div>

				<div class="flex justify-end gap-4">
					<Button class="cursor-pointer" href="/dashboard" color="light">{m.cancel()}</Button>
					<Button class="cursor-pointer" on:click={updateSettings} disabled={loading}>
						{loading ? m.saving() : m.saveChangesButton()}
					</Button>
				</div>
			</div>
		</Card>
	{/key}
</main>
