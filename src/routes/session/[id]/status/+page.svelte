<script lang="ts">
	import { Alert } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages.js';
	interface Participant {
		id: string;
		displayName: string;
		status: 'red' | 'yellow' | 'green';
	}

	interface Group {
		id: string;
		number: string;
		participants: Participant[];
	}

	export let data: { groups: Group[] };

	// 確保 groups 不為 undefined
	const groups = data.groups || [];
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<h2 class="mb-4 text-3xl font-bold">{m.dashboardTitle()}</h2>
	{#if groups.length === 0}
		<Alert color="blue">{m.loadingGroups()}</Alert>
	{:else}
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			{#each groups as group, index}
				<div class="group mb-8">
					<h3 class="mb-4 text-2xl font-semibold">Group #{index + 1}</h3>
					{#if group.participants.length === 0}
						<Alert color="blue">{m.noParticipantsInGroup()}</Alert>
					{:else}
						<ul class="space-y-4">
							{#each group.participants as participant}
								<li class="flex items-center justify-between border-b py-2">
									<span class="text-lg">{participant.displayName}</span>
									<span class="status-indicator {`status-${participant.status}`}"></span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.status-indicator {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
	}
	.status-red {
		background-color: red;
	}
	.status-yellow {
		background-color: yellow;
	}
	.status-green {
		background-color: green;
	}
</style>
