<script lang="ts">
	import { enhance } from '$app/forms';
	import { profile } from '$lib/stores/profile';
	import { Button, Label, Input, Textarea, Card, Alert } from 'flowbite-svelte';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

	let { form, data } = $props();
	let loading = $state(false);

	const translations = {
		en: {
			profileSettings: 'Profile Settings',
			updateInfo: 'Update your personal information and preferences',
			successMessage: 'Profile updated successfully!',
			errorMessage: 'Cannot update profile. Please try again later.',
			displayName: 'Display Name',
			title: 'Title',
			titlePlaceholder: 'e.g. Professor, Student, Teaching Assistant',
			bio: 'Bio',
			bioPlaceholder: 'Tell us about yourself',
			bioHelp: 'Write a short bio to help others know more about you',
			cancel: 'Cancel',
			saveChanges: 'Save Changes',
			saving: 'Saving...'
		},
		zh: {
			profileSettings: '個人資料設置',
			updateInfo: '更新您的個人資料和偏好',
			successMessage: '個人資料更新成功！',
			errorMessage: '無法更新個人資料。請稍後再試。',
			displayName: '顯示名稱',
			title: '職稱',
			titlePlaceholder: '例如：教授、學生、助教',
			bio: '簡介',
			bioPlaceholder: '介紹一下你自己',
			bioHelp: '寫一個簡短的簡介，幫助其他人更好地了解你',
			cancel: '取消',
			saveChanges: '保存更改',
			saving: '保存中...'
		}
	};
</script>

<svelte:head>
	<title>{translations[$language].profileSettings} | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">{translations[$language].profileSettings}</h1>
		<p class="mt-2 text-gray-600">{translations[$language].updateInfo}</p>
	</div>

	{#if form}
		{#if form.success}
			<Alert color="green" class="mb-6">
				<svelte:fragment slot="icon">
					<CheckCircle class="h-4 w-4" />
				</svelte:fragment>
				{translations[$language].successMessage}
			</Alert>
		{:else}
			<Alert color="red" class="mb-6">
				<svelte:fragment slot="icon">
					<XCircle class="h-4 w-4" />
				</svelte:fragment>
				{translations[$language].errorMessage}
			</Alert>
		{/if}
	{/if}

	{#key $profile}
		<Card size="none" class="p-6">
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="space-y-6"
			>
				<div>
					<Label for="displayName" class="mb-2">{translations[$language].displayName}</Label>
					<Input
						type="text"
						id="displayName"
						name="displayName"
						value={$profile?.displayName || data.user.name}
						required
					/>
				</div>

				<div>
					<Label for="title" class="mb-2">{translations[$language].title}</Label>
					<Input
						type="text"
						id="title"
						name="title"
						value={$profile?.title ?? ''}
						placeholder={translations[$language].titlePlaceholder}
					/>
				</div>

				<div>
					<Label for="bio" class="mb-2">{translations[$language].bio}</Label>
					<Textarea
						id="bio"
						name="bio"
						value={$profile?.bio ?? ''}
						rows={4}
						placeholder={translations[$language].bioPlaceholder}
					/>
					<p class="mt-2 text-sm text-gray-600">
						{translations[$language].bioHelp}
					</p>
				</div>

				<div class="flex justify-end gap-4">
					<Button href="/dashboard" color="light">{translations[$language].cancel}</Button>
					<Button type="submit" disabled={loading}>
						{loading ? translations[$language].saving : translations[$language].saveChanges}
					</Button>
				</div>
			</form>
		</Card>
	{/key}
</main>
