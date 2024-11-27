<script>
	let messages = [{ sender: 'other', text: 'Hello! How can I assist you today?' }];
	let inputText = '';

	function sendMessage() {
		if (inputText.trim() !== '') {
			messages = [...messages, { sender: 'me', text: inputText }];
			inputText = '';
		}
	}
</script>

<svelte:head>
	<title>Chat | Hinagiku</title>
</svelte:head>

<div class="chat-container">
	<div class="messages">
		{#each messages as message}
			<div class="message {message.sender}">
				<strong>{message.sender === 'me' ? 'You' : 'Support'}:</strong>
				{message.text}
			</div>
		{/each}
	</div>
	<div class="input-area">
		<input
			type="text"
			bind:value={inputText}
			placeholder="Type your message..."
			on:keyup={(e) => e.key === 'Enter' && sendMessage()}
		/>
		<button on:click={sendMessage}>Send</button>
	</div>
</div>

<style>
	.chat-container {
		max-width: 600px;
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
	}
	.message.me {
		text-align: right;
	}
	.message.other {
		text-align: left;
	}
	.input-area {
		display: flex;
		margin-top: 10px;
	}
	.input-area input {
		flex: 1;
		padding: 10px;
	}
	.input-area button {
		padding: 10px;
	}
</style>
