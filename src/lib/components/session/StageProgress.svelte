<script lang="ts">
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';
	import { Button } from 'flowbite-svelte';
	import type { Session } from '$lib/schema/session';

	const stages = [
		{ id: 'preparing', name: 'Preparing Stage', color: 'bg-yellow-500' },
		{ id: 'individual', name: 'Individual Stage', color: 'bg-blue-500' },
		{ id: 'before-group', name: 'Before Group Stage', color: 'bg-purple-500' },
		{ id: 'group', name: 'Group Stage', color: 'bg-green-500' },
		{ id: 'ended', name: 'Ended Stage', color: 'bg-gray-500' }
	] as const;

	export let session: Session | undefined;
	export let onStageChange: (stage: (typeof stages)[number]['id']) => void;
	export let showAction = true;

	$: currentStageIndex = stages.findIndex((s) => s.id === session?.status);
	$: canGoPrevious = currentStageIndex > 0;
	$: canGoNext = currentStageIndex < stages.length - 1;

	function handlePrevious() {
		console.log('handlePrevious', canGoPrevious);
		if (canGoPrevious) {
			console.log('handlePrevious', stages[currentStageIndex - 1].id);
			onStageChange(stages[currentStageIndex - 1].id);
		}
	}

	function handleNext() {
		if (canGoNext) {
			onStageChange(stages[currentStageIndex + 1].id);
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
		<Button color="light" on:click={handlePrevious} disabled={!canGoPrevious}>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<Button color="light" on:click={handleNext} disabled={!canGoNext}>
			<ArrowRight class="h-4 w-4" />
		</Button>
	</div>
{/if}
