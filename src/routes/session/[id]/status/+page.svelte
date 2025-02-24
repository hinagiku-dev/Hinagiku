<script lang="ts">
	import { Alert } from 'flowbite-svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

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

	const translations = {
		en: {
			dashboardTitle: 'Participant Status Dashboard',
			loadingGroups: 'Loading groups...',
			noParticipants: 'No participants in this group.'
		},
		zh: {
			dashboardTitle: '參與者狀態儀表板',
			loadingGroups: '載入小組...',
			noParticipants: '此小組中沒有參與者。'
		}
	};
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<h2 class="mb-4 text-3xl font-bold">{translations[$language].dashboardTitle}</h2>
	{#if groups.length === 0}
		<Alert color="blue">{translations[$language].loadingGroups}</Alert>
	{:else}
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			{#each groups as group, index}
				<div class="group mb-8">
					<h3 class="mb-4 text-2xl font-semibold">Group #{index + 1}</h3>
					{#if group.participants.length === 0}
						<Alert color="blue">{translations[$language].noParticipants}</Alert>
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
