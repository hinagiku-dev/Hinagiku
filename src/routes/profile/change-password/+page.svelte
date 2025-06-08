<script lang="ts">
	import { Button, Card, Input, Label } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import {
		getAuth,
		EmailAuthProvider,
		reauthenticateWithCredential,
		updatePassword
	} from 'firebase/auth';

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
		const auth = getAuth();
		const currentUser = auth.currentUser;

		if (currentUser && currentUser.email) {
			const providerData = currentUser.providerData.find(
				(p) => p.providerId === EmailAuthProvider.PROVIDER_ID
			);

			if (providerData) {
				// User signed in with email/password
				const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
				try {
					await reauthenticateWithCredential(currentUser, credential);
					await updatePassword(currentUser, newPassword);
					notifications.success(m.passwordChangedSuccessfully());
					currentPassword = '';
					newPassword = '';
					confirmNewPassword = '';
					await goto('/');
				} catch (error) {
					console.error('Error changing password:', error);
					const err = error as { code?: string };
					if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
						notifications.error(m.currentPasswordIncorrect());
					} else if (err.code === 'auth/too-many-requests') {
						notifications.error(m.tooManyRequestsError());
					} else {
						notifications.error(m.changePasswordError());
					}
				}
			} else {
				notifications.info(m.cannotChangePasswordForProvider());
			}
		} else {
			notifications.error(m.userNotLoggedInError());
		}
		isLoading = false;
	}
</script>

<Title page={m.changePassword()} />

<div class="container mx-auto max-w-lg p-4">
	<Card class="p-6">
		{#if !$user || ($user.providerData && $user.providerData.find((p) => p.providerId === EmailAuthProvider.PROVIDER_ID))}
			<h1 class="mb-6 text-2xl font-semibold">{m.changePassword()}</h1>
		{/if}

		{#if $user && $user.providerData.find((p) => p.providerId === EmailAuthProvider.PROVIDER_ID)}
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
		{:else if $user}
			<p>{m.cannotChangePasswordForProviderMessage()}</p>
			<p class="mt-2">
				{m.loggedInWithProvider({
					provider: $user.providerData[0]?.providerId.replace('.com', '') || 'Unknown'
				})}
			</p>
			<Button href="/profile" class="mt-6 w-full">{m.backToProfile()}</Button>
		{:else}
			<p>{m.pleaseLoginToChangePassword()}</p>
			<Button href="/login" class="mt-6 w-full">{m.login()}</Button>
		{/if}
	</Card>
</div>
