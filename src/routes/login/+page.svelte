<script lang="ts">
	import Auth from '$lib/components/Auth.svelte';
	import { Card } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';
</script>

<Title page="Login" />

<main class="min-h-screen bg-gradient-to-b from-primary-50 to-white">
	<div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">{m.welcome()}</h1>
			<p class="text-gray-600">{m.login()}</p>
		</div>

		<Card class="w-full p-6 shadow-lg">
			<div class="flex flex-col items-center space-y-6">
				<p class="text-gray-600">{m.Llogin()}</p>
				<Auth />
				<a href="/" class="mt-8 text-sm text-gray-500 hover:underline"> {m.back()} </a>
			</div>
		</Card>
	</div>
</main>
