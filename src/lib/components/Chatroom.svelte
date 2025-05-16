<script lang="ts">
	import { Button, Card, Textarea, Tooltip } from 'flowbite-svelte';
	import { Mic, Send, Square } from 'lucide-svelte';
	import AudioPlayer from './AudioPlayer.svelte';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	import * as m from '$lib/paraglide/messages.js';
	import { deploymentConfig } from '$lib/config/deployment';
	import { UI_CLASSES } from '$lib/config/ui';

	interface Conversation {
		name: string;
		content: string;
		self?: boolean;
		audio?: string;
		avatar?: string;
	}

	let {
		record,
		send,
		conversations,
		readonly = false,
		autoscroll = true,
		isIndividual = false,
		vadEnabled = false
	}: {
		record?: () => Promise<() => Promise<void>>;
		send?: (text: string) => Promise<void>;
		conversations: Conversation[];
		readonly?: boolean;
		autoscroll?: boolean;
		isIndividual?: boolean;
		vadEnabled?: boolean;
	} = $props();

	let text = $state('');
	let operating = $state(false);
	let recording = $state(false);
	let stopRecording: (() => Promise<void>) | undefined = $state(undefined);
	let messagesContainer: HTMLDivElement;
	let latestMessageMarker = $state<HTMLDivElement | null>(null);
	let dots = $state('...');

	function scrollToLatestMessage() {
		if (!messagesContainer || !latestMessageMarker || !autoscroll) return;

		requestAnimationFrame(() => {
			// Scroll to the marker instead of the bottom
			latestMessageMarker?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	$effect(() => {
		if (conversations.length > 0) {
			setTimeout(scrollToLatestMessage, 100);
		}
	});

	async function handleRecord() {
		if (operating) return;
		if (recording && stopRecording) {
			operating = true;
			await stopRecording();
			stopRecording = undefined;
			recording = false;
			operating = false;
			return;
		}

		operating = true;
		recording = true;
		stopRecording = await record?.();
		operating = false;
	}

	async function handleSend() {
		if (operating || !text.trim()) return;
		operating = true;
		await send?.(text);
		text = '';
		operating = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	function animateDots() {
		const dotsStates = ['', '.', '..', '...'];
		let index = 0;
		return setInterval(() => {
			dots = dotsStates[index];
			index = (index + 1) % dotsStates.length;
		}, 500);
	}

	$effect(() => {
		const interval = animateDots();
		return () => clearInterval(interval);
	});
</script>

<div class="flex h-full min-h-[400px] flex-col">
	<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto scroll-smooth p-4">
		{#if conversations.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="text-gray-500">請重新載入頁面</p>
			</div>
		{:else}
			{#each conversations as conv, index}
				{#if index === conversations.length - 1}
					<div bind:this={latestMessageMarker} class="latest-message-marker"></div>
				{/if}
				<div class="flex flex-col {conv.self ? 'items-end' : 'items-start'} gap-1">
					{#if !conv.self}
						<div class="flex items-center gap-2 {conv.self ? 'flex-row-reverse' : ''}">
							{#if conv.avatar}
								<img src={conv.avatar} alt={conv.name} class="h-8 w-8 rounded-full" />
							{:else}
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
									{conv.name[0]}
								</div>
							{/if}
							<div class="text-sm font-semibold text-gray-700">{conv.name}</div>
						</div>
					{/if}
					<Card class="w-fit max-w-[80%] {conv.self ? 'bg-primary-50' : ''}">
						<div class="-my-2">
							<p class="prose prose-hina text-gray-600">
								{#await renderMarkdown(conv.content)}
									Loading ...
								{:then content}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html content}
								{/await}
							</p>
							{#if conv.audio}
								<AudioPlayer src={conv.audio} />
							{/if}
						</div>
					</Card>
				</div>
			{/each}
			{#if conversations.length > 0 && isIndividual}
				{#if conversations[conversations.length - 1].self}
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
							{'小'}
						</div>
						<div class="text-sm font-semibold text-gray-700">
							{'小菊' + deploymentConfig.siteTitle}
						</div>
					</div>
					<Card class="w-fit max-w-[80%]">
						<div class="-my-2">
							<p class="prose prose-hina text-gray-600">
								{#await renderMarkdown(`${m.thinking()}${dots}`)}
									Loading ...
								{:then content}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html content}
								{/await}
							</p>
						</div>
					</Card>
				{/if}
			{/if}
		{/if}
	</div>

	{#if !readonly}
		<div class="border-t p-4 {UI_CLASSES.PANEL_BG}">
			<div class="flex flex-wrap gap-2">
				<div class="flex min-w-[200px] flex-1 flex-col {UI_CLASSES.PANEL_BG}">
					<Textarea
						class="max-h-32 min-h-14 flex-1"
						placeholder={m.placeholder()}
						rows={1}
						bind:value={text}
						disabled={operating}
						on:keydown={handleKeydown}
						maxlength={500}
					/>
					<div class="text-right text-sm text-gray-500">
						{text.length} / 500
					</div>
				</div>
				<div class="ml-auto flex flex-col">
					<div class="flex max-h-32 min-h-14 flex-1 gap-2">
						<Button
							color={recording && !operating ? 'red' : 'primary'}
							class="gap-2"
							disabled={operating}
							on:click={handleRecord}
						>
							{#if recording && !operating}
								<Square class="animate-pulse" />
							{:else}
								<Mic />
							{/if}
							{recording ? (operating ? m.waiting() : m.stop()) : m.record()}
						</Button>
						{#if recording}
							<Tooltip trigger="focus" open={true}>
								{#if vadEnabled}
									{m.stopRecordingReminderWithVAD()}
								{:else}
									{m.stopRecordingReminderWithoutVAD()}
								{/if}
							</Tooltip>
						{/if}
						<Button
							color="primary"
							class="gap-2"
							disabled={operating || !text.trim()}
							on:click={handleSend}
						>
							<Send class={operating ? 'animate-pulse' : ''} />
							{m.send()}
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.latest-message-marker {
		position: relative;
		height: 0;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
	.prose {
		max-width: fit-content;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}
</style>
