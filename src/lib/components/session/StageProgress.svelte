<script lang="ts">
	import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-svelte';
	import { Button, Modal } from 'flowbite-svelte';
	import type { Session } from '$lib/schema/session';
	import * as m from '$lib/paraglide/messages.js';

	const stages = [
		{ id: 'preparing', name: '準備階段', color: 'bg-yellow-500' },
		{ id: 'individual', name: '個人階段', color: 'bg-blue-500' },
		{ id: 'before-group', name: '團體討論前階段', color: 'bg-purple-500' },
		{ id: 'group', name: '團體討論階段', color: 'bg-green-500' },
		{ id: 'ended', name: '總結階段', color: 'bg-gray-500' }
	] as const;

	export let session: Session | undefined;
	export let onStageChange: (stage: (typeof stages)[number]['id']) => void;
	export let showAction = true;

	let loadingPrevious = false;
	let loadingNext = false;
	let showEndedConfirmModal = false;

	$: currentStageIndex = stages.findIndex((s) => s.id === session?.status);
	$: canGoPrevious = currentStageIndex > 0 && !loadingPrevious;
	$: canGoNext = currentStageIndex < stages.length - 1 && !loadingNext;
	$: nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

	async function handlePrevious() {
		if (canGoPrevious) {
			loadingPrevious = true;
			try {
				await onStageChange(stages[currentStageIndex - 1].id);
			} finally {
				loadingPrevious = false;
			}
		}
	}

	async function handleNext() {
		if (!canGoNext) return;

		if (nextStage?.id === 'ended') {
			showEndedConfirmModal = true;
			return;
		}

		await proceedToNextStage();
	}

	async function proceedToNextStage() {
		loadingNext = true;
		try {
			await onStageChange(stages[currentStageIndex + 1].id);
		} finally {
			loadingNext = false;
		}
	}
</script>

{#if session?.status}
	<div class="flex items-center gap-4">
		<div class="flex items-center">
			{#each stages as stage, i}
				{@const isActive = session?.status === stage.id}
				{@const isPast = stages.findIndex((s) => s.id === session?.status) > i}
				<div class="flex items-center">
					{#if i > 0}
						<div class="h-0.5 w-4 {isPast ? 'bg-gray-200' : 'bg-gray-100'}"></div>
					{/if}
					<div
						class="flex h-4 w-4 items-center justify-center rounded-full border {isActive
							? stage.color
							: isPast
								? 'bg-gray-200'
								: 'bg-white'}"
						title={stage.name}
					>
						{#if isPast}
							<div class="h-2 w-2 rounded-full bg-gray-400"></div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<div class="flex items-center gap-2">
			<div class="text-base font-semibold tracking-wide">
				{stages.find((s) => s.id === session?.status)?.name}
			</div>
		</div>
	</div>
{/if}

{#if showAction}
	<div class="flex items-center gap-2">
		{#if canGoPrevious || loadingPrevious}
			<Button color="light" on:click={handlePrevious} disabled={!canGoPrevious || loadingPrevious}>
				{#if loadingPrevious && currentStageIndex > 0}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<ArrowLeft class="h-4 w-4" />
				{/if}
				<span class="ml-2">{stages[currentStageIndex - 1]?.name}</span>
			</Button>
		{/if}
		<Button color="primary" on:click={handleNext} disabled={!canGoNext || loadingNext}>
			<span class="ml-2">{stages[currentStageIndex + 1]?.name}</span>
			<span class="ml-2"
				>{#if loadingNext && currentStageIndex < stages.length - 1}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<ArrowRight class="h-4 w-4" />
				{/if}</span
			>
		</Button>
	</div>
{/if}

<Modal bind:open={showEndedConfirmModal} size="sm" autoclose class="w-full">
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-500">
			{m.confirmEndStage()}
		</h3>
		<div class="flex justify-center gap-4">
			<Button
				color="red"
				on:click={() => {
					showEndedConfirmModal = false;
					proceedToNextStage();
				}}
			>
				{m.confirm()}
			</Button>
			<Button color="alternative" on:click={() => (showEndedConfirmModal = false)}
				>{m.cancel()}</Button
			>
		</div>
	</div>
</Modal>
