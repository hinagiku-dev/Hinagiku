<script lang="ts">
	import { Button, Input, Tooltip } from 'flowbite-svelte';
	import { Plus, X } from 'lucide-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';

	let { templateId, labels } = $props<{
		templateId: string;
		labels: string[];
	}>();

	let showInput = $state(false);
	let newLabel = $state('');
	let inputRef = $state<HTMLDivElement | null>(null);
	const MAX_LABEL_LENGTH = 10;

	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showInput && inputRef && !inputRef.contains(event.target as Node)) {
				showInput = false;
				newLabel = '';
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	async function addLabel() {
		if (!newLabel.trim()) return;

		if (newLabel.length > MAX_LABEL_LENGTH) {
			notifications.error(
				m.characterCount({
					current: newLabel.length.toString(),
					limit: MAX_LABEL_LENGTH.toString()
				})
			);
			return;
		}

		const updatedLabels = [...labels, newLabel.trim()];
		try {
			const response = await fetch(`/api/template/${templateId}/label`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ labels: updatedLabels })
			});

			if (!response.ok) throw new Error('Failed to update labels');

			newLabel = '';
			showInput = false;
			notifications.success(m.labelAdded());
		} catch {
			notifications.error(m.labelAddFailed());
		}
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.value.length > MAX_LABEL_LENGTH) {
			input.value = input.value.slice(0, MAX_LABEL_LENGTH);
			notifications.warning(
				m.characterCount({
					current: input.value.length.toString(),
					limit: MAX_LABEL_LENGTH.toString()
				})
			);
		}
		newLabel = input.value;
	}

	async function removeLabel(label: string) {
		const updatedLabels = labels.filter((l: string) => l !== label);
		try {
			const response = await fetch(`/api/template/${templateId}/label`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ labels: updatedLabels })
			});

			if (!response.ok) throw new Error('Failed to update labels');

			notifications.success(m.labelRemoved());
		} catch {
			notifications.error(m.labelRemoveFailed());
		}
	}
</script>

<div class="flex items-center gap-2">
	{#each labels as label}
		<div class="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
			<span class="text-sm">{label}</span>
			<button
				type="button"
				class="text-gray-500 hover:text-gray-700"
				onclick={(e) => {
					e.preventDefault();
					removeLabel(label);
				}}
				<X size={14} />
			</button>
		</div>
	{/each}
	{#if showInput}
		<div class="flex w-40 items-center gap-1" bind:this={inputRef}>
			<Input
				value={newLabel}
				on:input={handleInput}
				size="sm"
				class="h-8"
				placeholder={m.addLabel()}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						addLabel();
					}
				}}
			/>
		</div>
	{/if}
	<Button
		size="xs"
		color="alternative"
		class="h-8 w-8 rounded-full p-0"
		on:click={(e) => {
			e.stopPropagation();
			if (!showInput) {
				showInput = true;
				newLabel = '';
			} else {
				addLabel();
			}
		}}
	>
		<Plus class="h-4 w-4" />
	</Button>
	<Tooltip placement="right">{m.addLabel()}</Tooltip>
</div>
