<script lang="ts">
	import { onMount } from 'svelte';
	import { Mic } from 'lucide-svelte';
	const transAPI = 'http://localhost:5173/api/stt';

	let messages = $state([
		{
			sender: 'Support',
			text: 'Hello! How can I assist you today?',
			voice: null as string | null,
			WithVoice: false
		}
	]);
	let inputText = $state('');

	let audioFile = $state<string | null>(null);
	let media: Blob[] = [];
	let mediaRecorder: MediaRecorder;
	let transcription = $state<string | null>(null);
	let url = $state<string | null>(null);

	onMount(async () => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.ondataavailable = (e) => media.push(e.data);
		mediaRecorder.onstop = function () {
			const audio = document.querySelector('audio');
			const blob = new Blob(media, { type: 'audio/ogg; codecs=opus' });
			media = [];
			if (audio) {
				audio.src = window.URL.createObjectURL(blob);
				audioFile = audio.src;
				media = [];
			}
		};
	});

	async function Transcribe() {
		if (!messages[messages.length - 1].WithVoice) return;
		const formData = new FormData();
		formData.append('file', messages[messages.length - 1].voice as string);

		try {
			const response = await fetch(transAPI, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			if (result.status === 'success') {
				transcription = result.transcription;
				url = result.url;
			} else {
				alert(result.message);
			}
		} catch (error) {
			console.error('Error uploading audio:', error);
			alert('Error uploading audio');
		}
	}

	const StartRecording = () => {
		console.log('Recording...');
		mediaRecorder.start();
	};

	const StopRecording = () => {
		console.log('Stopped recording...');
		mediaRecorder.stop();
		sendVoiceMessage();
		Transcribe();
	};

	const sendVoiceMessage = () => {
		if (messages[messages.length - 1].sender === 'me') return;
		console.log('Sending voice message...');
		messages = [...messages, { sender: 'me', text: '', voice: audioFile, WithVoice: true }];
		audioFile = null;
	};

	const sendMessage = () => {
		if (inputText === '') return;
		if (messages[messages.length - 1].sender === 'me') return;
		console.log('Sending message...');
		messages = [...messages, { sender: 'me', text: inputText, voice: null, WithVoice: false }];
		inputText = '';
		//call takala's api here
	};
</script>

<svelte:head>
	<title>Discussion | Hinagiku</title>
</svelte:head>

<main class="mt-20">
	<div class="chat-container">
		<div class="messages">
			{#each messages as message}
				<div class="flex py-2 {message.sender === 'me' ? 'justify-end ' : 'items-start'}">
					{#if message.sender !== 'me'}
						<img src="/DefaultUser.jpg" alt="User Profile" class="h-12 w-12 rounded-full" />
					{/if}
					<div
						class="leading-1.5 flex max-w-2xl flex-col rounded-xl border-gray-500 bg-gray-200 p-4 dark:bg-gray-900"
					>
						<div>
							<h2 class="text-lg font-bold {message.sender === 'me' ? 'text-right' : ' '}">
								{message.sender === 'me' ? 'You' : message.sender}
							</h2>
							<p class="text-base text-gray-900">{message.text}</p>
						</div>

						{#if message.WithVoice}
							<audio controls>
								<source src={audioFile} type="audio/ogg; codecs=opus" />
							</audio>
							{#if transcription}
								<p class="text-sm text-gray-500">{transcription}</p>
								<p class="text-sm text-gray-500">{url}</p>
							{/if}
						{/if}
					</div>
					{#if message.sender === 'me'}
						<img src="/DefaultUser.jpg" alt="User Profile" class="h-12 w-12 rounded-full" />
					{/if}
				</div>
			{/each}
		</div>

		<div class="input-area">
			<button
				disabled={messages[messages.length - 1].sender === 'me'}
				onmousedown={StartRecording}
				onmouseup={StopRecording}
				class="mr-2 rounded-full bg-gray-100 p-2 active:bg-red-700"
			>
				<Mic size={24} />
			</button>
			<input
				class="inline-block"
				type="text"
				bind:value={inputText}
				placeholder="Type your message..."
				onkeyup={(e) => e.key === 'Enter' && sendMessage()}
			/>
			<button
				disabled={messages[messages.length - 1].sender === 'me'}
				onclick={sendMessage}
				class="p-[10px] hover:bg-gray-100 disabled:pointer-events-none">Send</button
			>
			<div class="w-full"></div>
			{#if messages[messages.length - 1].sender === 'me'}
				<div>Please wait for a response...</div>
			{/if}
		</div>
	</div>
</main>

<style>
	.chat-container {
		max-width: 80%;
		margin: 0 auto;
	}
	.messages {
		height: 400px;
		overflow-y: auto;
		border: 1px solid #ccc;
		padding: 10px;
		margin-top: 5px;
		margin-bottom: 3px;
	}
	.input-area {
		margin-top: 10px;
		display: flex;
		flex-wrap: wrap;
	}
	.input-area input {
		flex: 1;
		padding: 10px;
	}
</style>
