<script lang="ts">
	import { Button, Card, Textarea } from 'flowbite-svelte';
	import { Mic, Send } from 'lucide-svelte';
	import AudioPlayer from './AudioPlayer.svelte';

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
		autoscroll = true
	}: {
		record?: () => Promise<void>;
		send?: (text: string) => Promise<void>;
		conversations: Conversation[];
		readonly?: boolean;
		autoscroll?: boolean;
	} = $props();

	let text = $state('');
	let operating = $state(false);
	let messagesContainer: HTMLDivElement;

	function scrollToBottom() {
		if (!messagesContainer || !autoscroll) return;
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

	$effect(() => {
		if (conversations.length > 0) {
			scrollToBottom();
		}
	});

	async function handleRecord() {
		if (operating) return;
		operating = true;
		await record?.();
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
</script>

<div class="flex h-full flex-col">
	<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
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
						<p class="text-gray-600">{conv.content}</p>
						{#if conv.audio}
							<AudioPlayer src={conv.audio} />
						{/if}
					</div>
				</Card>
			</div>
		{/each}
	</div>

	{#if !readonly}
		<div class="border-t bg-white p-4">
			<div class="flex gap-2">
				<Textarea
					class="max-h-32 min-h-10 flex-1"
					placeholder="Type your message..."
					rows={1}
					bind:value={text}
					disabled={operating}
					on:keydown={handleKeydown}
				/>
				<Button color="primary" class="gap-2" disabled={operating} on:click={handleRecord}>
					<Mic class={operating ? 'animate-pulse' : ''} />
					Record
				</Button>
				<Button
					color="primary"
					class="gap-2"
					disabled={operating || !text.trim()}
					on:click={handleSend}
				>
					<Send class={operating ? 'animate-pulse' : ''} />
					Send
				</Button>
			</div>
		</div>
	{/if}
</div>
