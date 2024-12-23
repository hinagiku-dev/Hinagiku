<script lang="ts">
	import { notifications } from '$lib/stores/notifications';
	import { Button, CheckboxButton } from 'flowbite-svelte';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import coreURL from '@hinagiku/ffmpeg-core?url';
	import wasmURL from '@hinagiku/ffmpeg-core/wasm?url';

	async function sendAudioToSTT(file: File) {
		const formData = new FormData();
		formData.append('file', file);
		console.log('Sending audio to STT...', formData);

		try {
			const response = await fetch('/api/stt', {
				method: 'POST',
				body: formData
			});
			console.log('STT response:', response);
			if (!response.ok) {
				throw new Error('Failed to transcribe audio');
			}
			const data = await response.json();
			if (data.status === 'success') {
				return { transcription: data.transcription, url: data.url };
			}
			throw new Error(data.message || 'Failed to transcribe audio');
		} catch (error) {
			notifications.error('Failed to transcribe audio');
			console.error(error);
			return null;
		}
	}

	let files: FileList | undefined;
	let mp3 = true;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let sttResult: any;
	async function testSTT() {
		if (!files || files.length === 0) {
			notifications.error('Please select an audio file');
			return;
		}

		const ffmpeg = new FFmpeg();
		ffmpeg.on('log', ({ message }) => {
			console.log(message);
		});
		await ffmpeg.load({
			coreURL: coreURL,
			wasmURL: wasmURL
		});

		let startTime = Date.now();

		let file = files[0];

		if (mp3) {
			const arrayBuffer = await files[0].arrayBuffer();

			const convertStart = Date.now();
			ffmpeg.writeFile('audio.wav', new Uint8Array(arrayBuffer));
			await ffmpeg.exec(['-i', 'audio.wav', 'audio.mp3']);
			const data = await ffmpeg.readFile('audio.mp3');
			file = new File([data], 'audio.mp3', { type: 'audio/mpeg' });
			console.log('Converted audio in ' + (Date.now() - convertStart) + 'ms');
		}

		const out = await sendAudioToSTT(file);
		sttResult = {
			transcription: out?.transcription,
			url: out?.url,
			time: Date.now() - startTime
		};
		notifications.success('STT completed in ' + (Date.now() - startTime) + 'ms');
	}
</script>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-4">
		<h1 class="text-2xl font-bold">Speech-to-Text Test</h1>
		<p class="text-gray-600">This is a test page for the Chatroom component.</p>
	</div>

	<div class="mt-4">
		<input type="file" accept="audio/*" bind:files />
		<CheckboxButton bind:checked={mp3}>Convert to MP3</CheckboxButton>
		<Button on:click={testSTT}>Test STT</Button>

		{#if files && files.length > 0}
			<p>Selected file: {files[0].name}</p>
			<pre>{JSON.stringify(sttResult, null, 2)}</pre>
		{/if}
	</div>
</div>
