<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Card } from 'flowbite-svelte';
	import Title from '$lib/components/Title.svelte';
</script>

<Title page={m.managementDashboard()} />

<main class="mx-auto max-w-4xl px-4 py-16">
	<div class="mb-8">
		<h1 class="text-center text-3xl font-bold text-gray-900">{m.managementDashboard()}</h1>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<a href="/manage/credential" class="block">
			<Card class="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
				<h2 class="text-xl font-semibold text-gray-800">{m.credentialManagement()}</h2>
				<p class="mt-2 text-gray-600">{m.credentialManagementDesc()}</p>
			</Card>
		</a>

		<a href="/manage/test" class="block">
			<Card class="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
				<h2 class="text-xl font-semibold text-gray-800">
					This is the test. Input your another page.
				</h2>
				<p class="mt-2 text-gray-600">Description for this test page</p>
			</Card>
		</a>
	</div>
</main>
