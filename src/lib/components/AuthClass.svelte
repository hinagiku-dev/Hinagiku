<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { notifications } from '$lib/stores/notifications';

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

	async function loginWithEmail(email: string, password: string): Promise<string> {
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;
			const idToken = await user.getIdToken(/* forceRefresh */ false);
			return idToken;
		} catch (error) {
			console.error('Login error:', error);
			notifications.error(m.classLoginFailed());
			loading = false;
			throw error;
		}
	}

	async function handleClassLogin() {
		if (!classCode || !account || !password) {
			error = m.classLoginErrorEmpty();
			return;
		}

		loading = true;
		error = '';

		const then = $page.url.searchParams.get('then') || '/dashboard';
		const hasSessionParam = then.includes('session');
		const sessionId = $page.url.searchParams.get('sessionId') || '';

		// Construct email from studentId and classCode and convert to lowercase
		const email = `${account}@${classCode}.student-account.hinagiku.dev`.toLowerCase();
		const idToken = await loginWithEmail(email, password);

		try {
			// Call the API endpoint
			const response = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ idToken })
			});

			const data = await response.json();

			if (response.ok) {
				// Go to session page if sessionId is provided or to "/dashboard"
				if (hasSessionParam && sessionId) {
					await goto(`/session/${sessionId}`);
				} else {
					await goto('/dashboard');
				}
			} else {
				// Display error message
				error = data.message || m.classLoginFailed();
			}
		} catch (err) {
			console.error('Login error:', err);
			notifications.error(m.classLoginError());
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
		{m.classLoginButton()}
	</button>
</div>
