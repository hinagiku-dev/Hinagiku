<script>
	let messages = [{ sender: 'Support', text: 'Hello! How can I assist you today?' }];
	let inputText = '';
	//import { User } from 'lucide-svelte'

	function sendMessage() {
		if (messages[messages.length - 1].sender === 'me') return;
		if (inputText.trim() !== '') {
			messages = [...messages, { sender: 'me', text: inputText }];
			inputText = '';
		}
	}
</script>

<main class="mt-20">
	<div class="chat-container">
		<div class="messages">
			{#each messages as message}
				<div class="message" class:me={message.sender === 'me'}>
					<!--<User class="inline-block"/>-->
					{#if message.sender !== 'me'}
						<img src={message.avatar} alt="Avatar" class="avatar left" />
					{/if}
					<p class="font-bold">{message.sender === 'me' ? 'You' : message.sender}:</p>
					{message.text}
					{#if message.sender === 'me'}
						<img src={message.avatar} alt="Avatar" class="avatar right" />
					{/if}
				</div>
			{/each}
		</div>
		<div class="input-area">
			<input
				class="inline-block"
				type="text"
				bind:value={inputText}
				placeholder="Type your message..."
				on:keyup={(e) => e.key === 'Enter' && sendMessage()}
			/>
			<button disabled={messages[messages.length - 1].sender === 'me'} on:click={sendMessage}
				>Send</button
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
	}
	.message {
		margin: 10px 0;
		text-align: left;
	}
	.message.me {
		text-align: right;
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
	.input-area button {
		padding: 10px;
	}
	.input-area button:hover {
		background-color: #f0f0f0;
	}
	.input-area button:active {
		background-color: #e0e0e0;
	}
	.input-area button:disabled {
		pointer-events: none;
	}
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		margin: 0 10px;
	}
	.avatar.left {
		order: -1;
	}
	.avatar.right {
		order: 1;
	}
</style>
