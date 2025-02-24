<script lang="ts">
	import Auth from '$lib/components/Auth.svelte';
	import { Card } from 'flowbite-svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

	const translations = {
		en: {
			welcome: 'Welcome to Hinagiku!',
			login: 'Sign in with your Google account to get started',
			button: 'Login',
			back: '← Back to home'
		},
		zh: {
			welcome: '歡迎來到Hinagiku!',
			login: '使用您的Google帳戶登入',
			button: 'login',
			back: '← 返回首頁'
		}
	};
</script>

<main class="min-h-screen bg-gradient-to-b from-primary-50 to-white">
	<div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">{translations[$language].welcome}</h1>
			<p class="text-gray-600">{translations[$language].login}</p>
		</div>

		<Card class="w-full p-6 shadow-lg">
			<Auth />
		</Card>

		<p class="mt-8 text-center text-sm text-gray-600">
			<a href="/" class="text-primary-600 hover:underline">{translations[$language].back}</a>
		</p>
	</div>
</main>
