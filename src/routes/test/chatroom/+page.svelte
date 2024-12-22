<script lang="ts">
	import Chatroom from '$lib/components/Chatroom.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { MicVAD, utils } from '@ricky0123/vad-web';

	let conversations: {
		name: string;
		content: string;
		self?: boolean;
		audio?: string;
	}[] = [
		{ name: 'System', content: 'Welcome to the chat test!' },
		{
			name: 'You',
			self: true,
			content: 'Hello, this is a test message.',
			audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav'
		},
		{
			name: 'Assistant',
			content: 'I can also play audio messages.'
		}
	];

	async function sendAudioToSTT(audio: Float32Array) {
		const wavBuffer: ArrayBuffer = utils.encodeWAV(audio);
		const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });
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

	async function handleRecord() {
		const vad = await MicVAD.new({
			model: 'v5',
			onSpeechEnd: async (audio: Float32Array) => {
				const result = await sendAudioToSTT(audio);
				if (result) {
					conversations = [
						...conversations,
						{
							name: 'You',
							self: true,
							content: result.transcription,
							audio: result.url
						}
					];
				}
			}
		});
		vad.start();

		return async () => {
			vad.pause();
			vad.destroy();
		};
	}

	async function handleSend(text: string) {
		// Simulate sending delay
		await new Promise((resolve) => setTimeout(resolve, 800));
		conversations = [...conversations, { name: 'You', self: true, content: text }];
		notifications.success('Message sent!');
	}
</script>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-4">
		<h1 class="text-2xl font-bold">Chatroom Component Test</h1>
		<p class="text-gray-600">This is a test page for the Chatroom component.</p>
	</div>

	<div class="h-[600px] rounded-lg border bg-white shadow-sm">
		<Chatroom record={handleRecord} send={handleSend} {conversations} />
	</div>
</div>
