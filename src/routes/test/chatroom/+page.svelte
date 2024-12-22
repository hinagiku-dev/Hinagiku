<script lang="ts">
	import Chatroom from '$lib/components/Chatroom.svelte';
	import { notifications } from '$lib/stores/notifications';

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

	async function handleRecord() {
		// Simulate recording delay
		await new Promise((resolve) => setTimeout(resolve, 1500));
		conversations = [
			...conversations,
			{
				name: 'You',
				self: true,
				content: 'Audio message',
				audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav'
			}
		];
		notifications.success('Audio recorded!');
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
