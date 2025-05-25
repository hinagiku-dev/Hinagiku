<script lang="ts">
	import Auth from '$lib/components/Auth.svelte';
	import AuthClass from '$lib/components/AuthClass.svelte';
	import { Card } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
</script>

<Title page="Login" />

<main class="min-h-screen bg-gradient-to-b from-primary-50 to-white">
	<div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">
				{m.welcome({ title: deploymentConfig.siteTitle })}
			</h1>
		</div>

		<Card class="w-full p-6 shadow-lg">
			<div class="flex flex-col items-center space-y-6">
				<p class="text-gray-600">{m.login()}</p>
				<Auth />

				<div class="my-4 flex w-full items-center">
					<div class="h-px flex-grow bg-gray-300"></div>
					<span class="mx-4 text-sm text-gray-500">{m.orAnotherLoginMethod()}</span>
					<div class="h-px flex-grow bg-gray-300"></div>
				</div>

				<AuthClass />

				<a href="/" class="mt-8 text-sm text-gray-500 hover:underline"> {m.back()} </a>
			</div>
		</Card>
	</div>
</main>
