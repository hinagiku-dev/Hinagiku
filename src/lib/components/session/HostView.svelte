<script lang="ts">
	import { Play } from 'lucide-svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Button } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';

	let { session }: { session: Readable<Session> } = $props();

	async function handleStartSession() {
		const response = await fetch(`/api/session/${$page.params.id}/action/start-individual`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to start session:', data.error);
		}
	}

	async function handleEndIndividual() {
		const response = await fetch(`/api/session/${$page.params.id}/action/end-individual`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to end individual stage:', data.error);
		}
	}

	async function handleStartGroup() {
		const response = await fetch(`/api/session/${$page.params.id}/action/start-group`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to start group stage:', data.error);
		}
	}

	async function handleEndGroup() {
		const response = await fetch(`/api/session/${$page.params.id}/action/end-group`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to end group stage:', data.error);
		}
	}

	const stageButton = $derived({
		preparing: {
			text: 'Start Individual Stage',
			action: handleStartSession,
			show: true
		},
		individual: {
			text: 'End Individual Stage',
			action: handleEndIndividual,
			show: true
		},
		'before-group': {
			text: 'Start Group Stage',
			action: handleStartGroup,
			show: true
		},
		group: {
			text: 'End Group Stage',
			action: handleEndGroup,
			show: true
		},
		ended: {
			text: 'Session Ended',
			action: () => {
				notifications.error('Already Ended', 3000);
			},
			show: false
		}
	});
</script>

<main class="mx-auto max-w-4xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{$session?.title}</h1>
		</div>

		<div class="flex items-center gap-4">
			{#if $session && stageButton[$session.status].show}
				<Button color="primary" on:click={stageButton[$session.status].action}>
					<Play class="mr-2 h-4 w-4" />
					{stageButton[$session.status].text}
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-8 md:grid-cols-2">
		<!-- Status Section -->
		<div class="rounded-lg border p-6">
			<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
			<div class="flex items-center gap-2">
				<!-- svelte-ignore element_invalid_self_closing_tag -->
				<span
					class="inline-block h-3 w-3 rounded-full {$session?.status === 'preparing'
						? 'bg-yellow-500'
						: $session?.status === 'individual'
							? 'bg-blue-500'
							: $session?.status === 'before-group'
								? 'bg-purple-500'
								: $session?.status === 'group'
									? 'bg-green-500'
									: 'bg-gray-500'}"
				/>
				<span class="capitalize">{$session?.status}</span>
			</div>

			{#if $session?.status === 'preparing'}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Session QR Code</h3>
					<QRCode value={`${$page.url.origin}/session/${$page.params.id}`} />
				</div>
			{/if}
		</div>

		<!-- Task Section -->
		<div class="rounded-lg border p-6">
			<h2 class="mb-4 text-xl font-semibold">Main Task</h2>
			<p class="text-gray-700">{$session?.task}</p>

			{#if $session?.subtasks.length > 0}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Subtasks:</h3>
					<ul class="list-inside list-disc space-y-2">
						{#each $session?.subtasks as subtask}
							<li class="text-gray-700">{subtask}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Resources Section -->
		<div class="rounded-lg border p-6 md:col-span-2">
			<h2 class="mb-4 text-xl font-semibold">Resources</h2>
			{#if $session?.resources.length === 0}
				<p class="text-gray-600">No resources available</p>
			{:else}
				<div class="space-y-4">
					{#each $session?.resources as resource}
						<div class="rounded-lg border p-4">
							<h3 class="font-medium">{resource.name}</h3>
							<p class="mt-2 text-gray-700">{resource.content}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>
