<script lang="ts">
	import { Button, Card, Input, Label } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let currentPassword = '';
	let newPassword = '';
	let confirmNewPassword = '';
	let isLoading = false;

	async function handleChangePassword() {
		if (newPassword !== confirmNewPassword) {
			notifications.error(m.passwordsDoNotMatch());
			return;
		}
		if (newPassword.length < 6) {
			notifications.error(m.passwordTooShort());
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/auth/update-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					currentPassword,
					newPassword
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				notifications.success(m.passwordChangedSuccessfully());
				currentPassword = '';
				newPassword = '';
				confirmNewPassword = '';
				await goto('/login');
			} else {
				// Handle specific error messages from the API
				if (response.status === 400 && result.error) {
					if (result.error.includes('當前密碼不正確') || result.error.includes('原密碼不正確')) {
						notifications.error(m.currentPasswordIncorrect());
					} else if (result.error.includes('密碼強度不足')) {
						notifications.error(m.passwordTooShort());
					} else {
						notifications.error(result.error);
					}
				} else {
					notifications.error(m.changePasswordError());
				}
			}
		} catch (error) {
			console.error('Error changing password:', error);
			notifications.error(m.changePasswordError());
		}

		isLoading = false;
	}
</script>

<Title page={m.changePassword()} />

<div class="container mx-auto max-w-lg p-4">
	<Card class="p-6">
		{#if $user}
			<h1 class="mb-6 text-2xl font-semibold">{m.changePassword()}</h1>

			<form on:submit|preventDefault={handleChangePassword} class="space-y-6">
				<div>
					<Label for="currentPassword" class="mb-2 block">{m.currentPassword()}</Label>
					<Input type="password" id="currentPassword" bind:value={currentPassword} required />
				</div>
				<div>
					<Label for="newPassword" class="mb-2 block">{m.newPassword()}</Label>
					<Input type="password" id="newPassword" bind:value={newPassword} required minlength={6} />
				</div>
				<div>
					<Label for="confirmNewPassword" class="mb-2 block">{m.confirmNewPassword()}</Label>
					<Input
						type="password"
						id="confirmNewPassword"
						bind:value={confirmNewPassword}
						required
						minlength={6}
					/>
				</div>
				<Button type="submit" disabled={isLoading} class="w-full">
					{#if isLoading}
						<svg
							class="mr-3 h-5 w-5 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{/if}
					{m.changePasswordButton()}
				</Button>
			</form>
		{:else}
			<p>{m.pleaseLoginToChangePassword()}</p>
			<Button href="/login" class="mt-6 w-full">{m.login()}</Button>
		{/if}
	</Card>
</div>
