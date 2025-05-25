<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let classCode = '';
	let account = '';
	let password = '';
	let error = '';
	let loading = false;

	// Read URL parameters when component mounts
	onMount(() => {
		// Get classCode from URL if present
		const urlClassCode = $page.url.searchParams.get('classCode');
		if (urlClassCode) {
			classCode = urlClassCode;
		}
	});

	async function handleClassLogin() {
		if (!classCode || !account || !password) {
			error = m.classLoginErrorEmpty();
			return;
		}

		loading = true;
		error = '';

		try {
			// Call the API endpoint
			const response = await fetch('/api/auth/class-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ classCode, account, password })
			});

			const data = await response.json();

			if (response.ok) {
				// Redirect after successful login
				goto('/dashboard');
			} else {
				// Display error message
				error = data.message || m.classLoginFailed();
			}
		} catch (err) {
			console.error('Login error:', err);
			error = m.classLoginError();
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full">
	<p class="mb-4 text-center text-gray-600">{m.classLogin()}</p>

	{#if error}
		<div class="mb-4 rounded-md bg-red-100 p-2 text-sm text-red-700">
			{error}
		</div>
	{/if}

	<div class="mb-4">
		<input
			type="text"
			placeholder={m.classLoginInputCode()}
			class="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
			bind:value={classCode}
		/>
	</div>
	<div class="mb-4">
		<input
			type="text"
			placeholder={m.classLoginInputAccount()}
			class="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
			bind:value={account}
		/>
	</div>
	<div class="mb-4">
		<input
			type="password"
			placeholder={m.classLoginInputPassword()}
			class="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
			bind:value={password}
		/>
	</div>
	<button
		on:click={handleClassLogin}
		class="w-full rounded-md bg-primary-600 px-4 py-2 font-medium text-white transition duration-300 hover:bg-primary-700"
		disabled={loading}
	>
		{#if loading}
			<span class="mr-2 inline-block animate-spin">↻</span>
		{/if}
		{m.classLoginButton()}
	</button>
</div>
