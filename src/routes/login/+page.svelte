<script lang="ts">
	import Auth from '$lib/components/Auth.svelte';
	import { Card } from 'flowbite-svelte';
</script>

<main class="min-h-screen bg-gradient-to-b from-primary-50 to-white">
	<div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">Welcome to Hinagiku</h1>
			<p class="text-gray-600">Sign in with your Google account to get started</p>
		</div>

		<Card class="w-full p-6 shadow-lg">
			<Auth />
		</Card>

		<p class="mt-8 text-center text-sm text-gray-600">
			<a href="/" class="text-primary-600 hover:underline">← Back to home</a>
		</p>
	</div>
</main>
