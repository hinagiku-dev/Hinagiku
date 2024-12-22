<script lang="ts">
	import { Play, Pause } from 'lucide-svelte';
	import { Button } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	export let src: string;

	let audio: HTMLAudioElement;
	let playing = false;
	let currentTime = 0;
	let duration = 0;

	onMount(() => {
		audio = new Audio(src);
		audio.addEventListener('timeupdate', () => {
			currentTime = audio.currentTime;
		});
		audio.addEventListener('loadedmetadata', () => {
			duration = audio.duration;
		});
		audio.addEventListener('ended', () => {
			playing = false;
		});

		return () => {
			audio.pause();
			audio.remove();
		};
	});

	function togglePlay() {
		if (playing) {
			audio.pause();
		} else {
			audio.play();
		}
		playing = !playing;
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="flex items-center gap-2">
	<Button size="xs" class="h-8 w-8 p-0" on:click={togglePlay}>
		{#if playing}
			<Pause size={16} />
		{:else}
			<Play size={16} />
		{/if}
	</Button>

	<div class="flex-1 rounded bg-gray-200">
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			class="h-1 rounded bg-primary-600 transition-all duration-100"
			style="width: {(currentTime / duration) * 100}%"
		/>
	</div>

	<div class="min-w-[70px] text-sm text-gray-500">
		{formatTime(currentTime)} / {formatTime(duration)}
	</div>
</div>
