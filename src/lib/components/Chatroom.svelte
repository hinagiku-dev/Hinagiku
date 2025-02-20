<script lang="ts">
	import { Button, Card, Textarea } from 'flowbite-svelte';
	import { Mic, Send, Square } from 'lucide-svelte'; // Added Square icon import
	import AudioPlayer from './AudioPlayer.svelte';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	import * as m from '$lib/paraglide/messages.js';

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
		isIndividual = false
	}: {
		record?: () => Promise<() => Promise<void>>;
		send?: (text: string) => Promise<void>;
		conversations: Conversation[];
		readonly?: boolean;
		autoscroll?: boolean;
		isIndividual?: boolean;
	} = $props();

	let text = $state('');
	let operating = $state(false);
	let recording = $state(false);
	let stopRecording: (() => Promise<void>) | undefined = $state(undefined);
	let messagesContainer: HTMLDivElement;
	let dots = $state('...');

	function scrollToBottom() {
		if (!messagesContainer || !autoscroll) return;

		requestAnimationFrame(() => {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		});
	}

	$effect(() => {
		if (conversations.length > 0) {
			setTimeout(scrollToBottom, 100);
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
			{#each conversations as conv}
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
							{'小菊(Hinagiku)'}
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
		<div class="border-t bg-white p-4">
			<div class="flex flex-wrap gap-2">
				<div class="flex min-w-[200px] flex-1 flex-col">
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
				<div class="ml-auto flex gap-2">
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
	{/if}
</div>
